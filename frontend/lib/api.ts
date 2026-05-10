import { getAccessToken } from './profileService';

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

  // Chat (Axo)
  chat: (message: string) =>
    request<{ reply: string }>('/chat/message', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  // Calendar
  getEvents: () => request('/calendar/events'),
};

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
