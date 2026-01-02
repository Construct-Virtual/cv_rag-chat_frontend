"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const getAuthHeaders = () => {
    const token = sessionStorage.getItem("access_token");
    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };
  };

  const loadConversations = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/conversations`, {
        headers: getAuthHeaders()
      });

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
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chat/conversations/${conversationId}/messages`,
        {
          headers: getAuthHeaders()
        }
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/conversations`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({})
      });

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

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/query`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          conversation_id: currentConversation.id,
          message: messageText
        })
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

  const handleLogout = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
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
                  <button
                    key={conv.id}
                    onClick={() => setCurrentConversation(conv)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors duration-200 ${
                      currentConversation?.id === conv.id
                        ? "bg-[#2A2A2A] text-[#F5F5F5]"
                        : "text-[#A1A1A1] hover:bg-[#2A2A2A] hover:text-[#F5F5F5]"
                    }`}
                  >
                    <div className="text-sm font-medium truncate">{conv.title}</div>
                    <div className="text-xs text-[#737373] mt-1">
                      {conv.message_count} {conv.message_count === 1 ? "message" : "messages"}
                    </div>
                  </button>
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
                <h2 className="text-lg font-semibold">{currentConversation.title}</h2>
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
    </div>
  );
}
