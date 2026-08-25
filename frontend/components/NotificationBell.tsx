'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/useAuth';
import { useSocket } from '@/lib/socket/SocketContext';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AppNotification,
} from '@/lib/api/notifications';
import { relativeTime } from '@/lib/util/relativeTime';
import './NotificationBell.css';

export default function NotificationBell() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = () => {
    setLoading(true);
    listNotifications()
      .then(({ data, unreadCount: count }) => {
        setNotifications(data);
        setUnreadCount(count);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  // Fetch once on login so the badge count is right before the bell is ever opened.
  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Realtime Socket.IO listener for instant notification badge update
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (data: { title: string; message: string; referenceId?: string }) => {
      setUnreadCount((prev) => prev + 1);
      setNotifications((prev) => [
        {
          id: String(Date.now()),
          user_id: user?.id || '',
          type: 'SOCKET_NOTIF',
          title: data.title,
          message: data.message,
          reference_id: data.referenceId ?? null,
          is_read: false,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    };

    socket.on('notification:new', handleNewNotification);
    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket, user?.id]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  if (!user) return null;

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) load();
  };

  const handleNotificationClick = (n: AppNotification) => {
    setOpen(false);
    if (!n.is_read) {
      markNotificationRead(n.id).catch(() => {});
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (n.reference_id) {
      if (n.type.includes('OPPORTUNITY') && user.role === 'contractor') {
        router.push(`/contractor-portal/opportunities/${n.reference_id}`);
      } else if (n.type.startsWith('APPLICATION') || n.type === 'ENGAGEMENT_CONFIRMED') {
        router.push(user.role === 'contractor' ? `/contractor-portal/applications/${n.reference_id}` : '/business/requirements');
      } else if (user.role === 'staff' || user.role === 'ops_head' || user.role === 'field_staff') {
        router.push('/staff/engagements');
      } else {
        router.push(user.role === 'contractor' ? `/contractor/enquiries/${n.reference_id}` : `/business/enquiries/${n.reference_id}`);
      }
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((x) => ({ ...x, is_read: true })));
    setUnreadCount(0);
    await markAllNotificationsRead().catch(() => {});
  };

  const notifViewAllHref =
    user.role === 'admin'
      ? '/admin/notifications'
      : user.role === 'staff' || user.role === 'ops_head' || user.role === 'field_staff'
        ? '/staff/notifications'
        : user.role === 'contractor'
          ? '/contractor-portal/dashboard'
          : '/business/notifications';

  return (
    <div className="notif-bell" ref={rootRef}>
      <button
        className="notif-bell__trigger"
        onClick={handleToggle}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && <span className="notif-bell__badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-bell__panel">
          <div className="notif-bell__panel-head">
            <h4>Notifications</h4>
            {unreadCount > 0 && (
              <button className="notif-bell__mark-all" onClick={handleMarkAllRead}>Mark all read</button>
            )}
          </div>

          {loading ? (
            <p className="notif-bell__status">Loading…</p>
          ) : notifications.length === 0 ? (
            <div className="notif-bell__empty">
              <p>You&apos;re all caught up.</p>
              <span>No new notifications.</span>
            </div>
          ) : (
            <div className="notif-bell__list">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  className={`notif-bell__item ${!n.is_read ? 'notif-bell__item--unread' : ''}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <span className="notif-bell__item-dot" aria-hidden="true" />
                  <span className="notif-bell__item-body">
                    <strong>{n.title}</strong>
                    <span>{n.message}</span>
                    <em>{relativeTime(n.created_at)}</em>
                  </span>
                </button>
              ))}
            </div>
          )}

          <Link
            href={notifViewAllHref}
            className="notif-bell__view-all"
            onClick={() => setOpen(false)}
          >
            View all notifications →
          </Link>
        </div>
      )}
    </div>
  );
}
