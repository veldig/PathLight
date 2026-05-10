import { getToken } from './auth';
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
