"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  sources?: Array<{
    document_id: string;
    document_title: string;
    chunk_text: string;
  }>;
}

interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  is_shared: boolean;
  share_token: string | null;
}

interface User {
  username: string;
  full_name: string;
}

export default function SharedConversationPage() {
  const params = useParams();
  const shareToken = params.share_token as string;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sharedBy, setSharedBy] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSharedConversation = async () => {
      try {
        setIsLoading(true);
        setError("");

        // Fetch conversation metadata
        const convResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/chat/shared/${shareToken}`
        );

        if (!convResponse.ok) {
          if (convResponse.status === 404) {
            throw new Error("This shared conversation was not found or sharing has been disabled.");
          }
          throw new Error("Failed to load shared conversation");
        }

        const convData = await convResponse.json();
        setConversation(convData);

        // Fetch messages
        const messagesResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/chat/shared/${shareToken}/messages`
        );

        if (!messagesResponse.ok) {
          throw new Error("Failed to load conversation messages");
        }

        const messagesData = await messagesResponse.json();
        setMessages(messagesData);

        // Fetch user info for "Shared by" banner
        // Note: The backend should return user info with the conversation
        // For now, we'll use a placeholder
        setSharedBy({
          username: "user",
          full_name: "Shared User"
        });

      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    if (shareToken) {
      fetchSharedConversation();
    }
  }, [shareToken]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-[#F5F5F5]">Loading shared conversation...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-[#1A1A1A] rounded-lg p-8 border border-[#2A2A2A]">
          <div className="text-center">
            <div className="text-4xl mb-4">🔗</div>
            <h1 className="text-xl font-semibold text-[#F5F5F5] mb-2">
              Unable to Load Conversation
            </h1>
            <p className="text-[#A1A1A1] mb-6">{error}</p>
            <a
              href="/"
              className="inline-block bg-[#3B82F6] hover:bg-[#2563EB] text-white font-medium rounded-lg px-6 py-2.5 transition-colors duration-200"
            >
              Go to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Header */}
      <header className="bg-[#1A1A1A] border-b border-[#2A2A2A] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[#F5F5F5]">
            SOP AI Agent
          </h1>
          <div className="text-sm text-[#A1A1A1]">
            Shared Conversation (Read-only)
          </div>
        </div>
      </header>

      {/* Shared By Banner */}
      <div className="bg-[#3B82F6]/10 border-b border-[#3B82F6]/20 px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          <svg
            className="w-5 h-5 text-[#3B82F6]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          <span className="text-[#3B82F6] text-sm font-medium">
            Shared by {sharedBy?.full_name || "a user"}
          </span>
        </div>
      </div>

      {/* Conversation Title */}
      <div className="bg-[#1A1A1A] border-b border-[#2A2A2A] px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold text-[#F5F5F5]">
            {conversation?.title || "Conversation"}
          </h2>
          <p className="text-sm text-[#A1A1A1] mt-1">
            {new Date(conversation?.created_at || "").toLocaleDateString()} •{" "}
            {messages.length} messages
          </p>
        </div>
      </div>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#A1A1A1]">No messages in this conversation</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-[#3B82F6] flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                      </svg>
                    </div>
                  </div>
                )}

                <div
                  className={`max-w-[70%] ${
                    message.role === "user"
                      ? "bg-[#3B82F6] text-white"
                      : "bg-[#1A1A1A] text-[#F5F5F5] border border-[#2A2A2A]"
                  } rounded-lg px-4 py-3`}
                >
                  <div className="prose prose-invert max-w-none">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </p>
                  </div>

                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#2A2A2A]">
                      <p className="text-xs text-[#A1A1A1] mb-2 font-medium">
                        Sources:
                      </p>
                      <div className="space-y-1">
                        {message.sources.map((source, idx) => (
                          <div
                            key={idx}
                            className="text-xs text-[#3B82F6] hover:text-[#60A5FA] transition-colors"
                          >
                            📄 {source.document_title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-2 text-xs text-[#737373]">
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </div>
                </div>

                {message.role === "user" && (
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-[#2A2A2A] flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-[#F5F5F5]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      {/* Disabled Input Footer */}
      <footer className="bg-[#1A1A1A] border-t border-[#2A2A2A] px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            <input
              type="text"
              disabled
              placeholder="This is a read-only shared conversation"
              className="w-full px-4 py-3 bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg text-[#737373] cursor-not-allowed opacity-50"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <svg
                className="w-5 h-5 text-[#737373]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
          </div>
          <p className="text-xs text-[#737373] mt-2 text-center">
            This shared conversation is read-only. You cannot send messages or make edits.
          </p>
        </div>
      </footer>
    </div>
  );
}
