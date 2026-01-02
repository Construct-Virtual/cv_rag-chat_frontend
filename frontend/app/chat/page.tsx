"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ChatPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check if user is authenticated
    if (typeof window !== "undefined") {
      const accessToken = sessionStorage.getItem("access_token");
      const userData = sessionStorage.getItem("user");

      if (!accessToken || !userData) {
        router.push("/login");
        return;
      }

      setUser(JSON.parse(userData));
    }
  }, [router]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-[#A1A1A1]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5]">
      {/* Header */}
      <header className="border-b border-[#2A2A2A] bg-[#1A1A1A] px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">SOP AI Agent</h1>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="text-[#A1A1A1]">Welcome, </span>
              <span className="text-[#F5F5F5] font-medium">{user.full_name}</span>
            </div>
            <div className="text-xs text-[#737373] bg-[#2A2A2A] px-2 py-1 rounded">
              {user.role}
            </div>
            <button
              onClick={() => {
                sessionStorage.clear();
                router.push("/login");
              }}
              className="text-sm text-[#A1A1A1] hover:text-[#F5F5F5] transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-6">
        <div className="bg-[#1A1A1A] rounded-lg p-8 border border-[#2A2A2A]">
          <h2 className="text-2xl font-semibold mb-4">Chat Interface</h2>
          <p className="text-[#A1A1A1]">
            Chat functionality will be implemented here.
          </p>
        </div>
      </main>
    </div>
  );
}
