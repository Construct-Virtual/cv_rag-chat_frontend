/**
 * API client with automatic token refresh
 */

interface FetchOptions extends RequestInit {
  skipAuth?: boolean;
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
        const currentPath = window.location.pathname;
        sessionStorage.clear();
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
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
