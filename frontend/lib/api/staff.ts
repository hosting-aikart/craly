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
