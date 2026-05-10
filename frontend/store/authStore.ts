import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
}

interface AuthState {
  token: string | null;
  userId: string | null;
  email: string | null;
  user: AuthUser | null;
  loaded: boolean;
  setAuth: (token: string, userId: string, email: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  userId: null,
  email: null,
  user: null,
  loaded: false,
  setAuth: (token, userId, email) =>
    set({ token, userId, email, user: { id: userId, email }, loaded: true }),
  clearAuth: () =>
    set({ token: null, userId: null, email: null, user: null, loaded: true }),
}));
