import { apiGet, apiPatch } from '@/lib/api';

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface ContractorProfile {
  role: 'contractor';
  id: string;
  company_name: string;
  description: string | null;
  city: string | null;
  state: string | null;
  years_experience: number | null;
  workforce_size: number | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  verification_note: string | null;
  onboarding_complete: boolean;
  categories: Category[];
}

export interface BusinessProfile {
  role: 'business';
  id: string;
  company_name: string;
  industry: string | null;
  city: string | null;
  state: string | null;
  onboarding_complete: boolean;
}

// Field Staff / Ops Head — no company profile, just internal account info
// (spec §1 "Profile" section). Read-only in Phase 1.
export interface StaffProfile {
  role: 'field_staff' | 'ops_head';
  id: string;
  email: string;
  created_at: string;
  onboarding_complete: true;
}

export type MyProfile = ContractorProfile | BusinessProfile | StaffProfile;

export const getMyProfile = () => apiGet<{ data: MyProfile }>('/profile/me');

export interface ContractorProfileUpdate {
  companyName?: string;
  description?: string;
  city?: string;
  state?: string;
  yearsExperience?: number;
  workforceSize?: number;
  categoryIds?: number[];
}

export interface BusinessProfileUpdate {
  companyName?: string;
  industry?: string;
  city?: string;
  state?: string;
}

export const updateMyProfile = (input: ContractorProfileUpdate | BusinessProfileUpdate) =>
  apiPatch<{ data: { id: string } }>('/profile/me', input);
