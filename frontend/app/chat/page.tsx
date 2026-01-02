"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiPatch, apiDelete } from "../utils/api";

interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: string;
}

interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [hoveredConvId, setHoveredConvId] = useState<string | null>(null);
  const [deleteConfirmConvId, setDeleteConfirmConvId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if user is authenticated
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
    scrollToBottom();
  }, [messages, streamingContent]);

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversation) {
      loadMessages(currentConversation.id);
    } else {
      setMessages([]);
    }
  }, [currentConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversations = async () => {
    try {
      const response = await apiGet(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/conversations`);

      if (!response.ok) {
        throw new Error("Failed to load conversations");
      }

      const data = await response.json();
      setConversations(data);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const response = await apiGet(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chat/conversations/${conversationId}/messages`
      );

      if (!response.ok) {
        throw new Error("Failed to load messages");
      }

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

      if (!response.ok) {
        throw new Error("Failed to create conversation");
      }

      const newConversation = await response.json();
      setConversations([newConversation, ...conversations]);
      setCurrentConversation(newConversation);
    } catch (err) {
      console.error("Failed to create conversation:", err);
      alert("Failed to create new conversation");
    } finally {
      setIsLoading(false);
    }
  };

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
      // Add user message to UI immediately
      const tempUserMessage: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: currentConversation.id,
        role: "user",
        content: messageText,
        created_at: new Date().toISOString()
      };
      setMessages([...messages, tempUserMessage]);

      // Create SSE connection for streaming response
      const token = sessionStorage.getItem("access_token");
      const eventSource = new EventSource(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chat/query?` +
        new URLSearchParams({
          conversation_id: currentConversation.id,
          message: messageText,
          token: token || ""
        })
      );

      // Since EventSource doesn't support custom headers or POST,
      // we'll use fetch with streaming instead
      eventSource.close();

      const response = await apiPost(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/query`, {
        conversation_id: currentConversation.id,
        message: messageText
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

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
                fullContent = data.full_content;
                setStreamingContent("");
                setIsStreaming(false);

                // Reload messages to get the saved messages with IDs
                await loadMessages(currentConversation.id);
                // Reload conversations to update message count
                await loadConversations();
              } else if (data.type === "error") {
                console.error("Streaming error:", data.message);
                setStreamingContent("");
                setIsStreaming(false);
                alert(`Error: ${data.message}`);
              }
            } catch (err) {
              console.error("Failed to parse SSE data:", err);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      alert("Failed to send message. Please try again.");
      setIsStreaming(false);
      setStreamingContent("");
    } finally {
      setIsSending(false);
    }
  };

  const startEditingTitle = () => {
    if (currentConversation) {
      setEditedTitle(currentConversation.title);
      setIsEditingTitle(true);
      // Focus input after state update
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

    const newTitle = editedTitle.trim();

    try {
      const response = await apiPatch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chat/conversations/${currentConversation.id}`,
        { title: newTitle }
      );

      if (!response.ok) {
        throw new Error("Failed to update title");
      }

      const updatedConv = await response.json();

      // Update current conversation
      setCurrentConversation(updatedConv);

      // Update in conversations list
      setConversations(conversations.map(conv =>
        conv.id === updatedConv.id ? updatedConv : conv
      ));

      setIsEditingTitle(false);
      setEditedTitle("");

      // Show success message (simple alert for now)
      alert("Conversation renamed successfully!");
    } catch (err) {
      console.error("Failed to rename conversation:", err);
      alert("Failed to rename conversation. Please try again.");
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      saveTitle();
    } else if (e.key === "Escape") {
      cancelEditingTitle();
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const response = await apiDelete(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chat/conversations/${conversationId}`
      );

      if (!response.ok) {
        throw new Error("Failed to delete conversation");
      }

      // Remove from conversations list
      setConversations(conversations.filter(conv => conv.id !== conversationId));

      // If deleted conversation was current, clear it
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }

      // Close modal
      setDeleteConfirmConvId(null);

      // Show success toast
      showToast("Conversation deleted successfully", "success");
    } catch (err) {
      console.error("Failed to delete conversation:", err);
      showToast("Failed to delete conversation. Please try again.", "error");
    }
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

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

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-[#0A0A0A] text-[#F5F5F5]">
      {/* Header */}
      <header className="border-b border-[#2A2A2A] bg-[#1A1A1A]">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-[#A1A1A1] hover:text-[#F5F5F5] transition-colors"
              aria-label="Toggle sidebar"
            >
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold">SOP AI Agent</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="text-[#A1A1A1]">Welcome, </span>
              <span className="text-[#F5F5F5] font-medium">{user.full_name}</span>
            </div>
            <div className="text-xs text-[#737373] bg-[#2A2A2A] px-2 py-1 rounded">
              {user.role}
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-[#A1A1A1] hover:text-[#F5F5F5] transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className={`${
            isSidebarOpen ? "w-64" : "w-0"
          } transition-all duration-300 border-r border-[#2A2A2A] bg-[#1A1A1A] flex-shrink-0 overflow-hidden`}
        >
          <div className="h-full flex flex-col p-4">
            {/* New Chat Button */}
            <button
              onClick={createNewConversation}
              disabled={isLoading}
              className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white font-medium rounded-lg px-4 py-2.5 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              {isLoading ? "Creating..." : "+ New Chat"}
            </button>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {conversations.length === 0 ? (
                <div className="text-center text-[#737373] text-sm mt-4">
                  No conversations yet.
                  <br />
                  Click "+ New Chat" to start.
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onMouseEnter={() => setHoveredConvId(conv.id)}
                    onMouseLeave={() => setHoveredConvId(null)}
                    className="relative"
                  >
                    <button
                      onClick={() => setCurrentConversation(conv)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors duration-200 ${
                        currentConversation?.id === conv.id
                          ? "bg-[#2A2A2A] text-[#F5F5F5]"
                          : "text-[#A1A1A1] hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                      }`}
                    >
                      <div className="text-sm font-medium truncate pr-8">{conv.title}</div>
                      <div className="text-xs text-[#737373] mt-1">
                        {conv.message_count} {conv.message_count === 1 ? "message" : "messages"}
                      </div>
                    </button>
                    {hoveredConvId === conv.id && (
                      <div className="absolute right-2 top-2 flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentConversation(conv);
                            startEditingTitle();
                          }}
                          className="p-1 rounded hover:bg-[#3A3A3A] transition-colors"
                          title="Rename conversation"
                        >
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4L13 6L6 13H4V11L11 4Z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmConvId(conv.id);
                          }}
                          className="p-1 rounded hover:bg-[#EF4444] transition-colors"
                          title="Delete conversation"
                        >
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h12M8 6V4h2v2M5 6v10h8V6" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-[#0A0A0A]">
          {currentConversation ? (
            <>
              {/* Chat Header */}
              <div className="border-b border-[#2A2A2A] bg-[#1A1A1A] px-6 py-4">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2">
                    <input
                      ref={titleInputRef}
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      onKeyDown={handleTitleKeyDown}
                      onBlur={saveTitle}
                      className="flex-1 text-lg font-semibold bg-[#2A2A2A] border border-[#3B82F6] rounded px-3 py-1 text-[#F5F5F5] focus:outline-none"
                    />
                    <button
                      onClick={saveTitle}
                      className="px-3 py-1 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded text-sm transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEditingTitle}
                      className="px-3 py-1 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-[#A1A1A1] rounded text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group">
                    <h2 className="text-lg font-semibold">{currentConversation.title}</h2>
                    <button
                      onClick={startEditingTitle}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#2A2A2A] transition-all"
                      title="Rename conversation"
                    >
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4L13 6L6 13H4V11L11 4Z" />
                      </svg>
                    </button>
                  </div>
                )}
                <p className="text-xs text-[#737373] mt-1">
                  {currentConversation.message_count} {currentConversation.message_count === 1 ? "message" : "messages"}
                </p>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6">
                {messages.length === 0 && !isStreaming ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center max-w-md">
                      <h3 className="text-xl font-semibold mb-4">Start a new conversation</h3>
                      <p className="text-[#A1A1A1] mb-6">
                        Ask questions about company SOPs and get instant answers from our AI assistant.
                      </p>
                      <div className="space-y-2">
                        <div className="text-sm text-[#737373] mb-2">Suggested prompts:</div>
                        <button
                          onClick={() => setInputMessage("What is the employee onboarding process?")}
                          className="w-full text-left px-4 py-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] rounded-lg transition-colors text-sm border border-[#2A2A2A]"
                        >
                          What is the employee onboarding process?
                        </button>
                        <button
                          onClick={() => setInputMessage("How do I request time off?")}
                          className="w-full text-left px-4 py-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] rounded-lg transition-colors text-sm border border-[#2A2A2A]"
                        >
                          How do I request time off?
                        </button>
                        <button
                          onClick={() => setInputMessage("What are the security protocols?")}
                          className="w-full text-left px-4 py-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] rounded-lg transition-colors text-sm border border-[#2A2A2A]"
                        >
                          What are the security protocols?
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto space-y-6">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-3 ${
                            message.role === "user"
                              ? "bg-[#3B82F6] text-white"
                              : "bg-[#1A1A1A] text-[#F5F5F5] border border-[#2A2A2A]"
                          }`}
                        >
                          <div className="text-xs opacity-70 mb-1">
                            {message.role === "user" ? "You" : "AI Assistant"}
                          </div>
                          <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                        </div>
                      </div>
                    ))}

                    {/* Streaming message */}
                    {isStreaming && streamingContent && (
                      <div className="flex justify-start">
                        <div className="max-w-[80%] rounded-lg px-4 py-3 bg-[#1A1A1A] text-[#F5F5F5] border border-[#2A2A2A]">
                          <div className="text-xs opacity-70 mb-1">AI Assistant</div>
                          <div className="text-sm whitespace-pre-wrap">{streamingContent}</div>
                          <div className="inline-block w-1 h-4 bg-[#3B82F6] animate-pulse ml-1"></div>
                        </div>
                      </div>
                    )}

                    {/* Typing indicator when waiting for first token */}
                    {isStreaming && !streamingContent && (
                      <div className="flex justify-start">
                        <div className="max-w-[80%] rounded-lg px-4 py-3 bg-[#1A1A1A] text-[#F5F5F5] border border-[#2A2A2A]">
                          <div className="text-xs opacity-70 mb-1">AI Assistant</div>
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-[#737373] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                            <div className="w-2 h-2 bg-[#737373] rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                            <div className="w-2 h-2 bg-[#737373] rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="border-t border-[#2A2A2A] bg-[#1A1A1A] p-4">
                <div className="max-w-4xl mx-auto">
                  <form onSubmit={sendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Type your message..."
                      disabled={isSending}
                      className="flex-1 px-4 py-3 bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg text-[#F5F5F5] placeholder-[#737373] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={isSending || !inputMessage.trim()}
                      className="px-6 py-3 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSending ? "Sending..." : "Send"}
                    </button>
                  </form>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <h3 className="text-2xl font-semibold mb-4">Welcome to SOP AI Agent</h3>
                <p className="text-[#A1A1A1] mb-6">
                  Select a conversation from the sidebar or create a new one to get started.
                </p>
                <button
                  onClick={createNewConversation}
                  disabled={isLoading}
                  className="bg-[#3B82F6] hover:bg-[#2563EB] text-white font-medium rounded-lg px-6 py-3 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Creating..." : "Start New Chat"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmConvId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Conversation?</h3>
            <p className="text-[#A1A1A1] text-sm mb-6">
              This will permanently delete this conversation and all its messages. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmConvId(null)}
                className="px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-[#F5F5F5] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteConversation(deleteConfirmConvId)}
                className="px-4 py-2 bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
          <div
            className={`rounded-lg px-4 py-3 shadow-lg ${
              toast.type === "success"
                ? "bg-[#10B981] text-white"
                : "bg-[#EF4444] text-white"
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.type === "success" ? (
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <span className="text-sm font-medium">{toast.message}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
