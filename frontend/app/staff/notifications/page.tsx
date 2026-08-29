'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { getStaffNotifications } from '@/lib/api/staff';
import { markNotificationRead } from '@/lib/api/notifications';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import { IconBell, IconArrowRight } from '@/components/ui/Icons';
import './staff-notifications.css';

interface StaffNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

export default function StaffNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<StaffNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStaffNotifications()
      .then(({ data }) => setNotifications(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleClick = (n: StaffNotification) => {
    if (!n.is_read) {
      markNotificationRead(n.id).catch(() => {});
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    }
    // CONTRACTOR_SELECTED's reference_id is the application id — that's
    // exactly what the engagements list is keyed on.
    if (n.type === 'CONTRACTOR_SELECTED') {
      router.push('/staff/engagements');
    }
  };

  if (loading) {
    return <LoadingState label="Loading Notifications…" />;
  }

  return (
    <div className="staff-notifications-page">
      <WorkspacePageHeader
        title="Staff System Notifications"
        subtitle="Operational alerts for manufacturer contractor selections, requirement submissions, and verification queues."
      />

      {notifications.length === 0 ? (
        <EmptyState
          icon={<IconBell size={32} />}
          title="No Notifications"
          subtitle="There are no system notifications for Craly Staff at this time."
        />
      ) : (
        <div className="notifications-list">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`notification-card ${!n.is_read ? 'notification-card--unread' : ''}`}
              onClick={() => handleClick(n)}
              style={{ cursor: n.type === 'CONTRACTOR_SELECTED' ? 'pointer' : 'default' }}
            >
              <div className={`notification-icon-wrapper ${!n.is_read ? 'notification-icon-wrapper--unread' : ''}`}>
                <IconBell size={18} />
              </div>
              <div className="notification-content">
                <div className="notification-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 className="notification-title">{n.title}</h3>
                    {!n.is_read && <span className="notification-unread-dot" />}
                  </div>
                  <span className="notification-time">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="notification-message">{n.message}</p>
                <div className="notification-meta-row">
                  {n.reference_id && (
                    <span className="notification-ref">Ref ID: {n.reference_id}</span>
                  )}
                  {n.type === 'CONTRACTOR_SELECTED' && (
                    <button type="button" className="notification-action-btn">
                      View Engagement <IconArrowRight size={12} style={{ marginLeft: 3 }} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
