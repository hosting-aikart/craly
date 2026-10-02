import { apiGet, apiDelete, apiUpload } from '@/lib/api';

export interface WorksitePhotoItem {
  id: string;
  contractorId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  caption: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  url: string;
}

export interface WorksitePhotosResponse {
  data: WorksitePhotoItem[];
  meta: {
    count: number;
    max: number;
    remaining: number;
  };
}

export const getWorksitePhotos = () =>
  apiGet<WorksitePhotosResponse>('/contractor-portal/worksite-photos');

export const uploadWorksitePhotos = (formData: FormData) =>
  apiUpload<WorksitePhotosResponse>('/contractor-portal/worksite-photos', formData);

export const deleteWorksitePhoto = (photoId: string) =>
  apiDelete<{
    data: { id: string; deleted: boolean };
    meta: { count: number; max: number; remaining: number };
  }>(`/contractor-portal/worksite-photos/${photoId}`);
