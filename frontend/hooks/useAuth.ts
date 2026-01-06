'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { apiPost } from '@/app/utils/api';
import type { User, LoginResponse } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function useAuthActions() {
  const router = useRouter();
  const { login: storeLogin, logout: storeLogout, setLoading, setError, clearError } = useAuthStore();

  const login = async (username: string, password: string, redirectTo?: string): Promise<boolean> => {
    setLoading(true);
    clearError();

    try {
      const response = await apiPost(
        `${API_URL}/api/auth/login`,
        { username, password },
        { skipAuth: true }
      );

      if (!response.ok) {
        const data = await response.json();
        setError(data.detail || 'Login failed');
        setLoading(false);
        return false;
      }

      const data: LoginResponse = await response.json();
      storeLogin(data.user, data.access_token);

      // Redirect after login
      router.push(redirectTo || '/chat');
      return true;
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred during login');
      setLoading(false);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await apiPost(`${API_URL}/api/auth/logout`, {});
    } catch (err) {
      console.error('Logout error:', err);
    }

    storeLogout();
    router.push('/login');
  };

  const getCurrentUser = async (): Promise<User | null> => {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('access_token')}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch {
      return null;
    }
  };

  return {
    login,
    logout,
    getCurrentUser,
  };
}

// Hook for accessing auth state
export function useAuthState() {
  const { user, isAuthenticated, isLoading, error } = useAuthStore();
  return { user, isAuthenticated, isLoading, error };
}
