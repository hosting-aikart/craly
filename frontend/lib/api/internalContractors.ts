import { apiGet, apiPatch, apiPost } from '@/lib/api';
import type { Category } from './profile';

// Client for /api/internal/contractors — the staff-managed contractor
// record (Ops Head / Field Staff only). Contractors themselves never call
// any of this; there is no contractor session in Phase 1.

export type ContractorAvailability = 'AVAILABLE' | 'CURRENTLY_AT_CAPACITY' | 'NOT_AVAILABLE' | 'PAUSED' | 'SUSPENDED';

export interface InternalContractor {
  id: string;
  company_name: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  description: string | null;
  notes: string | null;
  years_experience: number | null;
  workforce_size: number | null;
  service_areas: string[] | null;
  overseas_interest: boolean;
  availability: ContractorAvailability;
  availability_note: string | null;
  verification_status: string;
  verification_note: string | null;
  onboarding_complete: boolean;
  created_at: string;
  categories: Category[];
  // Present only if this contractor originated from a
  // contractor_onboarding_requests row — that's what "Submit for Operations
  // Review" operates on (see lib/api/contractorRequests.submitForReview).
  request_id: string | null;
}

export const listInternalContractors = () =>
  apiGet<{ data: InternalContractor[] }>('/internal/contractors');

export const getInternalContractor = (id: string) =>
  apiGet<{ data: InternalContractor }>(`/internal/contractors/${id}`);

export interface UpsertInternalContractorInput {
  companyName?: string;
  phone?: string;
  city?: string;
  serviceAreas?: string[];
  yearsInBusiness?: number;
  workforceCount?: number;
  overseasInterest?: boolean;
  description?: string;
  notes?: string;
  categoryIds?: number[];
}

// Walk-in / directly-met contractors with no prior onboarding request —
// the "+ New Contractor" action on the Contractors list (spec §14 "Create
// contractor: YES").
export const createInternalContractor = (input: UpsertInternalContractorInput) =>
  apiPost<{ data: { id: string } }>('/internal/contractors', input);

export const updateInternalContractor = (id: string, input: UpsertInternalContractorInput) =>
  apiPatch<{ data: { id: string } }>(`/internal/contractors/${id}`, input);

export const updateInternalContractorAvailability = (id: string, availability: ContractorAvailability, note?: string) =>
  apiPatch<{ data: { id: string; availability: ContractorAvailability; availability_note: string | null } }>(
    `/internal/contractors/${id}/availability`,
    { availability, note },
  );
