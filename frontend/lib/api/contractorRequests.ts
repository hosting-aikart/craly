import { apiGet, apiPatch, apiPost } from '@/lib/api';

export type ContractorRequestStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'PROFILE_IN_PROGRESS'
  | 'SUBMITTED_FOR_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CLOSED';

export interface ContractorRequestActivity {
  id: string;
  action: string;
  reason: string | null;
  target_type: string;
  created_at: string;
  actor_email: string;
}

export interface ContractorRequest {
  id: string;
  company_name: string;
  contact_person: string;
  phone: string;
  email: string | null;
  city: string;
  industry: string;
  workforce_count: number | null;
  skills: string | null;
  years_experience: number | null;
  message: string | null;
  status: ContractorRequestStatus;
  staff_notes: string | null;
  contractor_profile_id: string | null;
  assigned_to: string | null;
  assigned_to_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractorRequestDetail extends ContractorRequest {
  activity: ContractorRequestActivity[];
}

export interface CreateContractorRequestInput {
  companyName: string;
  contactPerson: string;
  phone: string;
  email?: string;
  city: string;
  industry: string;
  workforceCount?: number;
  skills?: string;
  yearsExperience?: number;
  message?: string;
}

// Public — no auth. This is the entire contractor-side entry point in
// Phase 1; there is no signup/login for contractors.
export const createContractorRequest = (input: CreateContractorRequestInput) =>
  apiPost<{ data: { id: string } }>('/contractor-requests', input);

// Everything below is Field Staff / Ops Head / Admin only.
export const listContractorRequests = (status?: ContractorRequestStatus) =>
  apiGet<{ data: ContractorRequest[] }>(`/contractor-requests${status ? `?status=${status}` : ''}`);

export const getContractorRequest = (id: string) =>
  apiGet<{ data: ContractorRequestDetail }>(`/contractor-requests/${id}`);

export const updateContractorRequestStatus = (id: string, status: ContractorRequestStatus, staffNotes?: string) =>
  apiPatch<{ data: ContractorRequest }>(`/contractor-requests/${id}/status`, { status, staffNotes });

export const startContractorProfile = (id: string) =>
  apiPost<{ data: { contractorProfileId: string } }>(`/contractor-requests/${id}/start-profile`, {});

// "Complete Data Collection" -> "Submit for Operations Review" (spec §12).
// Server validates the linked profile is actually complete before accepting.
export const submitForReview = (id: string) =>
  apiPost<{ data: { requestId: string; contractorId: string; status: 'SUBMITTED_FOR_REVIEW' } }>(
    `/contractor-requests/${id}/submit-for-review`,
    {},
  );
