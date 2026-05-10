import { clearAuth, getToken } from './auth';
import { api, UserProfile } from './api';

export type Profile = UserProfile;

export async function getAccessToken(): Promise<string | null> {
  return getToken();
}

export async function fetchProfile(): Promise<Profile> {
  return api.getProfile();
}

export async function upsertProfile(updates: Partial<Omit<Profile, 'id'>>): Promise<Profile> {
  return api.updateProfile(updates);
}

export async function changePassword(newPassword: string): Promise<void> {
  await api.changePassword(newPassword);
}

export async function signOut(): Promise<void> {
  await clearAuth();
}
