import { create } from 'zustand';
import { CalendarProvider } from '@/lib/calendarSync';

interface CalendarState {
  connectedProvider: CalendarProvider | null;
  googleAccessToken: string | null;
  lastSyncedAt: Date | null;
  setConnected: (provider: CalendarProvider, googleToken?: string) => void;
  disconnect: () => void;
  markSynced: () => void;
}

export const useCalendarStore = create<CalendarState>((set) => ({
  connectedProvider: null,
  googleAccessToken: null,
  lastSyncedAt: null,
  setConnected: (provider, googleToken) =>
    set({ connectedProvider: provider, googleAccessToken: googleToken ?? null }),
  disconnect: () =>
    set({ connectedProvider: null, googleAccessToken: null, lastSyncedAt: null }),
  markSynced: () => set({ lastSyncedAt: new Date() }),
}));
