"use client";

import { useEffect, useState } from "react";
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

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleLogout = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout API call failed:", err);
    }
    sessionStorage.clear();
    router.push("/login");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-[#A1A1A1]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] flex flex-col">
      {/* Header */}
      <header className="border-b border-[#2A2A2A] bg-[#1A1A1A] px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-[#A1A1A1] hover:text-[#F5F5F5] transition-colors"
              aria-label="Toggle sidebar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
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
                {currentConversation.message_count === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center max-w-md">
                      <h3 className="text-xl font-semibold mb-4">Start a new conversation</h3>
                      <p className="text-[#A1A1A1] mb-6">
                        Ask questions about company SOPs and get instant answers from our AI assistant.
                      </p>
                      <div className="space-y-2">
                        <div className="text-sm text-[#737373] mb-2">Suggested prompts:</div>
                        <button className="w-full text-left px-4 py-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] rounded-lg transition-colors text-sm border border-[#2A2A2A]">
                          What is the employee onboarding process?
                        </button>
                        <button className="w-full text-left px-4 py-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] rounded-lg transition-colors text-sm border border-[#2A2A2A]">
                          How do I request time off?
                        </button>
                        <button className="w-full text-left px-4 py-3 bg-[#1A1A1A] hover:bg-[#2A2A2A] rounded-lg transition-colors text-sm border border-[#2A2A2A]">
                          What are the security protocols?
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-[#737373]">
                    Messages will be displayed here.
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="border-t border-[#2A2A2A] bg-[#1A1A1A] p-4">
                <div className="max-w-4xl mx-auto">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-3 bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg text-[#F5F5F5] placeholder-[#737373] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent"
                    />
                    <button className="px-6 py-3 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg transition-colors font-medium">
                      Send
                    </button>
                  </div>
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
