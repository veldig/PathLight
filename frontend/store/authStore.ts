import { create } from 'zustand';

interface AuthState {
  token: string | null;
  userId: string | null;
  email: string | null;
  loaded: boolean;
  setAuth: (token: string, userId: string, email: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  userId: null,
  email: null,
  loaded: false,
  setAuth: (token, userId, email) => set({ token, userId, email, loaded: true }),
  clearAuth: () => set({ token: null, userId: null, email: null, loaded: true }),
}));
