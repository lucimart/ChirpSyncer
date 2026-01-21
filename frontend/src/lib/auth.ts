import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Session } from '@/types';
import { api } from './api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true,
      isAuthenticated: false,

      login: async (username: string, password: string) => {
        const response = await api.login(username, password);

        if (response.success && response.data) {
          const { token, user } = response.data;
          api.setToken(token);
          set({ user, token, isAuthenticated: true });
          return { success: true };
        }

        return { success: false, error: response.error };
      },

      logout: async () => {
        await api.logout();
        api.setToken(null);
        set({ user: null, token: null, isAuthenticated: false });
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
        const { token } = get();

        if (!token) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }

        api.setToken(token);
        const response = await api.getCurrentUser();

        if (response.success && response.data) {
          set({ user: response.data, isAuthenticated: true, isLoading: false });
        } else {
          api.setToken(null);
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
      },
    }),
    {
      name: 'chirpsyncer-auth',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
