"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPut } from "../utils/api";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/Button";
import { Skeleton } from "@/components/Skeleton";
import { Toast, ToastContainer } from "@/components/Toast";
import { useToast } from "@/hooks/useToast";

// Types for gap analysis dashboard
interface GapRecord {
  id: string;
  query: string;
  gap_type: "no_documents" | "low_confidence";
  top_similarity_score: number | null;  // Backend field name
  status: "open" | "addressed" | "dismissed";
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

interface GapDashboardStats {
  total_gaps: number;
  open_gaps: number;
  addressed_gaps: number;
  dismissed_gaps: number;
  gaps_by_type: {
    no_documents: number;
    low_confidence: number;
  };
}

interface GapDashboardResponse {
  statistics: GapDashboardStats;  // Backend field name
  recent_gaps: GapRecord[];
}

interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: string;
}

// Stat card component
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: "blue" | "red" | "green" | "yellow" | "purple";
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const colorStyles = {
    blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    red: "bg-red-500/20 text-red-400 border-red-500/30",
    green: "bg-green-500/20 text-green-400 border-green-500/30",
    yellow: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    purple: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  };

  return (
    <div className="bg-theme-secondary rounded-lg p-4 border border-theme">
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg", colorStyles[color])}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-theme-primary">{value}</p>
          <p className="text-sm text-theme-muted">{title}</p>
        </div>
      </div>
    </div>
  );
}

// Gap type badge component
function GapTypeBadge({ type }: { type: "no_documents" | "low_confidence" }) {
  const styles = {
    no_documents: "bg-red-500/20 text-red-400 border-red-500/30",
    low_confidence: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  };

  const labels = {
    no_documents: "No Documents",
    low_confidence: "Low Confidence",
  };

  return (
    <span className={cn("px-2 py-0.5 text-xs rounded-full border", styles[type])}>
      {labels[type]}
    </span>
  );
}

// Status badge component
function StatusBadge({ status }: { status: "open" | "addressed" | "dismissed" }) {
  const styles = {
    open: "bg-red-500/20 text-red-400 border-red-500/30",
    addressed: "bg-green-500/20 text-green-400 border-green-500/30",
    dismissed: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  };

  const labels = {
    open: "Open",
    addressed: "Addressed",
    dismissed: "Dismissed",
  };

  return (
    <span className={cn("px-2 py-0.5 text-xs rounded-full border capitalize", styles[status])}>
      {labels[status]}
    </span>
  );
}

// Loading skeleton for stats
function StatsLoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-theme-secondary rounded-lg p-4 border border-theme">
          <div className="flex items-center gap-3">
            <Skeleton variant="rectangular" className="w-10 h-10 rounded-lg" />
            <div>
              <Skeleton variant="text" className="h-7 w-12 mb-1" />
              <Skeleton variant="text" className="h-4 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Loading skeleton for gaps list
function GapsListLoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-theme-secondary rounded-lg p-4 border border-theme">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <Skeleton variant="text" className="h-5 w-3/4 mb-2" />
              <div className="flex items-center gap-2">
                <Skeleton variant="text" className="h-5 w-24" />
                <Skeleton variant="text" className="h-5 w-16" />
                <Skeleton variant="text" className="h-4 w-20" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton variant="rectangular" className="h-8 w-24 rounded-lg" />
              <Skeleton variant="rectangular" className="h-8 w-20 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function GapsPage() {
  const router = useRouter();
  const { toasts, showToast, dismissToast } = useToast();

  // Authentication state
  const [user, setUser] = useState<User | null>(null);

  // Dashboard data state
  const [stats, setStats] = useState<GapDashboardStats | null>(null);
  const [gaps, setGaps] = useState<GapRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Action states
  const [resolvingGapId, setResolvingGapId] = useState<string | null>(null);

  // Authentication check
  useEffect(() => {
    if (typeof window !== "undefined") {
      const accessToken = sessionStorage.getItem("access_token");
      const userData = sessionStorage.getItem("user");

      if (!accessToken || !userData) {
        router.push("/login?redirect=/gaps");
        return;
      }

      setUser(JSON.parse(userData));
    }
  }, [router]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    }

    try {
      const response = await apiGet(`${process.env.NEXT_PUBLIC_API_URL}/api/gaps/dashboard`);
      if (!response.ok) {
        throw new Error("Failed to fetch gap analysis data");
      }
      const data: GapDashboardResponse = await response.json();
      setStats(data.statistics);
      setGaps(data.recent_gaps);
    } catch (err) {
      console.error("Failed to fetch gap analysis data:", err);
      showToast("Failed to load gap analysis data", "error");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showToast]);

  // Load data on mount
  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, fetchDashboardData]);

  // Resolve gap (mark as addressed or dismissed)
  const resolveGap = async (gapId: string, status: "addressed" | "dismissed") => {
    setResolvingGapId(gapId);

    try {
      const response = await apiPut(
        `${process.env.NEXT_PUBLIC_API_URL}/api/gaps/${gapId}/resolve`,
        { status }
      );

      if (!response.ok) {
        throw new Error("Failed to resolve gap");
      }

      showToast(
        status === "addressed"
          ? "Gap marked as addressed"
          : "Gap dismissed",
        "success"
      );

      // Refresh data
      await fetchDashboardData(true);
    } catch (err) {
      console.error("Failed to resolve gap:", err);
      showToast("Failed to resolve gap", "error");
    } finally {
      setResolvingGapId(null);
    }
  };

  const isAdmin = user?.role === "admin";

  if (!user) return null;

  return (
    <div className="min-h-screen bg-theme-primary text-theme-primary">
      {/* Header */}
      <header className="h-16 border-b border-theme bg-theme-secondary sticky top-0 z-40">
        <div className="h-full max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/chat"
              className="flex items-center gap-2 text-theme-muted hover:text-theme-primary transition-colors"
              aria-label="Back to chat"
            >
              <svg
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Back to Chat</span>
            </Link>
            <div className="h-6 w-px bg-theme-tertiary" />
            <h1 className="text-lg md:text-xl font-semibold">Gap Analysis Dashboard</h1>
          </div>

          <Button
            onClick={() => fetchDashboardData(true)}
            disabled={isRefreshing}
            isLoading={isRefreshing}
            variant="secondary"
            size="sm"
          >
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Stats Section */}
        <section aria-labelledby="stats-heading" className="mb-8">
          <h2 id="stats-heading" className="text-lg font-semibold mb-4">
            Overview
          </h2>

          {isLoading ? (
            <StatsLoadingSkeleton />
          ) : stats ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              <StatCard
                title="Total Gaps"
                value={stats.total_gaps}
                color="blue"
                icon={
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                }
              />
              <StatCard
                title="Open"
                value={stats.open_gaps}
                color="red"
                icon={
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <StatCard
                title="Addressed"
                value={stats.addressed_gaps}
                color="green"
                icon={
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <StatCard
                title="Dismissed"
                value={stats.dismissed_gaps}
                color="yellow"
                icon={
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                }
              />
              <StatCard
                title="No Documents"
                value={stats.gaps_by_type.no_documents}
                color="purple"
                icon={
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              />
            </div>
          ) : (
            <div className="text-center text-theme-muted py-8">
              Failed to load statistics
            </div>
          )}
        </section>

        {/* Gap Type Breakdown */}
        {stats && (
          <section aria-labelledby="breakdown-heading" className="mb-8">
            <h2 id="breakdown-heading" className="text-lg font-semibold mb-4">
              Gap Type Breakdown
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-theme-secondary rounded-lg p-4 border border-theme">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/20">
                      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-red-400">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-theme-primary">No Documents Found</p>
                      <p className="text-sm text-theme-muted">Queries with no matching documents</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-red-400">{stats.gaps_by_type.no_documents}</p>
                </div>
              </div>

              <div className="bg-theme-secondary rounded-lg p-4 border border-theme">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-500/20">
                      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-yellow-400">
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-theme-primary">Low Confidence Responses</p>
                      <p className="text-sm text-theme-muted">Queries with uncertain answers</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-yellow-400">{stats.gaps_by_type.low_confidence}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Recent Gaps List */}
        <section aria-labelledby="recent-gaps-heading">
          <div className="flex items-center justify-between mb-4">
            <h2 id="recent-gaps-heading" className="text-lg font-semibold">
              Recent Gaps
            </h2>
            {!isAdmin && (
              <p className="text-sm text-theme-muted">
                Contact an admin to resolve gaps
              </p>
            )}
          </div>

          {isLoading ? (
            <GapsListLoadingSkeleton />
          ) : gaps.length === 0 ? (
            <div className="bg-theme-secondary rounded-lg p-8 border border-theme text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-green-400">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-theme-primary mb-2">No Gaps Found</h3>
              <p className="text-theme-muted">
                Great news! There are no knowledge gaps to address at this time.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {gaps.map((gap) => (
                <div
                  key={gap.id}
                  className="bg-theme-secondary rounded-lg p-4 border border-theme hover:border-theme-hover transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-theme-primary font-medium truncate mb-2">
                        {gap.query}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <GapTypeBadge type={gap.gap_type} />
                        <StatusBadge status={gap.status} />
                        {gap.top_similarity_score !== null && (
                          <span className="text-xs text-theme-muted">
                            Confidence: {Math.round(gap.top_similarity_score * 100)}%
                          </span>
                        )}
                        <span className="text-xs text-theme-muted">
                          {formatRelativeTime(gap.created_at)}
                        </span>
                      </div>
                      {gap.resolved_at && gap.resolved_by && (
                        <p className="text-xs text-theme-muted mt-2">
                          Resolved by {gap.resolved_by} {formatRelativeTime(gap.resolved_at)}
                        </p>
                      )}
                    </div>

                    {isAdmin && gap.status === "open" && (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() => resolveGap(gap.id, "addressed")}
                          disabled={resolvingGapId === gap.id}
                          isLoading={resolvingGapId === gap.id}
                        >
                          Mark Resolved
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => resolveGap(gap.id, "dismissed")}
                          disabled={resolvingGapId === gap.id}
                        >
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
