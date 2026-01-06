"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

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
    <div className="min-h-screen bg-theme-primary flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo/Brand Area */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center shadow-lg">
            <svg width="32" height="32" fill="white" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-3xl font-semibold text-theme-primary tracking-tight mb-2">
            SOP AI Agent
          </h1>
          <p className="text-theme-secondary text-sm">
            Sign in to access company SOPs
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-theme-secondary rounded-xl p-8 border border-theme shadow-theme-card">
          {/* Info Message */}
          {infoMessage && (
            <div className="mb-6 bg-accent-primary/10 border border-accent-primary/20 rounded-lg p-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-primary shrink-0" aria-hidden="true">
                  <circle cx="8" cy="8" r="7" />
                  <path d="M8 5v3M8 11h.01" />
                </svg>
                <p className="text-accent-primary text-sm">{infoMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" aria-label="Login form">
            {/* Username Field */}
            <Input
              id="username"
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              disabled={isLoading}
              placeholder="Enter your username"
              className="py-2.5"
            />

            {/* Password Field */}
            <Input
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={isLoading}
              placeholder="Enter your password"
              className="py-2.5"
            />

            {/* Error Message - F91: Accessible error announcement */}
            {error && (
              <div
                className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 animate-fade-in"
                role="alert"
                aria-live="assertive"
              >
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500 shrink-0" aria-hidden="true">
                    <circle cx="8" cy="8" r="7" />
                    <path d="M8 5v3M8 11h.01" />
                  </svg>
                  <p className="text-red-500 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              isLoading={isLoading}
              className="w-full py-2.5"
              aria-label={isLoading ? "Signing in" : "Sign in to your account"}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          {/* Development Hint */}
          <div className="mt-6 p-4 bg-theme-tertiary rounded-lg border border-theme">
            <p className="text-xs text-theme-secondary text-center">
              Development credentials: <code className="px-1.5 py-0.5 bg-theme-primary rounded text-theme-primary font-mono">admin</code> / <code className="px-1.5 py-0.5 bg-theme-primary rounded text-theme-primary font-mono">password123</code>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-theme-muted">
            &copy; {new Date().getFullYear()} SOP AI Agent. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
