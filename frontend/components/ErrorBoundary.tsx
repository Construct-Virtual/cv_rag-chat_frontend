'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Optional callback when user clicks "Try Again" */
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * F84: Error Boundary with fallback UI
 * Catches React errors in child components and displays a user-friendly error screen
 * with options to retry or refresh the page.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = process.env.NODE_ENV === 'development';

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-theme-primary">
          {/* Error icon */}
          <div className="w-16 h-16 mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg
              width="32"
              height="32"
              fill="none"
              stroke="#EF4444"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          {/* Error title */}
          <h2 className="text-xl font-semibold text-theme-primary mb-2">
            Something went wrong
          </h2>

          {/* Error description */}
          <p className="text-theme-secondary mb-6 max-w-md">
            An unexpected error occurred. Please try again or refresh the page.
            If the problem persists, please contact support.
          </p>

          {/* Error details (dev mode only) */}
          {isDev && this.state.error && (
            <details className="mb-6 w-full max-w-lg text-left">
              <summary className="cursor-pointer text-sm text-theme-muted hover:text-theme-secondary transition-colors">
                Show error details
              </summary>
              <pre className="mt-2 p-4 bg-theme-tertiary border border-theme rounded-lg text-xs text-red-400 overflow-auto max-h-48">
                <strong>Error:</strong> {this.state.error.message}
                {'\n\n'}
                <strong>Stack:</strong>
                {'\n'}
                {this.state.error.stack}
                {this.state.errorInfo && (
                  <>
                    {'\n\n'}
                    <strong>Component Stack:</strong>
                    {'\n'}
                    {this.state.errorInfo.componentStack}
                  </>
                )}
              </pre>
            </details>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button onClick={this.handleRetry}>
              Try Again
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * F84/F86: Error display component for non-boundary error states
 * Use this for displaying API errors, network errors, or other recoverable errors
 */
interface ErrorDisplayProps {
  /** Error title */
  title?: string;
  /** Error message to display */
  message: string;
  /** Optional retry callback - if provided, shows retry button */
  onRetry?: () => void;
  /** Optional loading state for retry button */
  isRetrying?: boolean;
  /** Error type for styling */
  type?: 'error' | 'network' | 'server';
}

export function ErrorDisplay({
  title,
  message,
  onRetry,
  isRetrying = false,
  type = 'error',
}: ErrorDisplayProps) {
  // Determine title based on type if not provided
  const displayTitle = title || {
    error: 'Error',
    network: 'Connection Error',
    server: 'Server Error',
  }[type];

  // Icon based on type
  const iconPath = {
    error: 'M12 8v4m0 4h.01',
    network: 'M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0',
    server: 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01',
  }[type];

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center" role="alert">
      {/* Icon */}
      <div className="w-12 h-12 mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
        <svg
          width="24"
          height="24"
          fill="none"
          stroke="#EF4444"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d={iconPath} />
        </svg>
      </div>

      {/* Title */}
      <h3 className="text-lg font-medium text-theme-primary mb-1">{displayTitle}</h3>

      {/* Message */}
      <p className="text-sm text-theme-secondary mb-4 max-w-sm">{message}</p>

      {/* Retry button */}
      {onRetry && (
        <Button size="sm" onClick={onRetry} isLoading={isRetrying} disabled={isRetrying}>
          {isRetrying ? 'Retrying...' : 'Try Again'}
        </Button>
      )}
    </div>
  );
}

/**
 * F85/F86: Network/Server error display component
 * Specialized error display for network and API errors
 */
interface ApiErrorDisplayProps {
  /** HTTP status code */
  statusCode?: number;
  /** Error message */
  message?: string;
  /** Retry callback */
  onRetry?: () => void;
  /** Loading state */
  isRetrying?: boolean;
}

export function ApiErrorDisplay({
  statusCode,
  message,
  onRetry,
  isRetrying = false,
}: ApiErrorDisplayProps) {
  // Determine error type and message based on status code
  let type: 'error' | 'network' | 'server' = 'error';
  let title = 'Error';
  let displayMessage = message || 'An error occurred. Please try again.';

  if (!statusCode || statusCode === 0) {
    type = 'network';
    title = 'Connection Error';
    displayMessage = message || 'Unable to connect to the server. Please check your internet connection and try again.';
  } else if (statusCode >= 500) {
    type = 'server';
    title = 'Server Error';
    displayMessage = message || 'The server encountered an error. Please try again later.';
  } else if (statusCode === 401) {
    title = 'Session Expired';
    displayMessage = 'Your session has expired. Please log in again.';
  } else if (statusCode === 403) {
    title = 'Access Denied';
    displayMessage = 'You do not have permission to perform this action.';
  } else if (statusCode === 404) {
    title = 'Not Found';
    displayMessage = message || 'The requested resource was not found.';
  } else if (statusCode === 429) {
    title = 'Too Many Requests';
    displayMessage = 'You are making too many requests. Please wait a moment and try again.';
  }

  return (
    <ErrorDisplay
      title={title}
      message={displayMessage}
      onRetry={onRetry}
      isRetrying={isRetrying}
      type={type}
    />
  );
}
