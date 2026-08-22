import { apiGet, apiPatch, apiPost } from '@/lib/api';

// Settled onto one lifecycle during the contractor-architecture
// reconciliation — see docs/open-decisions.md. Matches the DB check
// constraint on inquiries.status exactly.
export type EnquiryStatus =
  | 'NEW'
  | 'UNDER_REVIEW'
  | 'BROKERING'
  | 'CONTACTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'WON'
  | 'LOST'
  | 'CLOSED_EXPIRED'
  | 'DECLINED';

export interface Enquiry {
  id: string;
  business_id: string;
  contractor_id: string;
  category_id: number | null;
  category_name: string | null;
  location: string | null;
  workers_required: number | null;
  start_date: string | null;
  duration: string | null;
  message: string;
  status: EnquiryStatus;
  status_reason?: string | null;
  /** The other party's company name — present on list rows. */
  other_party_name?: string;
  has_unread?: boolean;
  created_at: string;
  updated_at: string;
}

export interface EnquiryDetail extends Enquiry {
  business_name: string;
  business_city: string | null;
  business_state: string | null;
  business_user_id: string;
  contractor_name: string;
  contractor_user_id: string;
}

export interface EnquiryMessage {
  id: string;
  inquiry_id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface CreateEnquiryInput {
  contractorId: string;
  categoryId?: number;
  location?: string;
  workersRequired?: number;
  startDate?: string;
  duration?: string;
  message: string;
}

export const createEnquiry = (input: CreateEnquiryInput) =>
  apiPost<{ data: Enquiry }>('/enquiries', input);

export const listEnquiries = () => apiGet<{ data: Enquiry[] }>('/enquiries');

export const getEnquiry = (id: string) => apiGet<{ data: EnquiryDetail }>(`/enquiries/${id}`);

export const acceptEnquiry = (id: string) =>
  apiPatch<{ data: EnquiryDetail }>(`/enquiries/${id}/accept`, {});

export const declineEnquiry = (id: string, reason?: string) =>
  apiPatch<{ data: EnquiryDetail }>(`/enquiries/${id}/decline`, { reason });

export const closeEnquiry = (id: string) =>
  apiPatch<{ data: { id: string; status: EnquiryStatus } }>(`/enquiries/${id}/status`, { status: 'CLOSED_EXPIRED' });

export const listMessages = (id: string) => apiGet<{ data: EnquiryMessage[] }>(`/enquiries/${id}/messages`);

export const sendMessage = (id: string, message: string) =>
  apiPost<{ data: EnquiryMessage }>(`/enquiries/${id}/messages`, { message });
