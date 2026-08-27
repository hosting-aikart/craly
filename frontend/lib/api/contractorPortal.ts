import { apiGet, apiPost, apiDelete, apiUpload } from '@/lib/api';

export interface Opportunity {
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
  status: string;
  created_at: string;
  published_at: string | null;
  has_applied: boolean;
  match_score?: number;
  match_level?: 'HIGH' | 'MEDIUM' | 'LOW';
  match_reasons?: string[];
  my_application_id?: string | null;
  my_application_status?: string | null;
  my_application_submitted_at?: string | null;
}

export interface ApplicationInput {
  proposedWorkforce: number;
  availabilityDate: string;
  relevantExperience?: string;
  message?: string;
  proposedRate?: number;
}

export interface ApplicationItem {
  id: string;
  requirement_id: string;
  proposed_workforce: number;
  availability_date: string;
  relevant_experience: string | null;
  message: string | null;
  proposed_rate: number | null;
  application_status: 'SUBMITTED' | 'UNDER_REVIEW' | 'SHORTLISTED' | 'SELECTED' | 'REJECTED' | 'CLOSED';
  submitted_at: string;
  last_updated_at: string;
  requirement_title: string;
  requirement_description?: string | null;
  requirement_location: string;
  requirement_industry: string | null;
  requirement_workers_required: number;
  requirement_start_date?: string;
  requirement_duration?: string;
  requirement_status: string;
}

export interface ContractorDashboardStats {
  opportunitiesCount: number;
  activeApplicationsCount: number;
  selectedApplicationsCount: number;
}

export const getOpportunities = () =>
  apiGet<{ data: Opportunity[] }>('/contractor-portal/opportunities');

export const getOpportunityById = (id: string) =>
  apiGet<{ data: Opportunity }>(`/contractor-portal/opportunities/${id}`);

export const applyToOpportunity = (id: string, input: ApplicationInput) =>
  apiPost<{ data: { id: string; status: string; message: string } }>(`/contractor-portal/opportunities/${id}/apply`, input);

export const getMyApplications = () =>
  apiGet<{ data: ApplicationItem[] }>('/contractor-portal/applications');

export const getApplicationById = (id: string) =>
  apiGet<{ data: ApplicationItem }>(`/contractor-portal/applications/${id}`);

export const getDashboardStats = () =>
  apiGet<{ data: ContractorDashboardStats }>('/contractor-portal/dashboard-stats');

export interface ContractorDocumentItem {
  id: string;
  document_type: 'aadhaar' | 'pan' | 'business_registration' | 'industry_license' | 'safety_certification' | 'other_certificate';
  file_name: string;
  mime_type: string;
  size_bytes: number;
  status: 'pending' | 'approved' | 'rejected' | 'replacement_requested';
  issue_date?: string | null;
  expiry_date?: string | null;
  created_at: string;
  updated_at: string;
}

export const getMyDocuments = () =>
  apiGet<{ data: ContractorDocumentItem[] }>('/contractor-portal/documents');

export const uploadMyDocument = (formData: FormData) =>
  apiUpload<{ data: ContractorDocumentItem }>('/contractor-portal/documents', formData);

export const getMyDocumentSignedUrl = (documentId: string, intent: 'view' | 'download' = 'view') =>
  apiGet<{ data: { url: string; expiresInSeconds: number } }>(`/contractor-portal/documents/${documentId}/signed-url?intent=${intent}`);

export const deleteMyDocument = (documentId: string) =>
  apiDelete<{ data: { id: string; deleted: boolean } }>(`/contractor-portal/documents/${documentId}`);
