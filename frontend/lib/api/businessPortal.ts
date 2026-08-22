import { apiGet, apiPost, apiPatch } from '@/lib/api';

export interface RequirementItem {
  id: string;
  title: string;
  description: string | null;
  industry: string | null;
  location: string;
  workers_required: number;
  required_skills: string[];
  start_date: string;
  duration: string;
  experience_required: number | null;
  budget_min: number | null;
  budget_max: number | null;
  status: 'DRAFT' | 'PUBLISHED' | 'APPLICATIONS_OPEN' | 'SELECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED';
  created_at: string;
  published_at: string | null;
  updated_at: string;
  applications_count: number;
}

export interface CreateRequirementInput {
  title: string;
  description?: string;
  industry?: string;
  location: string;
  workersRequired: number;
  requiredSkills?: string[] | string;
  startDate: string;
  duration: string;
  experienceRequired?: number | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  action?: 'draft' | 'publish';
}

export interface ApplicationReceived {
  id: string;
  requirement_id: string;
  contractor_id: string;
  proposed_workforce: number;
  availability_date: string;
  relevant_experience: string | null;
  message: string | null;
  proposed_rate: number | null;
  application_status: 'SUBMITTED' | 'UNDER_REVIEW' | 'SHORTLISTED' | 'SELECTED' | 'REJECTED' | 'CLOSED';
  submitted_at: string;
  last_updated_at: string;
  contractor_name: string;
  contractor_city?: string | null;
  contractor_state?: string | null;
  contractor_services?: string[] | null;
  contractor_experience_years?: number | null;
  requirement_title?: string;
  requirement_location?: string;
  requirement_workers_required?: number;
  requirement_status?: string;
  requirement_description?: string | null;
  requirement_industry?: string | null;
  requirement_required_skills?: string[] | null;
  requirement_start_date?: string;
  requirement_duration?: string;
}

export interface BusinessDashboardStats {
  activeRequirements: number;
  applicationsReceived: number;
  selectedContractors: number;
  recentActivity: Array<{
    type: string;
    id: string;
    title: string;
    status: string;
    timestamp: string;
  }>;
}

export const getBusinessDashboardStats = () =>
  apiGet<{ data: BusinessDashboardStats }>('/business-portal/dashboard-stats');

export const getBusinessRequirements = (status?: string) =>
  apiGet<{ data: RequirementItem[] }>(`/business-portal/requirements${status ? `?status=${encodeURIComponent(status)}` : ''}`);

export const getBusinessRequirementById = (id: string) =>
  apiGet<{ data: RequirementItem }>(`/business-portal/requirements/${id}`);

export const createBusinessRequirement = (input: CreateRequirementInput) =>
  apiPost<{ data: RequirementItem; message: string }>('/business-portal/requirements', input);

export const updateBusinessRequirement = (id: string, input: Partial<CreateRequirementInput>) =>
  apiPatch<{ data: RequirementItem; message: string }>(`/business-portal/requirements/${id}`, input);

export const publishBusinessRequirement = (id: string) =>
  apiPost<{ data: RequirementItem; message: string }>(`/business-portal/requirements/${id}/publish`, {});

export const getRequirementApplications = (requirementId: string) =>
  apiGet<{ data: ApplicationReceived[] }>(`/business-portal/requirements/${requirementId}/applications`);

export const getAllApplications = (params?: { requirement_id?: string; status?: string }) => {
  const query = new URLSearchParams();
  if (params?.requirement_id) query.set('requirement_id', params.requirement_id);
  if (params?.status) query.set('status', params.status);
  const qStr = query.toString();
  return apiGet<{ data: ApplicationReceived[] }>(`/business-portal/applications${qStr ? `?${qStr}` : ''}`);
};

export const getApplicationById = (id: string) =>
  apiGet<{ data: ApplicationReceived }>(`/business-portal/applications/${id}`);

export const updateApplicationStatus = (id: string, status: 'UNDER_REVIEW' | 'SHORTLISTED' | 'SELECTED' | 'REJECTED') =>
  apiPatch<{ data: { id: string; status: string }; message: string }>(`/business-portal/applications/${id}/status`, { status });
