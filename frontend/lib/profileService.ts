/**
 * Profile CRUD goes directly through the Supabase client.
 * RLS on users_profile guarantees each user can only read/write their own row.
 */
import { supabase } from './supabase';

export interface Profile {
  user_id: string;
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

export async function fetchProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('users_profile')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function upsertProfile(updates: Partial<Omit<Profile, 'user_id'>>): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('users_profile')
    .upsert(
      { ...updates, user_id: user.id, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function changePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

/** Returns the current session's access token for FastAPI requests. */
export async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}
