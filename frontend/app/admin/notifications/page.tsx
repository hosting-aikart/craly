'use client';

import { useEffect, useState } from 'react';
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
import Button from '@/components/ui/Button';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import '@/app/notifications/notifications.css';

export default function AdminNotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listNotifications()
      .then(({ data, unreadCount: count }) => {
        setNotifications(data);
        setUnreadCount(count);
      })
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <>
      <WorkspacePageHeader
        title={t.notifications.pageTitle}
        subtitle="Platform moderation alerts, contractor verification requests, and administrative notifications."
        action={unreadCount > 0 ? (
          <Button variant="secondary" size="sm" onClick={handleMarkAllRead}>
            {t.notifications.markAllRead}
          </Button>
        ) : undefined}
      />
      {loading ? (
        <LoadingState label={t.common.loading} />
      ) : notifications.length === 0 ? (
        <EmptyState title={t.notifications.emptyState} subtitle="You're all caught up with administrative alerts." />
      ) : (
        <div className="notifications-page__list" style={{ maxWidth: '800px' }}>
          {notifications.map((n) => (
            <button
              key={n.id}
              className={`notifications-page__item ${!n.is_read ? 'notifications-page__item--unread' : ''}`}
              onClick={() => handleClick(n)}
            >
              <span className="notifications-page__item-dot" aria-hidden="true" />
              <span className="notifications-page__item-body">
                <strong>{n.title}</strong>
                <span>{n.message}</span>
                <em>{relativeTime(n.created_at)}</em>
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
