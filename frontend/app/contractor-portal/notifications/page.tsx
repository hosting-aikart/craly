'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
} from '@/lib/api/notifications';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import { relativeTime } from '@/lib/util/relativeTime';
import './contractor-notifications.css';

function iconFor(type: string): string {
  if (type.startsWith('APPLICATION')) return '📥';
  if (type.startsWith('KYC') || type.startsWith('CONTRACTOR_VERIFICATION')) return '🛡️';
  if (type.includes('OPPORTUNITY')) return '🎯';
  return '🔔';
}

/**
 * Reuses the same shared /api/notifications endpoint every role already
 * uses (see lib/api/notifications.ts) — the generic /notifications page
 * redirects every role to its own workspace-styled notifications page
 * (admin/staff/business already had one; contractor didn't, so clicking
 * "Notifications" in the sidebar was bouncing straight to the dashboard).
 */
export default function ContractorNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listNotifications()
      .then(({ data }) => setNotifications(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleClick = (n: AppNotification) => {
    if (!n.is_read) {
      markNotificationRead(n.id).catch(() => {});
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    }
    if (!n.reference_id) return;
    if (n.type.startsWith('APPLICATION')) {
      router.push(`/contractor-portal/applications/${n.reference_id}`);
    } else if (n.type.startsWith('KYC') || n.type.startsWith('CONTRACTOR_VERIFICATION')) {
      router.push('/contractor-portal/profile?tab=documents');
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((x) => ({ ...x, is_read: true })));
    await markAllNotificationsRead().catch(() => {});
  };

  if (loading) {
    return <LoadingState label="Loading Notifications…" />;
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="contractor-notifications-page">
      <div className="contractor-notifications-header">
        <div>
          <h1 className="contractor-notifications-title">Notifications</h1>
          <p className="contractor-notifications-subtitle">
            Opportunity matches, application status changes, and KYC/document verification updates.
          </p>
        </div>
        {unreadCount > 0 && (
          <button type="button" className="contractor-notifications-mark-all" onClick={handleMarkAllRead}>
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState icon="🔔" title="No notifications yet" subtitle="You'll see opportunity matches and application updates here." />
      ) : (
        <div className="contractor-notifications-list">
          {notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              className={`contractor-notification-card ${!n.is_read ? 'contractor-notification-card--unread' : ''}`}
              onClick={() => handleClick(n)}
            >
              <span className="contractor-notification-icon">{iconFor(n.type)}</span>
              <span className="contractor-notification-body">
                <span className="contractor-notification-top">
                  <span className="contractor-notification-title">{n.title}</span>
                  <span className="contractor-notification-time">{relativeTime(n.created_at)}</span>
                </span>
                <p className="contractor-notification-message">{n.message}</p>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
