'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';
import { useSocket } from '@/lib/socket/SocketContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { listEnquiries, type Enquiry } from '@/lib/api/enquiries';
import { listNotifications } from '@/lib/api/notifications';
import './Sidebar.css';

interface SidebarProps {
  role: 'business' | 'contractor';
  companyName: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const helmetLogo = '/assets/helmet.png';

export default function Sidebar({ role, companyName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const { socket } = useSocket();
  const { t } = useLanguage();

  const [pendingEnquiryCount, setPendingEnquiryCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const fetchCounts = () => {
    listEnquiries()
      .then(({ data }) => {
        const pending = data.filter((e) => {
          const st = String(e.status).toUpperCase();
          return st === 'NEW' || st === 'UNDER_REVIEW';
        }).length;

        const unread = data.filter((e) => e.has_unread).length;

        setPendingEnquiryCount(pending);
        setUnreadMessageCount(unread);
      })
      .catch(() => {});

    listNotifications()
      .then(({ unreadCount }) => setUnreadNotificationCount(unreadCount))
      .catch(() => {});
  };

  useEffect(() => {
    fetchCounts();
  }, [pathname]);

  // Realtime Socket.IO badge updates
  useEffect(() => {
    if (!socket) return;

    const handleNewEnquiry = () => {
      setPendingEnquiryCount((prev) => prev + 1);
      setUnreadNotificationCount((prev) => prev + 1);
    };

    const handleNewMessage = () => {
      setUnreadMessageCount((prev) => prev + 1);
      setUnreadNotificationCount((prev) => prev + 1);
    };

    socket.on('enquiry:new', handleNewEnquiry);
    socket.on('message:new', handleNewMessage);

    return () => {
      socket.off('enquiry:new', handleNewEnquiry);
      socket.off('message:new', handleNewMessage);
    };
  }, [socket]);

  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  const businessNav: NavGroup[] = [
    {
      group: t.sidebarGroups.main,
      items: [
        { label: t.nav.dashboard, href: '/business/dashboard', icon: '📊' },
        { label: t.nav.findContractors, href: '/business/contractors', icon: '🔍' },
      ],
    },
    {
      group: t.sidebarGroups.work,
      items: [
        { label: t.nav.enquiries, href: '/business/enquiries', icon: '📋', badge: pendingEnquiryCount },
        { label: t.nav.inbox, href: '/business/inbox', icon: '💬', badge: unreadMessageCount },
        { label: t.notifications.pageTitle, href: '/business/notifications', icon: '🔔', badge: unreadNotificationCount },
      ],
    },
    {
      group: t.sidebarGroups.account,
      items: [
        { label: t.nav.companyProfile, href: '/business/profile', icon: '🏢' },
        { label: t.nav.settings, href: '/business/settings', icon: '⚙️' },
      ],
    },
  ];

  // Contractors have no login (Phase 1 — see docs/open-decisions.md); this
  // nav is now Ops Head / Field Staff acting on a contractor's behalf. The
  // primary sections are the Field Staff workspace (Dashboard, Contractor
  // Requests, Contractors, My Activity, Profile, Settings); Enquiries/Inbox
  // stay in a secondary group since that brokerage feature already existed
  // and isn't part of the field-staff-module exclusion list. No links here
  // ever point at manufacturer/revenue/subscription/verification-approval/
  // admin-settings screens — those live only under /admin.
  const contractorNav: NavGroup[] = [
    {
      group: t.sidebarGroups.main,
      items: [
        { label: t.fieldStaff.nav.dashboard, href: '/contractor/dashboard', icon: '📊' },
        { label: t.fieldStaff.nav.requests, href: '/contractor/requests', icon: '📝' },
        { label: t.fieldStaff.nav.contractors, href: '/contractor/contractors', icon: '🛠️' },
        { label: t.fieldStaff.nav.activity, href: '/contractor/activity', icon: '🕒' },
      ],
    },
    {
      group: t.sidebarGroups.work,
      items: [
        { label: t.nav.enquiries, href: '/contractor/enquiries', icon: '📋', badge: pendingEnquiryCount },
        { label: t.nav.inbox, href: '/contractor/inbox', icon: '💬', badge: unreadMessageCount },
      ],
    },
    {
      group: t.sidebarGroups.account,
      items: [
        { label: t.fieldStaff.nav.profile, href: '/contractor/profile', icon: '👤' },
        { label: t.fieldStaff.nav.settings, href: '/contractor/settings', icon: '⚙️' },
      ],
    },
  ];

  const navGroups = role === 'business' ? businessNav : contractorNav;

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <aside className="workspace-sidebar">
      <div className="workspace-sidebar__brand">
        <Link href="/" className="workspace-sidebar__logo">
          <img src={helmetLogo} alt="Craly" className="workspace-sidebar__logo-img" />
          <span className="workspace-sidebar__logo-craly">Craly</span>
          <span className="workspace-sidebar__logo-badge">{role === 'business' ? 'MANUFACTURER' : 'STAFF'}</span>
        </Link>
      </div>

      <nav className="workspace-sidebar__nav">
        {navGroups.map((g) => (
          <div key={g.group} className="workspace-sidebar__group">
            <span className="workspace-sidebar__group-title">{g.group}</span>
            <ul className="workspace-sidebar__list">
              {g.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`workspace-sidebar__link ${active ? 'workspace-sidebar__link--active' : ''}`}
                    >
                      <span className="workspace-sidebar__icon">{item.icon}</span>
                      <span className="workspace-sidebar__label">{item.label}</span>
                      {Boolean(item.badge && item.badge > 0) && (
                        <span className="workspace-sidebar__badge">{item.badge}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="workspace-sidebar__footer">
        <div className="workspace-sidebar__user">
          <div className="workspace-sidebar__avatar">
            {companyName.charAt(0).toUpperCase()}
          </div>
          <div className="workspace-sidebar__user-info">
            <strong className="workspace-sidebar__user-name">{companyName}</strong>
            <span className="workspace-sidebar__user-role">{role === 'business' ? 'Manufacturer Account' : 'Internal Staff'}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="workspace-sidebar__logout-btn"
          title="Log Out"
        >
          🚪
        </button>
      </div>
    </aside>
  );
}
