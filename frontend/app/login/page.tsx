"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");

  useEffect(() => {
    // Check if user was redirected here due to authentication requirement
    const redirect = searchParams.get("redirect");
    if (redirect) {
      setInfoMessage("Please sign in to continue");
    }
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Important for httpOnly cookies
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Login failed");
      }

      const data = await response.json();

      // Store access token in memory (could use a state management solution)
      if (typeof window !== "undefined") {
        sessionStorage.setItem("access_token", data.access_token);
        sessionStorage.setItem("user", JSON.stringify(data.user));
      }

      // Redirect to original destination or default to chat
      const redirect = searchParams.get("redirect") || "/chat";
      router.push(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo/Brand Area */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-[#F5F5F5] tracking-tight mb-2">
            SOP AI Agent
          </h1>
          <p className="text-[#A1A1A1] text-sm">
            Sign in to access company SOPs
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#1A1A1A] rounded-lg p-8 border border-[#2A2A2A]">
          {/* Info Message */}
          {infoMessage && (
            <div className="mb-6 bg-[#3B82F6]/10 border border-[#3B82F6]/20 rounded-lg p-3">
              <p className="text-[#3B82F6] text-sm">{infoMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-[#F5F5F5] mb-2"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                disabled={isLoading}
                className="w-full px-4 py-2 bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg text-[#F5F5F5] placeholder-[#737373] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-all duration-200 disabled:opacity-50"
                placeholder="Enter your username"
              />
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[#F5F5F5] mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={isLoading}
                className="w-full px-4 py-2 bg-[#2A2A2A] border border-[#2A2A2A] rounded-lg text-[#F5F5F5] placeholder-[#737373] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-all duration-200 disabled:opacity-50"
                placeholder="Enter your password"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg p-3">
                <p className="text-[#EF4444] text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white font-medium rounded-lg px-4 py-2.5 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-2 focus:ring-offset-[#1A1A1A]"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Development Hint */}
          <div className="mt-6 p-4 bg-[#2A2A2A] rounded-lg">
            <p className="text-xs text-[#A1A1A1] text-center">
              Development credentials: <span className="text-[#F5F5F5]">admin</span> / <span className="text-[#F5F5F5]">password123</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-[#737373]">
            © 2024 SOP AI Agent. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
