import { apiGet, apiPatch } from '@/lib/api';

export type NotificationType = 'enquiry_received' | 'enquiry_message';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

export const listNotifications = () =>
  apiGet<{ data: AppNotification[]; unreadCount: number }>('/notifications');

export const markNotificationRead = (id: string) =>
  apiPatch<{ data: { id: string; is_read: boolean } }>(`/notifications/${id}/read`, {});

export const markAllNotificationsRead = () =>
  apiPatch<{ data: { success: true } }>('/notifications/read-all', {});
