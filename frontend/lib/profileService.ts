import { getStoredToken, clearAuthData } from './supabase';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export interface Profile {
  id: string;
  name: string;
  state: string;
  income_bracket: string;
  family_size: number;
  child_ages: number[];
  education_level: string;
  field_of_study: string;
  skills: string[];
  hours_per_week: number;
  childcare_needed: boolean;
  updated_at?: string;
}

export async function getAccessToken(): Promise<string | null> {
  return getStoredToken();
}

async function authedFetch(path: string, options?: RequestInit) {
  const token = await getStoredToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function fetchProfile(): Promise<Profile | null> {
  try {
    return await authedFetch('/profile');
  } catch {
    return null;
  }
}

export async function upsertProfile(updates: Partial<Omit<Profile, 'id'>>): Promise<Profile> {
  return authedFetch('/profile', { method: 'PUT', body: JSON.stringify(updates) });
}

export async function signOut(): Promise<void> {
  await clearAuthData();
}

export async function changePassword(_newPassword: string): Promise<void> {
  throw new Error('Change password not supported yet');
}
