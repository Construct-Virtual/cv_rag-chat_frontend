"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiPatch, apiPut, apiDelete } from "../utils/api";

// Import extracted components
import { Markdown } from "@/components/Markdown";
import { SourceCitation } from "@/components/SourceCitation";
import { Modal } from "@/components/Modal";
import { ConversationListSkeleton } from "@/components/Skeleton";
import { Header } from "@/components/Header";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toast, ToastContainer } from "@/components/Toast";
import { ChatEmptyState, WelcomeState } from "@/components/EmptyState";
import { TypingIndicator } from "@/components/TypingIndicator";
import { Button } from "@/components/Button";

// Import hooks
import { useToast } from "@/hooks/useToast";

// Import utilities
import { formatRelativeTime, groupByTimePeriod } from "@/lib/utils";

// Import types
import type { Conversation, Message, Source } from "@/types";

// Character limit for messages
const MAX_MESSAGE_LENGTH = 4000;
const WARNING_THRESHOLD = 3800;

// Conversation pagination
const CONVERSATIONS_PER_PAGE = 10;

// Local user type that extends the shared one with optional status field for optimistic updates
interface LocalMessage extends Message {
  status?: "sending" | "sent" | "error";
}

interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: string;
}

export default function ChatPage() {
  const router = useRouter();

  // Authentication state
  const [user, setUser] = useState<User | null>(null);

  // Conversation state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<LocalMessage[]>([]);

  // UI state
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);

  // Message input state
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingSources, setStreamingSources] = useState<Source[]>([]);

  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");

  // Conversation hover/action state
  const [hoveredConvId, setHoveredConvId] = useState<string | null>(null);
  const [deleteConfirmConvId, setDeleteConfirmConvId] = useState<string | null>(null);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);

  // Search and pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleConversationCount, setVisibleConversationCount] = useState(CONVERSATIONS_PER_PAGE);

  // Share modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  // Message actions state
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [isDeletingMessage, setIsDeletingMessage] = useState(false);

  // Settings dropdown state
  const [isSettingsDropdownOpen, setIsSettingsDropdownOpen] = useState(false);

  // Toast notifications using the useToast hook
  const { toasts, showToast, dismissToast } = useToast();

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Authentication check
  useEffect(() => {
    if (typeof window !== "undefined") {
      const accessToken = sessionStorage.getItem("access_token");
      const userData = sessionStorage.getItem("user");

      if (!accessToken || !userData) {
        router.push("/login?redirect=/chat");
        return;
      }

      setUser(JSON.parse(userData));
      loadConversations();
    }
  }, [router]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversation) {
      loadMessages(currentConversation.id);
    } else {
      setMessages([]);
    }
  }, [currentConversation]);

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target as Node)) {
        setIsSettingsDropdownOpen(false);
      }
    };

    if (isSettingsDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSettingsDropdownOpen]);

  // API functions
  const loadConversations = async () => {
    setIsLoadingConversations(true);
    try {
      const response = await apiGet(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/conversations`);
      if (!response.ok) throw new Error("Failed to load conversations");
      const data = await response.json();
      setConversations(data);
    } catch (err) {
      console.error("Failed to load conversations:", err);
      showToast("Failed to load conversations", "error");
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const response = await apiGet(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chat/conversations/${conversationId}/messages`
      );
      if (!response.ok) throw new Error("Failed to load messages");
      const data = await response.json();
      setMessages(data);
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  const createNewConversation = async () => {
    setIsLoading(true);
    try {
      const response = await apiPost(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/conversations`, {});
      if (!response.ok) throw new Error("Failed to create conversation");
      const newConversation = await response.json();
      setConversations([newConversation, ...conversations]);
      setCurrentConversation(newConversation);
      showToast("New conversation created", "success");
    } catch (err) {
      console.error("Failed to create conversation:", err);
      showToast("Failed to create new conversation", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Message sending with SSE streaming
  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!inputMessage.trim() || !currentConversation || isSending) {
      return;
    }

    const messageText = inputMessage.trim();
    setInputMessage("");
    setIsSending(true);
    setIsStreaming(true);
    setStreamingContent("");

    try {
      // Optimistic update
      const tempMessageId = `temp-${Date.now()}`;
      const tempUserMessage: LocalMessage = {
        id: tempMessageId,
        conversation_id: currentConversation.id,
        role: "user",
        content: messageText,
        created_at: new Date().toISOString(),
        status: "sending"
      };
      setMessages([...messages, tempUserMessage]);

      const response = await apiPost(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/query`, {
        conversation_id: currentConversation.id,
        message: messageText
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response body");

      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.substring(6));

              if (data.type === "token") {
                fullContent = data.full_content;
                setStreamingContent(fullContent);
              } else if (data.type === "complete") {
                setStreamingContent("");
                setIsStreaming(false);

                if (data.sources?.length > 0) {
                  setStreamingSources(data.sources);
                }

                await loadMessages(currentConversation.id);
                await loadConversations();
              } else if (data.type === "error") {
                console.error("Streaming error:", data.message);
                setStreamingContent("");
                setIsStreaming(false);
                showToast(`Error: ${data.message}`, "error");
              }
            } catch (err) {
              console.error("Failed to parse SSE data:", err);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id.startsWith("temp-") ? { ...m, status: "error" as const } : m
        )
      );
      showToast("Failed to send message. Please try again.", "error");
      setIsStreaming(false);
      setStreamingContent("");
    } finally {
      setIsSending(false);
    }
  };

  // Title editing functions
  const startEditingTitle = () => {
    if (currentConversation) {
      setEditedTitle(currentConversation.title);
      setIsEditingTitle(true);
      setTimeout(() => titleInputRef.current?.focus(), 0);
    }
  };

  const cancelEditingTitle = () => {
    setIsEditingTitle(false);
    setEditedTitle("");
  };

  const saveTitle = async () => {
    if (!currentConversation || !editedTitle.trim()) {
      cancelEditingTitle();
      return;
    }

    try {
      const response = await apiPatch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chat/conversations/${currentConversation.id}`,
        { title: editedTitle.trim() }
      );

      if (!response.ok) throw new Error("Failed to update title");

      const updatedConv = await response.json();
      setCurrentConversation(updatedConv);
      setConversations(conversations.map(conv =>
        conv.id === updatedConv.id ? updatedConv : conv
      ));
      setIsEditingTitle(false);
      setEditedTitle("");
      showToast("Conversation renamed successfully!", "success");
    } catch (err) {
      console.error("Failed to rename conversation:", err);
      showToast("Failed to rename conversation", "error");
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") saveTitle();
    else if (e.key === "Escape") cancelEditingTitle();
  };

  // Conversation deletion
  const deleteConversation = async (conversationId: string) => {
    setIsDeletingConversation(true);
    try {
      const response = await apiDelete(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chat/conversations/${conversationId}`
      );

      if (!response.ok) throw new Error("Failed to delete conversation");

      setConversations(conversations.filter(conv => conv.id !== conversationId));
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }
      setDeleteConfirmConvId(null);
      showToast("Conversation deleted successfully", "success");
    } catch (err) {
      console.error("Failed to delete conversation:", err);
      showToast("Failed to delete conversation", "error");
    } finally {
      setIsDeletingConversation(false);
    }
  };

  // Message actions
  const handleSuggestedPrompt = (prompt: string) => {
    if (!currentConversation || isSending || isStreaming) return;
    setInputMessage(prompt);
    setTimeout(() => {
      document.querySelector('form')?.requestSubmit();
    }, 0);
  };

  const handleCopyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      showToast("Copied to clipboard", "success");
    } catch (err) {
      console.error("Failed to copy:", err);
      showToast("Failed to copy to clipboard", "error");
    }
  };

  const handleDeleteMessage = async () => {
    if (!deleteMessageId || isDeletingMessage) return;

    setIsDeletingMessage(true);
    try {
      await apiDelete(`/api/chat/messages/${deleteMessageId}`);
      setMessages((prev) => prev.filter((m) => m.id !== deleteMessageId));
      showToast("Message deleted successfully", "success");
      setDeleteMessageId(null);
    } catch (err) {
      console.error("Failed to delete message:", err);
      showToast("Failed to delete message", "error");
    } finally {
      setIsDeletingMessage(false);
    }
  };

  const handleRetryMessage = async (failedMessage: LocalMessage) => {
    if (!currentConversation || isSending || isStreaming) return;

    const messageText = failedMessage.content;
    setMessages((prev) => prev.filter((m) => m.id !== failedMessage.id));

    setIsSending(true);
    setIsStreaming(true);
    setStreamingContent("");

    try {
      const tempMessageId = `temp-${Date.now()}`;
      const tempUserMessage: LocalMessage = {
        id: tempMessageId,
        conversation_id: currentConversation.id,
        role: "user",
        content: messageText,
        created_at: new Date().toISOString(),
        status: "sending"
      };
      setMessages((prev) => [...prev, tempUserMessage]);

      const response = await apiPost(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/query`, {
        conversation_id: currentConversation.id,
        message: messageText
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response body");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.substring(6));

              if (data.type === "token") {
                setStreamingContent(data.full_content);
              } else if (data.type === "complete") {
                setStreamingContent("");
                setIsStreaming(false);
                if (data.sources?.length > 0) setStreamingSources(data.sources);
                await loadMessages(currentConversation.id);
                await loadConversations();
              } else if (data.type === "error") {
                setStreamingContent("");
                setIsStreaming(false);
                showToast(`Error: ${data.message}`, "error");
              }
            } catch (err) {
              console.error("Failed to parse SSE data:", err);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to retry message:", err);
      setMessages((prev) =>
        prev.map((m) => m.id.startsWith("temp-") ? { ...m, status: "error" as const } : m)
      );
      showToast("Failed to send message", "error");
      setIsStreaming(false);
      setStreamingContent("");
    } finally {
      setIsSending(false);
    }
  };

  const handleRegenerateResponse = async (messageId: string) => {
    if (!currentConversation || isSending || isStreaming) return;

    try {
      setMessages(messages.filter(m => m.id !== messageId));
      setIsSending(true);
      setIsStreaming(true);
      setStreamingContent("");
      setStreamingSources([]);

      const response = await apiPost(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chat/messages/${messageId}/regenerate`,
        {}
      );

      if (!response.ok) throw new Error("Failed to regenerate response");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response body");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.substring(6));

              if (data.type === "token") {
                setStreamingContent(data.full_content);
              } else if (data.type === "complete") {
                setStreamingContent("");
                setIsStreaming(false);
                if (data.sources?.length > 0) setStreamingSources(data.sources);
                await loadMessages(currentConversation.id);
                await loadConversations();
              } else if (data.type === "error") {
                setStreamingContent("");
                setIsStreaming(false);
                showToast(`Error: ${data.message}`, "error");
              }
            } catch (err) {
              console.error("Failed to parse SSE data:", err);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to regenerate response:", err);
      setIsStreaming(false);
      showToast("Failed to regenerate response", "error");
      if (currentConversation) await loadMessages(currentConversation.id);
    } finally {
      setIsSending(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await apiPost(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {});
    } catch (err) {
      console.error("Logout error:", err);
    }
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("user");
    router.push("/login");
  };

  // Profile update handler
  const handleProfileUpdate = async (data: { full_name?: string; email?: string }) => {
    try {
      const response = await apiPut(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile`,
        data
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update profile');
      }

      const updatedUser = await response.json();

      // Update user in session storage
      sessionStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      showToast('Profile updated successfully', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to update profile', 'error');
      throw error;
    }
  };

  // Password change handler
  const handlePasswordChange = async (data: { current_password: string; new_password: string }) => {
    try {
      const response = await apiPut(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/password`,
        data
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to change password');
      }

      showToast('Password changed successfully', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to change password', 'error');
      throw error;
    }
  };

  // Share functionality
  const handleShare = async () => {
    if (!currentConversation) return;

    setIsSharing(true);
    try {
      const response = await apiPost(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chat/conversations/${currentConversation.id}/share`,
        {}
      );

      if (!response.ok) throw new Error("Failed to share conversation");

      const data = await response.json();
      const url = `${window.location.origin}/shared/${data.share_token}`;
      setShareUrl(url);
      setIsShareModalOpen(true);
      setCurrentConversation({ ...currentConversation, is_shared: true, share_token: data.share_token });
      await loadConversations();
      showToast("Conversation shared successfully!", "success");
    } catch (err) {
      console.error("Failed to share conversation:", err);
      showToast("Failed to share conversation", "error");
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast("Link copied to clipboard!", "success");
    } catch (err) {
      console.error("Failed to copy link:", err);
      showToast("Failed to copy link", "error");
    }
  };

  const handleDisableSharing = async () => {
    if (!currentConversation) return;

    try {
      const response = await apiDelete(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chat/conversations/${currentConversation.id}/share`
      );

      if (!response.ok) throw new Error("Failed to disable sharing");

      setCurrentConversation({ ...currentConversation, is_shared: false, share_token: undefined });
      await loadConversations();
      setIsShareModalOpen(false);
      setShareUrl("");
      showToast("Sharing disabled successfully!", "success");
    } catch (err) {
      console.error("Failed to disable sharing:", err);
      showToast("Failed to disable sharing", "error");
    }
  };

  // Export conversation
  const handleExportConversation = () => {
    if (!currentConversation) return;

    const conversationData = {
      title: currentConversation.title,
      created_at: currentConversation.created_at,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        created_at: m.created_at
      }))
    };
    const blob = new Blob([JSON.stringify(conversationData, null, 2)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentConversation.title.replace(/[^a-z0-9]/gi, "_")}_export.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Conversation exported!", "success");
    setIsSettingsDropdownOpen(false);
  };

  // Search and pagination
  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedConversations = filteredConversations.slice(0, visibleConversationCount);
  const hasMoreConversations = filteredConversations.length > visibleConversationCount;

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setVisibleConversationCount(CONVERSATIONS_PER_PAGE);
  };

  const loadMoreConversations = () => {
    setVisibleConversationCount((prev) => prev + CONVERSATIONS_PER_PAGE);
  };

  // Touch gesture handlers for mobile sidebar
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!isMobile) return;
    const swipeDistance = touchStartX.current - touchEndX.current;
    if (swipeDistance > 50 && isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  };

  // Group conversations by time period
  const groupedConversations = groupByTimePeriod(paginatedConversations, 'updated_at');

  if (!user) return null;

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col bg-theme-primary text-theme-primary overflow-x-hidden">
        {/* Skip navigation link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-accent-primary focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
        >
          Skip to main content
        </a>

        {/* Header */}
        <Header
          user={user}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onLogout={handleLogout}
          onNewChat={createNewConversation}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onProfileUpdate={handleProfileUpdate}
          onPasswordChange={handlePasswordChange}
        />

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Mobile backdrop overlay */}
          {isMobile && isSidebarOpen && (
            <div
              className="fixed left-0 right-0 bottom-0 bg-black/60 z-40 md:hidden animate-fade-in"
              style={{ top: '64px' }}
              onClick={() => setIsSidebarOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* Sidebar */}
          <nav
            className={`
              ${isMobile
                ? `fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out ${
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                  }`
                : `${isSidebarOpen ? "w-64" : "w-0"} transition-all duration-300 shrink-0 overflow-hidden`
              }
              border-r border-theme bg-theme-secondary
            `}
            style={isMobile ? { top: '64px' } : undefined}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            role="navigation"
            aria-label="Conversation navigation"
            aria-hidden={!isSidebarOpen && isMobile}
          >
            <div className="h-full flex flex-col p-4">
              {/* Sidebar Search Input */}
              <div className="mb-4" role="search">
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-muted"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <circle cx="8" cy="8" r="6" />
                    <path d="M14 14l4 4" />
                  </svg>
                  <input
                    type="search"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full bg-theme-tertiary border border-theme-hover rounded-lg pl-10 pr-10 py-2 min-h-11 text-sm text-theme-primary placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-accent-primary transition-colors"
                    aria-label="Search conversations"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => handleSearchChange("")}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-theme-muted hover:text-theme-primary transition-colors p-2 min-w-11 min-h-11 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                      title="Clear search"
                      aria-label="Clear search"
                      type="button"
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M3 3l8 8M11 3l-8 8" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* New Chat Button */}
              <Button
                onClick={createNewConversation}
                disabled={isLoading}
                isLoading={isLoading}
                className="w-full mb-4 min-h-11"
                aria-label={isLoading ? "Creating new conversation" : "Create new conversation"}
              >
                {isLoading ? "Creating..." : "+ New Chat"}
              </Button>

              {/* Conversations List */}
              <div className="flex-1 overflow-y-auto space-y-2">
                {isLoadingConversations ? (
                  <ConversationListSkeleton count={5} />
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center text-theme-muted text-sm mt-4">
                    {searchQuery ? (
                      <>No conversations match your search.<br />Try a different search term.</>
                    ) : (
                      <>No conversations yet.<br />Click &quot;+ New Chat&quot; to start.</>
                    )}
                  </div>
                ) : (
                  <>
                    {groupedConversations.map((group) => (
                      <div key={group.period} className="mb-4">
                        <div className="text-[10px] font-semibold text-theme-muted uppercase tracking-wider px-3 py-1 mb-1">
                          {group.period}
                        </div>
                        <div className="space-y-1">
                          {group.items.map((conv) => (
                            <div
                              key={conv.id}
                              onMouseEnter={() => setHoveredConvId(conv.id)}
                              onMouseLeave={() => setHoveredConvId(null)}
                              className="relative"
                            >
                              <button
                                onClick={() => {
                                  setCurrentConversation(conv);
                                  if (isMobile) setIsSidebarOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg transition-colors duration-200 min-h-11 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
                                  currentConversation?.id === conv.id
                                    ? "bg-theme-tertiary text-theme-primary"
                                    : "text-theme-secondary hover:bg-theme-tertiary hover:text-theme-primary"
                                }`}
                                aria-current={currentConversation?.id === conv.id ? "page" : undefined}
                                aria-label={`${conv.title}, ${conv.message_count} ${conv.message_count === 1 ? "message" : "messages"}`}
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <div className="text-sm font-medium truncate pr-8">{conv.title}</div>
                                  {conv.last_message_at && (
                                    <div className="text-[10px] text-theme-muted whitespace-nowrap">
                                      {formatRelativeTime(conv.last_message_at)}
                                    </div>
                                  )}
                                </div>
                                {conv.last_message_preview ? (
                                  <div className="text-xs text-theme-muted truncate pr-8">{conv.last_message_preview}</div>
                                ) : (
                                  <div className="text-xs text-theme-muted">
                                    {conv.message_count} {conv.message_count === 1 ? "message" : "messages"}
                                  </div>
                                )}
                              </button>
                              {hoveredConvId === conv.id && (
                                <div className="absolute right-2 top-2 flex gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCurrentConversation(conv);
                                      startEditingTitle();
                                    }}
                                    className="p-1 rounded hover:bg-theme-tertiary transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    title="Rename conversation"
                                    aria-label={`Rename ${conv.title}`}
                                    type="button"
                                  >
                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                      <path d="M11 4L13 6L6 13H4V11L11 4Z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteConfirmConvId(conv.id);
                                    }}
                                    className="p-1 rounded hover:bg-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    title="Delete conversation"
                                    aria-label={`Delete ${conv.title}`}
                                    type="button"
                                  >
                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                      <path d="M3 6h12M8 6V4h2v2M5 6v10h8V6" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {hasMoreConversations && (
                      <button
                        onClick={loadMoreConversations}
                        className="w-full py-2 text-xs text-accent-primary hover:text-blue-400 hover:bg-theme-tertiary rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                        type="button"
                        aria-label={`Load ${filteredConversations.length - paginatedConversations.length} more conversations`}
                      >
                        Load more ({filteredConversations.length - paginatedConversations.length} remaining)
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </nav>

          {/* Chat Area */}
          <main id="main-content" className="flex-1 flex flex-col bg-theme-primary" role="main" aria-label="Chat conversation" tabIndex={-1}>
            {currentConversation ? (
              <>
                {/* Chat Header */}
                <div className="border-b border-theme bg-theme-secondary px-6 py-4">
                  {isEditingTitle ? (
                    <div className="flex items-center gap-2">
                      <input
                        ref={titleInputRef}
                        type="text"
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        onKeyDown={handleTitleKeyDown}
                        onBlur={saveTitle}
                        className="flex-1 text-lg font-semibold bg-theme-tertiary border border-[#3B82F6] rounded px-3 py-1 text-theme-primary focus:outline-none"
                      />
                      <Button size="sm" onClick={saveTitle} aria-label="Save title">Save</Button>
                      <Button size="sm" variant="secondary" onClick={cancelEditingTitle} aria-label="Cancel editing">Cancel</Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 group">
                        <h2 className="text-lg font-semibold">{currentConversation.title}</h2>
                        <button
                          onClick={startEditingTitle}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-theme-tertiary transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                          title="Rename conversation"
                          aria-label="Edit conversation title"
                          type="button"
                        >
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path d="M11 4L13 6L6 13H4V11L11 4Z" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button onClick={handleShare} disabled={isSharing} isLoading={isSharing} aria-label={isSharing ? "Sharing conversation" : "Share conversation"}>
                          {isSharing ? "Sharing..." : "Share"}
                        </Button>
                        {/* Settings Dropdown */}
                        <div className="relative" ref={settingsDropdownRef}>
                          <button
                            onClick={() => setIsSettingsDropdownOpen(!isSettingsDropdownOpen)}
                            className="p-2 rounded-lg hover:bg-theme-tertiary transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                            title="More options"
                            aria-label="Conversation options menu"
                            aria-expanded={isSettingsDropdownOpen}
                            aria-haspopup="menu"
                            type="button"
                          >
                            <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                              <circle cx="10" cy="4" r="1.5" />
                              <circle cx="10" cy="10" r="1.5" />
                              <circle cx="10" cy="16" r="1.5" />
                            </svg>
                          </button>
                          {isSettingsDropdownOpen && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-theme-secondary border border-theme rounded-lg shadow-lg z-50 py-1" role="menu" aria-label="Conversation options">
                              <button
                                onClick={() => { setIsSettingsDropdownOpen(false); startEditingTitle(); }}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-theme-primary hover:bg-theme-tertiary transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                                role="menuitem"
                                type="button"
                              >
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M11 4L13 6L6 13H4V11L11 4Z" /></svg>
                                Rename
                              </button>
                              <button
                                onClick={() => { setIsSettingsDropdownOpen(false); setDeleteConfirmConvId(currentConversation.id); }}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[#EF4444] hover:bg-theme-tertiary transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                                role="menuitem"
                                type="button"
                              >
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 6h12M8 6V4h2v2M5 6v10h8V6" /></svg>
                                Delete
                              </button>
                              <div className="border-t border-theme my-1" role="separator" />
                              <button
                                onClick={handleExportConversation}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-theme-primary hover:bg-theme-tertiary transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                                role="menuitem"
                                type="button"
                              >
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 10v6H4v-6M8 12V2m0 0L5 5m3-3l3 3" /></svg>
                                Export
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-theme-muted mt-1">
                    {currentConversation.message_count} {currentConversation.message_count === 1 ? "message" : "messages"}
                  </p>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6">
                  {messages.length === 0 && !isStreaming ? (
                    <ChatEmptyState onPromptClick={handleSuggestedPrompt} />
                  ) : (
                    <div className="max-w-4xl mx-auto space-y-6">
                      {messages.map((message, index) => {
                        const isLastAssistantMessage = message.role === "assistant" && index === messages.length - 1;

                        return (
                          <div
                            key={message.id}
                            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-message-in`}
                            onMouseEnter={() => setHoveredMessageId(message.id)}
                            onMouseLeave={() => setHoveredMessageId(null)}
                          >
                            <div
                              className={`relative max-w-[80%] rounded-lg px-4 py-3 ${
                                message.role === "user"
                                  ? "bg-accent-primary text-white"
                                  : "bg-theme-secondary text-theme-primary border border-theme"
                              }`}
                            >
                              <div className="text-xs opacity-70 mb-1 flex items-center gap-2">
                                <span>{message.role === "user" ? "You" : "AI Assistant"}</span>
                                {message.status === "sending" && (
                                  <span className="flex items-center gap-1 text-[10px]">
                                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Sending...
                                  </span>
                                )}
                                {message.status === "error" && (
                                  <span className="text-red-400 text-[10px] flex items-center gap-2">
                                    Failed to send
                                    <button onClick={() => handleRetryMessage(message)} className="underline hover:no-underline" title="Retry sending">Retry</button>
                                  </span>
                                )}
                              </div>
                              <div className={`text-sm ${message.status === "error" ? "opacity-60" : ""}`}>
                                {message.role === "user" ? (
                                  <div className="whitespace-pre-wrap">{message.content}</div>
                                ) : (
                                  <Markdown content={message.content} />
                                )}
                              </div>

                              {message.role === "assistant" && message.sources && message.sources.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-theme">
                                  <div className="text-xs font-semibold mb-2 opacity-70">Sources:</div>
                                  <div className="space-y-2">
                                    {message.sources.map((source) => (
                                      <SourceCitation key={source.id} source={source} />
                                    ))}
                                  </div>
                                </div>
                              )}

                              {hoveredMessageId === message.id && (
                                <div className="absolute top-2 right-2 flex gap-1" role="toolbar" aria-label="Message actions">
                                  {isLastAssistantMessage && !isStreaming && (
                                    <button
                                      onClick={() => handleRegenerateResponse(message.id)}
                                      className="p-1.5 rounded hover:bg-theme-tertiary transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      title="Regenerate response"
                                      aria-label="Regenerate response"
                                      type="button"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                      </svg>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleCopyMessage(message.content)}
                                    className="p-1.5 rounded hover:bg-theme-tertiary transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    title="Copy to clipboard"
                                    aria-label="Copy message to clipboard"
                                    type="button"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => setDeleteMessageId(message.id)}
                                    className="p-1.5 rounded hover:bg-red-500/20 hover:text-red-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    title="Delete message"
                                    aria-label="Delete message"
                                    type="button"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              )}

                              {hoveredMessageId === message.id && (
                                <div
                                  className={`absolute text-[10px] text-theme-muted whitespace-nowrap top-1/2 -translate-y-1/2 ${
                                    message.role === "user" ? "-left-20" : "-right-20"
                                  }`}
                                >
                                  {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Streaming message */}
                      {isStreaming && streamingContent && (
                        <div className="flex justify-start" role="status" aria-live="polite" aria-label="AI is responding">
                          <div className="max-w-[80%] rounded-lg px-4 py-3 bg-theme-secondary text-theme-primary border border-theme">
                            <div className="text-xs opacity-70 mb-1">AI Assistant</div>
                            <div className="text-sm whitespace-pre-wrap">{streamingContent}</div>
                            <div className="inline-block w-1 h-4 bg-accent-primary animate-pulse ml-1" aria-hidden="true" />
                            {streamingSources.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-theme">
                                <div className="text-xs font-semibold mb-2 opacity-70">Sources:</div>
                                <div className="space-y-2">
                                  {streamingSources.map((source) => (
                                    <SourceCitation key={source.id} source={source} />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Typing indicator */}
                      {isStreaming && !streamingContent && <TypingIndicator />}

                      {/* Sources after streaming */}
                      {!isStreaming && streamingSources.length > 0 && (
                        <div className="flex justify-start">
                          <div className="max-w-[80%] rounded-lg px-4 py-3 bg-theme-secondary text-theme-primary border border-theme">
                            <div className="text-xs font-semibold mb-2 opacity-70">Sources:</div>
                            <div className="space-y-2">
                              {streamingSources.map((source) => (
                                <SourceCitation key={source.id} source={source} />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="border-t border-theme bg-theme-secondary p-3 md:p-4">
                  <div className="max-w-4xl mx-auto">
                    <form onSubmit={sendMessage} className="flex gap-2" role="form" aria-label="Send message">
                      <label htmlFor="message-input" className="sr-only">Type your message</label>
                      <input
                        id="message-input"
                        type="text"
                        value={inputMessage}
                        onChange={(e) => {
                          if (e.target.value.length <= MAX_MESSAGE_LENGTH) {
                            setInputMessage(e.target.value);
                          }
                        }}
                        placeholder="Type your message..."
                        disabled={isSending}
                        maxLength={MAX_MESSAGE_LENGTH}
                        aria-describedby="char-counter message-helper"
                        aria-invalid={inputMessage.length >= MAX_MESSAGE_LENGTH}
                        className={`flex-1 min-w-0 px-3 md:px-4 py-3 min-h-11 bg-theme-tertiary border rounded-lg text-theme-primary placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:border-transparent disabled:opacity-50 ${
                          inputMessage.length >= MAX_MESSAGE_LENGTH
                            ? "border-[#EF4444] focus:ring-[#EF4444]"
                            : inputMessage.length >= WARNING_THRESHOLD
                            ? "border-[#F59E0B] focus:ring-[#F59E0B]"
                            : "border-theme focus:ring-[#3B82F6]"
                        }`}
                      />
                      <Button
                        type="submit"
                        disabled={isSending || !inputMessage.trim() || inputMessage.length > MAX_MESSAGE_LENGTH}
                        isLoading={isSending}
                        className="min-h-11 min-w-11 shrink-0"
                        aria-label={isSending ? "Sending message" : "Send message"}
                      >
                        {isSending ? "Sending" : "Send"}
                      </Button>
                    </form>
                    <div className="flex justify-between mt-1">
                      <span id="message-helper" className="text-xs text-theme-muted">Press Enter to send</span>
                      <span
                        id="char-counter"
                        className={`text-xs ${
                          inputMessage.length >= MAX_MESSAGE_LENGTH
                            ? "text-[#EF4444]"
                            : inputMessage.length >= WARNING_THRESHOLD
                            ? "text-[#F59E0B]"
                            : "text-theme-muted"
                        }`}
                        aria-live="polite"
                        aria-atomic="true"
                      >
                        {inputMessage.length.toLocaleString()} / {MAX_MESSAGE_LENGTH.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <WelcomeState onNewChat={createNewConversation} isLoading={isLoading} />
            )}
          </main>
        </div>

        {/* Delete Conversation Modal */}
        <Modal
          isOpen={deleteConfirmConvId !== null}
          onClose={() => setDeleteConfirmConvId(null)}
          title="Delete Conversation?"
        >
          <p className="text-theme-secondary text-sm mb-6">
            This will permanently delete this conversation and all its messages. This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setDeleteConfirmConvId(null)}
              disabled={isDeletingConversation}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteConfirmConvId && deleteConversation(deleteConfirmConvId)}
              disabled={isDeletingConversation}
              isLoading={isDeletingConversation}
            >
              {isDeletingConversation ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </Modal>

        {/* Share Modal */}
        <Modal
          isOpen={isShareModalOpen}
          onClose={() => { setIsShareModalOpen(false); setShareUrl(""); }}
          title="Share Conversation"
        >
          <p className="text-theme-secondary text-sm mb-4">
            Anyone with this link can view this conversation (read-only).
          </p>
          <div className="bg-theme-tertiary rounded-lg p-3 mb-4 flex items-center gap-2">
            <label htmlFor="share-url-input" className="sr-only">Share URL</label>
            <input
              id="share-url-input"
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 bg-transparent text-theme-primary text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              aria-label="Shareable link"
            />
            <Button size="sm" onClick={handleCopyShareLink} aria-label="Copy share link to clipboard">
              Copy Link
            </Button>
          </div>
          <div className="flex gap-3 justify-between flex-wrap">
            <Button variant="danger" onClick={handleDisableSharing}>
              Disable Sharing
            </Button>
            <Button variant="secondary" onClick={() => { setIsShareModalOpen(false); setShareUrl(""); }}>
              Close
            </Button>
          </div>
        </Modal>

        {/* Delete Message Modal */}
        <Modal
          isOpen={deleteMessageId !== null}
          onClose={() => setDeleteMessageId(null)}
          title="Delete Message"
          size="sm"
        >
          <p className="text-theme-secondary mb-6">
            Are you sure you want to delete this message? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setDeleteMessageId(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteMessage}
              disabled={isDeletingMessage}
              isLoading={isDeletingMessage}
            >
              {isDeletingMessage ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </Modal>

        {/* Toast Notifications using ToastContainer */}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </ErrorBoundary>
  );
}
