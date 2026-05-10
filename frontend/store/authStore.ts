import { create } from 'zustand';
import { getStoredToken, getStoredUser, clearAuthData } from '@/lib/supabase';

function isHS256Token(token: string): boolean {
  try {
    const headerB64 = token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
    const header = JSON.parse(atob(headerB64));
    return header.alg === 'HS256';
  } catch {
    return false;
  }
}

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
      if (token && !isHS256Token(token)) {
        // Old Supabase tokens use RS256 — backend rejects them. Clear and force re-login.
        await clearAuthData();
        set({ token: null, user: null, loaded: true });
        return;
      }
      set({ token, user, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },
}));
