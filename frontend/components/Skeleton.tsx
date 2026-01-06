'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  const variantStyles = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  // F69: Animation styles with proper pulse animation
  const animationStyles = {
    pulse: 'animate-skeleton-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  return (
    <div
      className={cn(
        'bg-theme-tertiary',
        variantStyles[variant],
        animationStyles[animation],
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
      aria-hidden="true"
    />
  );
}

// Pre-built skeleton patterns
export function MessageSkeleton() {
  return (
    <div className="flex gap-3 p-4">
      <Skeleton variant="circular" width={40} height={40} />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" className="h-4 w-24" />
        <Skeleton variant="text" className="h-4 w-full" />
        <Skeleton variant="text" className="h-4 w-3/4" />
      </div>
    </div>
  );
}

export function ConversationSkeleton() {
  return (
    <div className="px-3 py-2 space-y-2">
      <Skeleton variant="text" className="h-4 w-3/4" />
      <Skeleton variant="text" className="h-3 w-1/2" />
    </div>
  );
}

export function ConversationListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <ConversationSkeleton key={i} />
      ))}
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Header skeleton */}
      <div className="border-b border-theme p-4">
        <Skeleton variant="text" className="h-6 w-48" />
        <Skeleton variant="text" className="h-3 w-24 mt-2" />
      </div>

      {/* Messages skeleton */}
      <div className="flex-1 p-6 space-y-6">
        <MessageSkeleton />
        <MessageSkeleton />
        <MessageSkeleton />
      </div>

      {/* Input skeleton */}
      <div className="border-t border-theme p-4">
        <Skeleton variant="rectangular" className="h-12 w-full" />
      </div>
    </div>
  );
}
