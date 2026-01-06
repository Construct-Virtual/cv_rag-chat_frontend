/**
 * API client with automatic token refresh, network error handling, and retry support
 * F85: Network error handling with user-friendly messages
 * F86: API 5xx error handling with retry button
 */

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
  /** Number of retry attempts for failed requests (default: 0) */
  retries?: number;
  /** Delay between retries in ms (default: 1000) */
  retryDelay?: number;
  /** Only retry on specific status codes (default: 5xx errors) */
  retryOnStatus?: number[];
  /** Request timeout in ms (default: 30000 = 30 seconds) */
  timeout?: number;
}

/**
 * Custom API error class with status code and user-friendly message
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public userMessage: string,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Get user-friendly error message based on status code
 */
function getErrorMessage(statusCode: number, serverMessage?: string): { message: string; isRetryable: boolean } {
  switch (statusCode) {
    case 0:
      return {
        message: 'Unable to connect to the server. Please check your internet connection.',
        isRetryable: true,
      };
    case 400:
      return {
        message: serverMessage || 'Invalid request. Please check your input and try again.',
        isRetryable: false,
      };
    case 401:
      return {
        message: 'Your session has expired. Please log in again.',
        isRetryable: false,
      };
    case 403:
      return {
        message: 'You do not have permission to perform this action.',
        isRetryable: false,
      };
    case 404:
      return {
        message: serverMessage || 'The requested resource was not found.',
        isRetryable: false,
      };
    case 429:
      return {
        message: 'Too many requests. Please wait a moment and try again.',
        isRetryable: true,
      };
    case 500:
      return {
        message: 'The server encountered an error. Please try again.',
        isRetryable: true,
      };
    case 502:
      return {
        message: 'The server is temporarily unavailable. Please try again.',
        isRetryable: true,
      };
    case 503:
      return {
        message: 'The service is temporarily unavailable. Please try again later.',
        isRetryable: true,
      };
    case 504:
      return {
        message: 'The request timed out. Please try again.',
        isRetryable: true,
      };
    default:
      if (statusCode >= 500) {
        return {
          message: serverMessage || 'A server error occurred. Please try again.',
          isRetryable: true,
        };
      }
      return {
        message: serverMessage || 'An error occurred. Please try again.',
        isRetryable: false,
      };
  }
}

/**
 * Check if the browser is online
 */
function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Show a session expired toast notification
 */
function showSessionExpiredToast() {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up z-50';
  toast.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM11 15H9V13H11V15ZM11 11H9V5H11V11Z" fill="currentColor"/>
    </svg>
    <span class="text-sm font-medium">Session expired. Please log in again.</span>
  `;
  document.body.appendChild(toast);

  // Auto remove after redirect
  setTimeout(() => {
    if (document.body.contains(toast)) {
      document.body.removeChild(toast);
    }
  }, 5000);
}

/**
 * Show a network error toast notification
 */
function showNetworkErrorToast(message: string) {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-4 right-4 bg-orange-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up z-50';
  toast.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/>
    </svg>
    <span class="text-sm font-medium">${message}</span>
  `;
  document.body.appendChild(toast);

  // Auto remove
  setTimeout(() => {
    if (document.body.contains(toast)) {
      document.body.removeChild(toast);
    }
  }, 5000);
}

/**
 * Make an authenticated API call with automatic token refresh
 * F85: Network error handling
 * F86: 5xx error handling with retry support
 *
 * @param url - The API endpoint URL
 * @param options - Fetch options
 * @returns Promise with the response
 */
export async function apiClient(url: string, options: FetchOptions = {}): Promise<Response> {
  const {
    skipAuth = false,
    retries = 0,
    retryDelay = 1000,
    retryOnStatus = [500, 502, 503, 504],
    timeout = 60000, // Default 60 second timeout (increased from typical 30s for slow backend)
    ...fetchOptions
  } = options;

  // Check if online before making request
  if (!isOnline()) {
    showNetworkErrorToast('You appear to be offline. Please check your connection.');
    throw new ApiError(
      'Network offline',
      0,
      'You appear to be offline. Please check your internet connection.',
      true
    );
  }

  // Get access token from sessionStorage
  const accessToken = typeof window !== 'undefined'
    ? sessionStorage.getItem('access_token')
    : null;

  // Set up headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  // Add authorization header if not skipping auth
  if (!skipAuth && accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let lastError: Error | null = null;
  let response: Response | null = null;

  // Attempt the request with retries
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Make the request with timeout
      response = await fetch(url, {
        ...fetchOptions,
        headers,
        credentials: 'include', // Important for cookies
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // If we get a 401 and it's not a login/refresh endpoint, try to refresh the token
      if (response.status === 401 && !skipAuth && !url.includes('/auth/login') && !url.includes('/auth/refresh')) {
        const refreshed = await refreshAccessToken();

        if (refreshed) {
          // Retry the original request with the new token
          const newAccessToken = sessionStorage.getItem('access_token');
          if (newAccessToken) {
            headers['Authorization'] = `Bearer ${newAccessToken}`;
          }

          response = await fetch(url, {
            ...fetchOptions,
            headers,
            credentials: 'include',
          });
        } else {
          // Refresh failed, redirect to login
          if (typeof window !== 'undefined') {
            // Show session expired notification
            showSessionExpiredToast();

            const currentPath = window.location.pathname;
            sessionStorage.clear();

            // Small delay to let the toast show before redirect
            setTimeout(() => {
              window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
            }, 1000);
          }
          return response;
        }
      }

      // Check if we should retry based on status code
      if (retryOnStatus.includes(response.status) && attempt < retries) {
        console.warn(`Request failed with status ${response.status}, retrying in ${retryDelay}ms... (attempt ${attempt + 1}/${retries})`);
        await sleep(retryDelay * (attempt + 1)); // Exponential backoff
        continue;
      }

      // Success or non-retryable error
      return response;

    } catch (error) {
      lastError = error as Error;

      // Handle timeout (AbortError)
      if (error instanceof DOMException && error.name === 'AbortError') {
        if (attempt < retries) {
          console.warn(`Request timed out, retrying in ${retryDelay}ms... (attempt ${attempt + 1}/${retries})`);
          await sleep(retryDelay * (attempt + 1));
          continue;
        }

        // All retries exhausted
        showNetworkErrorToast('The request took too long. Please try again.');
        throw new ApiError(
          'Request timeout',
          504,
          'The request timed out. The server may be busy, please try again.',
          true
        );
      }

      // Network error (fetch failed)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        if (attempt < retries) {
          console.warn(`Network error, retrying in ${retryDelay}ms... (attempt ${attempt + 1}/${retries})`);
          await sleep(retryDelay * (attempt + 1));
          continue;
        }

        // All retries exhausted
        showNetworkErrorToast('Unable to connect to the server. Please try again.');
        throw new ApiError(
          'Network error',
          0,
          'Unable to connect to the server. Please check your internet connection and try again.',
          true
        );
      }

      // Re-throw other errors
      throw error;
    }
  }

  // If we get here with a response, return it
  if (response) {
    return response;
  }

  // If we exhausted retries without a response, throw the last error
  throw lastError || new Error('Request failed');
}

/**
 * Helper to handle API response and throw ApiError for non-ok responses
 */
export async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let serverMessage: string | undefined;
    try {
      const errorData = await response.json();
      serverMessage = errorData.detail || errorData.message || errorData.error;
    } catch {
      // Could not parse error response
    }

    const { message, isRetryable } = getErrorMessage(response.status, serverMessage);
    throw new ApiError(
      `HTTP ${response.status}: ${serverMessage || response.statusText}`,
      response.status,
      message,
      isRetryable
    );
  }

  return response.json();
}

/**
 * Refresh the access token using the refresh token
 *
 * @returns Promise<boolean> - True if refresh was successful, false otherwise
 */
async function refreshAccessToken(): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // Send cookies
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();

    // Store new access token
    if (typeof window !== 'undefined' && data.access_token) {
      sessionStorage.setItem('access_token', data.access_token);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return false;
  }
}

/**
 * Helper function to make GET requests
 * @param url - API endpoint URL
 * @param options - Fetch options including retry configuration
 */
export async function apiGet(url: string, options: FetchOptions = {}): Promise<Response> {
  return apiClient(url, {
    ...options,
    method: 'GET',
  });
}

/**
 * Helper function to make POST requests
 * @param url - API endpoint URL
 * @param body - Request body (will be JSON stringified)
 * @param options - Fetch options including retry configuration
 */
export async function apiPost(url: string, body?: unknown, options: FetchOptions = {}): Promise<Response> {
  return apiClient(url, {
    ...options,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Helper function to make PATCH requests
 * @param url - API endpoint URL
 * @param body - Request body (will be JSON stringified)
 * @param options - Fetch options including retry configuration
 */
export async function apiPatch(url: string, body?: unknown, options: FetchOptions = {}): Promise<Response> {
  return apiClient(url, {
    ...options,
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Helper function to make PUT requests
 * @param url - API endpoint URL
 * @param body - Request body (will be JSON stringified)
 * @param options - Fetch options including retry configuration
 */
export async function apiPut(url: string, body?: unknown, options: FetchOptions = {}): Promise<Response> {
  return apiClient(url, {
    ...options,
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Helper function to make DELETE requests
 * @param url - API endpoint URL
 * @param options - Fetch options including retry configuration
 */
export async function apiDelete(url: string, options: FetchOptions = {}): Promise<Response> {
  return apiClient(url, {
    ...options,
    method: 'DELETE',
  });
}

/**
 * Helper function to make GET requests with automatic retry on 5xx errors
 * F86: Convenience method with built-in retry for server errors
 */
export async function apiGetWithRetry(url: string, options: FetchOptions = {}): Promise<Response> {
  return apiClient(url, {
    retries: 2,
    retryDelay: 1000,
    ...options,
    method: 'GET',
  });
}

/**
 * Helper function to make POST requests with automatic retry on 5xx errors
 * F86: Convenience method with built-in retry for server errors
 */
export async function apiPostWithRetry(url: string, body?: unknown, options: FetchOptions = {}): Promise<Response> {
  return apiClient(url, {
    retries: 2,
    retryDelay: 1000,
    ...options,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}
