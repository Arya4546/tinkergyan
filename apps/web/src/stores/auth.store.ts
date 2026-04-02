import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { User } from '@tinkergyan/shared-types';
import { api } from '../services/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  login: (credentials: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector((set: any, get: any) => ({
    user: null as User | null,
    accessToken: null as string | null,
    isLoading: true as boolean,
    
    setUser: (user: User | null) => set({ user }),
    setAccessToken: (accessToken: string | null) => set({ accessToken }),
    
    login: async (credentials: any) => {
      const { data } = await api.post('/auth/login', credentials);
      set({ user: data.data.user, accessToken: data.data.accessToken });
    },
    
    register: async (credentials: any) => {
      const { data } = await api.post('/auth/register', credentials);
      set({ user: data.data.user, accessToken: data.data.accessToken });
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
        const { data } = await api.get('/auth/me');
        set({ user: data.data.user, isLoading: false });
      } catch (error) {
        set({ user: null, accessToken: null, isLoading: false });
      }
    },
  }))
);

export const useUser = () => useAuthStore((s) => s.user);
export const useIsAuthenticated = () => useAuthStore((s) => !!s.accessToken);
