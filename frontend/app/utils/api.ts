/**
 * API client with automatic token refresh
 */

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
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
 * Make an authenticated API call with automatic token refresh
 *
 * @param url - The API endpoint URL
 * @param options - Fetch options
 * @returns Promise with the response
 */
export async function apiClient(url: string, options: FetchOptions = {}): Promise<Response> {
  const { skipAuth = false, ...fetchOptions } = options;

  // Get access token from sessionStorage
  const accessToken = typeof window !== 'undefined'
    ? sessionStorage.getItem('access_token')
    : null;

  // Set up headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  // Add authorization header if not skipping auth
  if (!skipAuth && accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Make the request
  let response = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: 'include', // Important for cookies
  });

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
    }
  }

  return response;
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
 */
export async function apiGet(url: string, options: FetchOptions = {}): Promise<Response> {
  return apiClient(url, {
    ...options,
    method: 'GET',
  });
}

/**
 * Helper function to make POST requests
 */
export async function apiPost(url: string, body?: any, options: FetchOptions = {}): Promise<Response> {
  return apiClient(url, {
    ...options,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Helper function to make PATCH requests
 */
export async function apiPatch(url: string, body?: any, options: FetchOptions = {}): Promise<Response> {
  return apiClient(url, {
    ...options,
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Helper function to make DELETE requests
 */
export async function apiDelete(url: string, options: FetchOptions = {}): Promise<Response> {
  return apiClient(url, {
    ...options,
    method: 'DELETE',
  });
}
