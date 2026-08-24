import { apiGet, apiPost, apiPatch } from '@/lib/api';

export interface StaffDashboardStats {
  totalContractors: number;
  recentlyAddedCount: number;
  pendingEngagementsCount: number;
  unreadNotificationsCount: number;
  recentContractors: Array<{
    id: string;
    company_name: string;
    city: string | null;
    state: string | null;
    workforce_size: number | null;
    availability: string;
    created_at: string;
  }>;
  recentNotifications: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    reference_id: string | null;
    is_read: boolean;
    created_at: string;
  }>;
}

export interface StaffContractorItem {
  id: string;
  company_name: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  workforce_size: number | null;
  years_experience: number | null;
  availability: string;
  availability_note: string | null;
  verification_status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateStaffContractorInput {
  companyName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  industry?: string;
  description?: string;
  city?: string;
  state?: string;
  workforceSize?: number;
  yearsExperience?: number;
  skills?: string[];
  serviceAreas?: string[];
  availability?: 'AVAILABLE' | 'CURRENTLY_AT_CAPACITY' | 'NOT_AVAILABLE' | 'PAUSED' | 'SUSPENDED';
  availabilityNote?: string;
  notes?: string;
}

export interface StaffContractorDetail extends StaffContractorItem {
  description: string | null;
  service_areas: string[] | null;
  verification_note: string | null;
  overall_rating: number | null;
}

export interface StaffEngagementItem {
  application_id: string;
  application_status: 'SUBMITTED' | 'UNDER_REVIEW' | 'SHORTLISTED' | 'SELECTED' | 'CONTACTING' | 'IN_DISCUSSION' | 'CONFIRMED' | 'CLOSED' | 'REJECTED';
  proposed_workforce: number;
  availability_date: string;
  proposed_rate: number | null;
  selection_date: string;
  requirement_id: string;
  requirement_title: string;
  requirement_location: string;
  requirement_workers_required: number;
  manufacturer_name: string;
  manufacturer_city: string | null;
  contractor_id: string;
  contractor_name: string;
  contractor_phone: string | null;
}

export interface StaffVerificationContractorItem {
  id: string;
  company_name: string;
  city: string | null;
  state: string | null;
  phone: string | null;
  verification_status: string;
  verification_note: string | null;
  created_at: string;
  user_id: string | null;
  user_email: string | null;
  pending_docs_count: number;
  total_docs_count: number;
  last_submitted_at: string | null;
}

export interface StaffVerificationDocumentItem {
  id: string;
  document_type: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  status: 'pending' | 'approved' | 'rejected' | 'replacement_requested';
  issue_date: string | null;
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
  reviewer_note: string | null;
}

export interface StaffVerificationDetail {
  contractor: {
    id: string;
    company_name: string;
    phone: string | null;
    city: string | null;
    state: string | null;
    industry: string | null;
    workforce_size: number | null;
    years_experience: number | null;
    verification_status: string;
    verification_note: string | null;
    last_verified_at: string | null;
    created_at: string;
    user_id: string | null;
    user_email: string | null;
    description: string | null;
    skills: string[] | null;
    service_areas: string[] | null;
  };
  documents: StaffVerificationDocumentItem[];
  reviewHistory: Array<{
    id: string;
    status: string;
    notes: string | null;
    created_at: string;
    reviewer_email: string | null;
  }>;
}

export const getStaffDashboardStats = () =>
  apiGet<{ data: StaffDashboardStats }>('/staff/dashboard-stats');

export const getStaffContractors = (params?: { q?: string; city?: string; availability?: string; page?: number; limit?: number }) => {
  const query = new URLSearchParams();
  if (params?.q) query.set('q', params.q);
  if (params?.city) query.set('city', params.city);
  if (params?.availability) query.set('availability', params.availability);
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());
  const str = query.toString();
  return apiGet<{ data: StaffContractorItem[]; pagination: { total: number; page: number; limit: number; totalPages: number } }>(
    `/staff/contractors${str ? `?${str}` : ''}`,
  );
};

export const createStaffContractor = (input: CreateStaffContractorInput) =>
  apiPost<{ data: StaffContractorItem; message: string }>('/staff/contractors', input);

export const getStaffContractorById = (id: string) =>
  apiGet<{ data: StaffContractorDetail }>(`/staff/contractors/${id}`);

export const updateStaffContractor = (id: string, input: Partial<CreateStaffContractorInput>) =>
  apiPatch<{ data: StaffContractorDetail; message: string }>(`/staff/contractors/${id}`, input);

export const getStaffEngagements = () =>
  apiGet<{ data: StaffEngagementItem[] }>('/staff/engagements');

export const updateStaffEngagementStatus = (id: string, status: string) =>
  apiPatch<{ data: { id: string; status: string }; message: string }>(`/staff/engagements/${id}/status`, { status });

export const getStaffNotifications = () =>
  apiGet<{ data: Array<{ id: string; type: string; title: string; message: string; reference_id: string | null; is_read: boolean; created_at: string }> }>(
    '/staff/notifications',
  );

export const getStaffVerificationContractors = (status?: string) =>
  apiGet<{ data: StaffVerificationContractorItem[] }>(`/staff/verification/contractors${status ? `?status=${status}` : ''}`);

export const getStaffVerificationContractorById = (id: string) =>
  apiGet<{ data: StaffVerificationDetail }>(`/staff/verification/contractors/${id}`);

export const getStaffDocumentSignedUrl = (contractorId: string, documentId: string, intent: 'view' | 'download' = 'view') =>
  apiGet<{ data: { url: string; expiresInSeconds: number } }>(
    `/staff/verification/contractors/${contractorId}/documents/${documentId}/signed-url?intent=${intent}`,
  );

export const reviewStaffDocument = (
  contractorId: string,
  documentId: string,
  decision: 'approved' | 'rejected' | 'replacement_requested',
  note?: string,
) =>
  apiPatch<{ data: { document: { id: string; status: string }; overallContractorStatus: string } }>(
    `/staff/verification/contractors/${contractorId}/documents/${documentId}/review`,
    { decision, note },
  );

export const updateStaffContractorVerificationStatus = (contractorId: string, status: string, note?: string) =>
  apiPatch<{ data: { id: string; verification_status: string; verification_note: string | null } }>(
    `/staff/verification/contractors/${contractorId}/status`,
    { status, note },
  );
