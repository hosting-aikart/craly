'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
} from '@/lib/api/notifications';
import { relativeTime } from '@/lib/util/relativeTime';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { IconBell, IconCheck } from '@/components/ui/Icons';
import './admin-notifications.css';

type FilterTab = 'ALL' | 'UNREAD';

export default function AdminNotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number; opacity: number }>({
    left: 4,
    width: 0,
    opacity: 0,
  });
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  useEffect(() => {
    listNotifications()
      .then(({ data, unreadCount: count }) => {
        setNotifications(data);
        setUnreadCount(count);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const updateIndicator = () => {
      const activeEl = tabRefs.current[activeTab];
      if (activeEl) {
        setIndicatorStyle({
          left: activeEl.offsetLeft,
          width: activeEl.offsetWidth,
          opacity: 1,
        });
      }
    };

    updateIndicator();
    const timeout = setTimeout(updateIndicator, 50);
    window.addEventListener('resize', updateIndicator);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [activeTab, notifications]);

  const handleClick = (n: AppNotification) => {
    if (!n.is_read) {
      markNotificationRead(n.id).catch(() => {});
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((x) => ({ ...x, is_read: true })));
    setUnreadCount(0);
    await markAllNotificationsRead().catch(() => {});
  };

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'UNREAD') {
      return notifications.filter((n) => !n.is_read);
    }
    return notifications;
  }, [notifications, activeTab]);

  return (
    <div className="admin-notifications-container">
      <WorkspacePageHeader
        title="Admin Notifications Center"
        subtitle="Platform moderation alerts, contractor verification requests, and administrative notifications."
      />

      {/* Toolbar: Sliding Filter Tabs on Left, Mark All Read on Right */}
      <div className="admin-notif-toolbar">
        <div className="admin-notif-tabs">
          <div
            className="admin-notif-sliding-indicator"
            style={{
              transform: `translateX(${indicatorStyle.left}px)`,
              width: `${indicatorStyle.width}px`,
              opacity: indicatorStyle.opacity,
            }}
          />
          <button
            type="button"
            ref={(el) => { tabRefs.current['ALL'] = el; }}
            className={`admin-notif-tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveTab('ALL')}
          >
            All Alerts ({notifications.length})
          </button>
          <button
            type="button"
            ref={(el) => { tabRefs.current['UNREAD'] = el; }}
            className={`admin-notif-tab-btn ${activeTab === 'UNREAD' ? 'active' : ''}`}
            onClick={() => setActiveTab('UNREAD')}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {unreadCount > 0 ? (
          <button type="button" className="admin-mark-read-btn" onClick={handleMarkAllRead}>
            <IconCheck size={13} /> Mark all as read
          </button>
        ) : (
          <button type="button" className="admin-mark-read-btn admin-mark-read-btn--disabled" disabled>
            <IconCheck size={13} /> All caught up
          </button>
        )}
      </div>

      {loading ? (
        <LoadingState label="Loading admin notifications…" />
      ) : filteredNotifications.length === 0 ? (
        <EmptyState
          icon={<IconBell size={32} />}
          title="No notifications found"
          subtitle={activeTab === 'UNREAD' ? "You've read all your notifications." : "You're all caught up with administrative alerts."}
        />
      ) : (
        <div className="admin-notifications-list">
          {filteredNotifications.map((n) => (
            <div
              key={n.id}
              className={`admin-notif-card ${!n.is_read ? 'admin-notif-card--unread' : ''}`}
              onClick={() => handleClick(n)}
            >
              <div className="admin-notif-icon-box">
                <IconBell size={18} />
              </div>
              <div className="admin-notif-content">
                <div className="admin-notif-header">
                  <div className="admin-notif-title-row">
                    <h3 className="admin-notif-title">{n.title}</h3>
                    {!n.is_read && <span className="admin-notif-dot" />}
                  </div>
                  <span className="admin-notif-time">{relativeTime(n.created_at)}</span>
                </div>
                <p className="admin-notif-message">{n.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
