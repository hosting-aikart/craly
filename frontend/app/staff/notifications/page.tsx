'use client';

import React, { useEffect, useState } from 'react';
import { getStaffNotifications } from '@/lib/api/staff';
import LoadingState from '@/components/ui/LoadingState';
import EmptyState from '@/components/ui/EmptyState';
import './staff-notifications.css';

export default function StaffNotificationsPage() {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    reference_id: string | null;
    is_read: boolean;
    created_at: string;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStaffNotifications()
      .then(({ data }) => setNotifications(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingState label="Loading Notifications…" />;
  }

  return (
    <div className="staff-notifications-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff System Notifications</h1>
          <p className="page-subtitle">
            Receive operational alerts when a Manufacturer selects a Contractor or submits a requirement.
          </p>
        </div>
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon="🔔"
          title="No Notifications"
          subtitle="There are no system notifications for Craly Staff at this time."
        />
      ) : (
        <div className="notifications-list">
          {notifications.map((n) => (
            <div key={n.id} className={`notification-card ${!n.is_read ? 'notification-card--unread' : ''}`}>
              <div className="notification-icon">🔔</div>
              <div className="notification-content">
                <div className="notification-header">
                  <h3 className="notification-title">{n.title}</h3>
                  <span className="notification-time">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="notification-message">{n.message}</p>
                {n.reference_id && (
                  <span className="notification-ref">Ref ID: {n.reference_id}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
