import { apiGet } from '@/lib/api';
import type { Category } from './profile';

export interface ContractorListing {
  id: string;
  company_name: string;
  description: string | null;
  city: string | null;
  state: string | null;
  years_experience: number | null;
  workforce_size: number | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  categories: Category[];
}

export interface ContractorListParams {
  page?: number;
  limit?: number;
  city?: string;
  category?: string;
  q?: string;
}

export function listContractors(params: ContractorListParams = {}) {
  const search = new URLSearchParams();
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  if (params.city) search.set('city', params.city);
  if (params.category) search.set('category', params.category);
  if (params.q) search.set('q', params.q);

  const qs = search.toString();
  return apiGet<{ data: ContractorListing[]; page: number; limit: number }>(
    `/contractors${qs ? `?${qs}` : ''}`,
  );
}

export const listCategories = () => apiGet<{ data: Category[] }>('/categories');
