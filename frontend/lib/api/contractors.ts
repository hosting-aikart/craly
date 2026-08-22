import { apiGet } from '@/lib/api';
import type { Category } from './profile';
export type { Category };

export interface ContractorListing {
  id: string;
  company_name: string;
  description: string | null;
  city: string | null;
  state: string | null;
  years_experience: number | null;
  workforce_size: number | null;
  categories: Category[];
}

export type ContractorDetail = ContractorListing;

export interface ContractorListParams {
  page?: number;
  limit?: number;
  city?: string;
  state?: string;
  category?: string;
  q?: string;
  minExperience?: number;
  minWorkforce?: number;
  minWorkers?: number;
}

export function listContractors(params: ContractorListParams = {}) {
  const search = new URLSearchParams();
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  if (params.city) search.set('city', params.city);
  if (params.state) search.set('state', params.state);
  if (params.category) search.set('category', params.category);
  if (params.q) search.set('q', params.q);
  if (params.minExperience) search.set('minExperience', String(params.minExperience));
  if (params.minWorkforce || params.minWorkers) search.set('minWorkforce', String(params.minWorkforce || params.minWorkers));

  const qs = search.toString();
  return apiGet<{ data: ContractorListing[]; page: number; limit: number }>(
    `/contractors${qs ? `?${qs}` : ''}`,
  );
}

export const getContractor = (id: string) => apiGet<{ data: ContractorDetail }>(`/contractors/${id}`);

export const listCategories = () => apiGet<{ data: Category[] }>('/categories');
