import { create } from 'zustand';
import { Profile, fetchProfile, upsertProfile } from '@/lib/profileService';

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  load: () => Promise<void>;
  save: (updates: Partial<Omit<Profile, 'id'>>) => Promise<void>;
  clear: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  loading: false,

  load: async () => {
    set({ loading: true });
    try {
      const profile = await fetchProfile();
      set({ profile });
    } catch (e) {
      console.error('[profileStore] load failed:', e);
    } finally {
      set({ loading: false });
    }
  },

  save: async (updates) => {
    const saved = await upsertProfile(updates);
    set({ profile: saved });
  },

  clear: () => set({ profile: null }),
}));
