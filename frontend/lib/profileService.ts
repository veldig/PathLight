import { supabase } from './supabase';

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

export async function fetchProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function upsertProfile(updates: Partial<Omit<Profile, 'id'>>): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      { ...updates, id: user.id, updated_at: new Date().toISOString() },
      { onConflict: 'id' },
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

export async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}
