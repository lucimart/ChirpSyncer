import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Session } from '@/types';
import { api } from './api';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string, refreshToken?: string) => void;
  refreshAccessToken: () => Promise<boolean>;
}

// Listen for token refresh events from API client
if (typeof window !== 'undefined') {
  window.addEventListener('auth:tokens-refreshed', ((event: CustomEvent<{ token: string; refreshToken: string }>) => {
    const { token, refreshToken } = event.detail;
    useAuth.setState({ token, refreshToken });
  }) as EventListener);
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isLoading: true,
      isAuthenticated: false,

      login: async (username: string, password: string) => {
        const response = await api.login(username, password);

        if (response.success && response.data) {
          const { token, refresh_token, user } = response.data as Session & { refresh_token?: string };
          api.setToken(token);
          api.setRefreshToken(refresh_token || null);
          set({ user, token, refreshToken: refresh_token || null, isAuthenticated: true });
          return { success: true };
        }

        return { success: false, error: response.error };
      },

      logout: async () => {
        await api.logout();
        api.setToken(null);
        api.setRefreshToken(null);
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      },

      register: async (username: string, email: string, password: string) => {
        const response = await api.register(username, email, password);

        if (response.success) {
          // Auto-login after registration
          return get().login(username, password);
        }

        return { success: false, error: response.error };
      },

      checkAuth: async () => {
        const { token, refreshToken, user, isAuthenticated } = get();

        // Sync refresh token with API client
        api.setRefreshToken(refreshToken);

        // Already authenticated with user data - no need to check again
        if (token && user && isAuthenticated) {
          api.setToken(token);
          set({ isLoading: false });
          return;
        }

        if (!token) {
          // Try to refresh if we have a refresh token
          if (refreshToken) {
            const refreshed = await get().refreshAccessToken();
            if (refreshed) {
              set({ isLoading: false });
              return;
            }
          }
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        // Have token but no user - need to verify
        api.setToken(token);
        const response = await api.getCurrentUser();

        if (response.success && response.data) {
          set({ user: response.data, isAuthenticated: true, isLoading: false });
        } else if (response.error?.includes('expired') && refreshToken) {
          // Token expired, try to refresh
          const refreshed = await get().refreshAccessToken();
          if (!refreshed) {
            api.setToken(null);
            api.setRefreshToken(null);
            set({ user: null, token: null, refreshToken: null, isAuthenticated: false, isLoading: false });
          }
        } else {
          api.setToken(null);
          api.setRefreshToken(null);
          set({ user: null, token: null, refreshToken: null, isAuthenticated: false, isLoading: false });
        }
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
      },

      setToken: (token: string, refreshToken?: string) => {
        const newRefreshToken = refreshToken || get().refreshToken;
        api.setToken(token);
        api.setRefreshToken(newRefreshToken);
        set({
          token,
          refreshToken: newRefreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
        // Fetch user info after setting token
        get().checkAuth();
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return false;

        const response = await api.refreshAccessToken(refreshToken);

        if (response.success && response.data) {
          const { token, refresh_token } = response.data as { token: string; refresh_token: string };
          api.setToken(token);
          api.setRefreshToken(refresh_token);
          set({ token, refreshToken: refresh_token, isAuthenticated: true });

          // Fetch user info
          const userResponse = await api.getCurrentUser();
          if (userResponse.success && userResponse.data) {
            set({ user: userResponse.data, isLoading: false });
          }
          return true;
        }

        // Refresh failed - clear auth state
        api.setToken(null);
        api.setRefreshToken(null);
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
        return false;
      },
    }),
    {
      name: 'chirpsyncer-auth',
      partialize: (state) => ({ token: state.token, refreshToken: state.refreshToken }),
    }
  )
);
