import { getAccessToken } from './profileService';
import { clearAuthData } from './supabase';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });
  if (res.status === 401) {
    // Token is invalid or expired — clear stored credentials and force re-login
    await clearAuthData();
    const { useAuthStore } = await import('@/store/authStore');
    useAuthStore.getState().clearAuth();
    throw new Error('Session expired. Please sign in again.');
  }
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

export const api = {
  // Profile
  getProfile: () => request<UserProfile>('/profile'),
  updateProfile: (data: Partial<UserProfile>) =>
    request<UserProfile>('/profile', { method: 'PUT', body: JSON.stringify(data) }),

  // EduPath
  analyzeEducation: () => request('/agents/edupath/analyze', { method: 'POST' }),
  getEducationPlan: () => request('/agents/edupath/plan'),

  // FundFinder
  searchFunding: () => request('/agents/fundfinder/search', { method: 'POST' }),
  getFundingOpportunities: () => request('/agents/fundfinder/opportunities'),
  confirmFundingApplication: (id: string) =>
    request(`/agents/fundfinder/confirm/${id}`, { method: 'POST' }),
  autoApplyFundingPreview: (url: string) =>
    request('/agents/fundfinder/auto-apply/preview', { method: 'POST', body: JSON.stringify({ url }) }),
  autoApplyFundingSubmit: (url: string, filled_values: any[]) =>
    request('/agents/fundfinder/auto-apply/submit', { method: 'POST', body: JSON.stringify({ url, filled_values }) }),

  // CareerBoost
  searchJobs: () => request('/agents/careerboost/search', { method: 'POST' }),
  getJobs: () => request('/agents/careerboost/jobs'),
  confirmJobApplication: (id: string) =>
    request(`/agents/careerboost/confirm/${id}`, { method: 'POST' }),
  autoApplyJobPreview: (url: string) =>
    request('/agents/careerboost/auto-apply/preview', { method: 'POST', body: JSON.stringify({ url }) }),
  autoApplyJobSubmit: (url: string, filled_values: any[]) =>
    request('/agents/careerboost/auto-apply/submit', { method: 'POST', body: JSON.stringify({ url, filled_values }) }),

  // WellnessGuide
  startCheckin: () => request('/agents/wellness/checkin', { method: 'POST' }),
  getWellnessHistory: () => request('/agents/wellness/history'),

  // Therapist Listings
  getTherapists: (params?: { specialty?: string; max_price?: number; insurance_only?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.specialty) qs.set('specialty', params.specialty);
    if (params?.max_price != null) qs.set('max_price', String(params.max_price));
    if (params?.insurance_only) qs.set('insurance_only', 'true');
    return request<{ therapists: Therapist[]; total: number }>(`/agents/wellness/therapists/list?${qs}`);
  },
  searchTherapists: (q: string) =>
    request<{ therapists: Therapist[] }>(`/agents/wellness/therapists/search?q=${encodeURIComponent(q)}`),

  // Chat (Axo)
  chat: (message: string) =>
    request<{ reply: string }>('/chat/message', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  // Calendar
  getEvents: () => request('/calendar/events'),
};

export interface Therapist {
  id: string;
  name: string;
  title: string;
  platform: string;
  specialties: string[];
  price_per_session: number;
  accepts_insurance: boolean;
  telehealth: boolean;
  bio: string;
  booking_url: string;
  next_available: string;
  years_experience: number;
  rating: number;
}

export interface UserProfile {
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
}
