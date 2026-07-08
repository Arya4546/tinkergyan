import { create } from 'zustand';
import { subscribeWithSelector, persist } from 'zustand/middleware';
import type { User, LoginRequest, RegisterRequest } from '@tinkergyan/shared-types';
import { api } from '../services/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector(
    persist(
      (set, _get) => ({
        user: null as User | null,
        accessToken: null as string | null,
        isLoading: true as boolean,

        setUser: (user: User | null) => set({ user }),
        setAccessToken: (accessToken: string | null) => set({ accessToken }),

        login: async (credentials: LoginRequest) => {
          const response = await api.post<{
            success: boolean;
            data: { user: User; accessToken: string };
          }>('/auth/login', credentials);
          set({ user: response.data.data.user, accessToken: response.data.data.accessToken });
        },

        register: async (credentials: RegisterRequest) => {
          const response = await api.post<{
            success: boolean;
            data: { user: User; accessToken: string };
          }>('/auth/register', credentials);
          set({ user: response.data.data.user, accessToken: response.data.data.accessToken });
        },

        logout: async () => {
          try {
            await api.post('/auth/logout');
          } finally {
            set({ user: null, accessToken: null });
          }
        },

        checkAuth: async () => {
          try {
            const response = await api.get<{ success: boolean; data: { user: User } }>('/auth/me');
            set({ user: response.data.data.user, isLoading: false });
          } catch {
            set({ user: null, accessToken: null, isLoading: false });
          }
        },
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
      },
    ),
  ),
);

export const useUser = () => useAuthStore((s) => s.user);
export const useIsAuthenticated = () => useAuthStore((s) => !!s.user || !!s.accessToken);
