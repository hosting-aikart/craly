import { apiGet } from '@/lib/api';

export interface FieldStaffActivityItem {
  id: string;
  action: string;
  target_type: string;
  target_id: string;
  created_at: string;
  actor_email?: string;
}

export interface FieldStaffDashboard {
  newRequests: number;
  myPendingRequests: number;
  profilesBeingCompleted: number;
  profilesSubmittedForReview: number;
  recentActivity: FieldStaffActivityItem[];
  scope: 'mine' | 'team';
}

// Real backend-sourced counts only — no fabricated stats (spec §2).
export const getFieldStaffDashboard = () =>
  apiGet<{ data: FieldStaffDashboard }>('/field-staff/dashboard');

export interface MyActivityItem {
  id: string;
  action: string;
  target_type: string;
  target_id: string;
  reason: string | null;
  created_at: string;
}

export const getMyActivity = (page = 1) =>
  apiGet<{ data: MyActivityItem[]; total: number; page: number; limit: number }>(`/field-staff/activity?page=${page}`);
