'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { ToastType } from '@/hooks/useToast';

interface ToastProps {
  message: string;
  type: ToastType;
  onDismiss?: () => void;
  duration?: number;
}

const typeStyles: Record<ToastType, { bg: string; icon: string }> = {
  success: {
    bg: 'bg-[#10B981]',
    icon: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z',
  },
  error: {
    bg: 'bg-[#EF4444]',
    icon: 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z',
  },
  warning: {
    bg: 'bg-[#F59E0B]',
    icon: 'M10 18a8 8 0 100-16 8 8 0 000 16zM9 7a1 1 0 112 0v4a1 1 0 11-2 0V7zm0 8a1 1 0 112 0 1 1 0 01-2 0z',
  },
  info: {
    bg: 'bg-[#3B82F6]',
    icon: 'M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 102 0V7zm-1 8a1 1 0 100-2 1 1 0 000 2z',
  },
};

export function Toast({ message, type, onDismiss, duration = 3000 }: ToastProps) {
  // F68: State for managing slide-in/slide-out animation
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        // Wait for slide-out animation to complete before calling onDismiss
        setTimeout(() => onDismiss?.(), 200);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  const styles = typeStyles[type];

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss?.(), 200);
  };

  return (
    <div
      className={cn(
        // F68: Toast positioned at top-right with slide-in/slide-out animations
        'flex items-center gap-3 rounded-lg px-4 py-3 text-white shadow-lg',
        styles.bg,
        isExiting ? 'animate-toast-out' : 'animate-toast-in'
      )}
      role="alert"
    >
      <svg
        width="20"
        height="20"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path fillRule="evenodd" d={styles.icon} clipRule="evenodd" />
      </svg>
      <span className="text-sm font-medium">{message}</span>
      {onDismiss && (
        <button
          onClick={handleDismiss}
          className="ml-2 rounded p-1 hover:bg-white/20 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Dismiss notification"
          type="button"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 3l8 8M11 3l-8 8" />
          </svg>
        </button>
      )}
    </div>
  );
}

// F68: Container for multiple toasts - positioned at top-right
interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type: ToastType }>;
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  );
}
