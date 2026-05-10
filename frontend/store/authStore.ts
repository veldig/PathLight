import { create } from 'zustand';
import { getStoredToken, getStoredUser, clearAuthData } from '@/lib/supabase';

interface AuthUser {
  id: string;
  email: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  loaded: boolean;
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  loaded: false,

  setAuth: (token, user) => set({ token, user, loaded: true }),

  clearAuth: async () => {
    await clearAuthData();
    set({ token: null, user: null, loaded: true });
  },

  loadFromStorage: async () => {
    try {
      const [token, user] = await Promise.all([getStoredToken(), getStoredUser()]);
      set({ token, user, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
}));
