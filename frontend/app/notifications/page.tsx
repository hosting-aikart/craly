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
import './notifications.css';

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }

    const targetRoute = user.role === 'admin'
      ? '/admin/notifications'
      : user.role === 'contractor'
      ? '/contractor/notifications'
      : '/business/notifications';

    router.replace(targetRoute);
  }, [authLoading, user, router]);

  const handleClick = (n: AppNotification) => {
    if (!n.is_read) {
      markNotificationRead(n.id).catch(() => {});
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (n.reference_id && user) {
      router.push(user.role === 'contractor' ? `/contractor/enquiries/${n.reference_id}` : `/business/enquiries/${n.reference_id}`);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((x) => ({ ...x, is_read: true })));
    setUnreadCount(0);
    await markAllNotificationsRead().catch(() => {});
  };

  if (authLoading || loading || !user) {
    return (
      <div className="notifications-page">
        <LoadingState label={t.common.loading} />
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <div className="notifications-page__inner">
        <div className="notifications-page__header">
          <h1>{t.notifications.pageTitle}</h1>
          {unreadCount > 0 && (
            <Button variant="secondary" size="sm" onClick={handleMarkAllRead}>{t.notifications.markAllRead}</Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <EmptyState title={t.notifications.emptyState} subtitle="" />
        ) : (
          <div className="notifications-page__list">
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
      </div>
    </div>
  );
}
