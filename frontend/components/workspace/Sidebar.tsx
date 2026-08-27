'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';
import { useSocket } from '@/lib/socket/SocketContext';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { listEnquiries, type Enquiry } from '@/lib/api/enquiries';
import { listNotifications } from '@/lib/api/notifications';
import './Sidebar.css';

interface SidebarProps {
  role: 'business' | 'contractor' | 'contractor-portal' | 'staff';
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

export default function Sidebar({ role, companyName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { logout } = useAuth();
  const { socket } = useSocket();
  const { t } = useLanguage();

  const [pendingEnquiryCount, setPendingEnquiryCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  const fetchCounts = () => {
    if (role === 'business' || role === 'staff' || role === 'contractor') {
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
    }

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

  const currentTab = searchParams?.get('tab') || 'kyc';

  const isActive = (href: string) => {
    const [path, queryStr] = href.split('?');
    if (pathname !== path) return false;
    if (queryStr) {
      const targetTab = new URLSearchParams(queryStr).get('tab');
      return targetTab === currentTab;
    }
    return true;
  };

  const businessNav: NavGroup[] = [
    {
      group: t.sidebarGroups.main,
      items: [
        { label: t.nav.dashboard, href: '/business/dashboard', icon: '📊' },
        { label: 'Requirements', href: '/business/requirements', icon: '📝' },
        { label: 'Applications', href: '/business/applications', icon: '📥' },
      ],
    },
    {
      group: t.sidebarGroups.work,
      items: [
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

  const contractorStaffNav: NavGroup[] = [
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

  const contractorPortalNav: NavGroup[] = [
    {
      group: 'OVERVIEW',
      items: [
        { label: 'Dashboard', href: '/contractor-portal/dashboard', icon: '📊' },
      ],
    },
    {
      group: 'COMPANY',
      items: [
        { label: 'KYC & Onboarding', href: '/contractor-portal/profile?tab=kyc', icon: '📋' },
        { label: 'Company Profile', href: '/contractor-portal/profile?tab=profile', icon: '🏢' },
        { label: 'Workforce & Skills', href: '/contractor-portal/profile?tab=workforce', icon: '⛑️' },
        { label: 'Coverage', href: '/contractor-portal/profile?tab=coverage', icon: '📍' },
      ],
    },
    {
      group: 'COMPLIANCE',
      items: [
        { label: 'Documents', href: '/contractor-portal/profile?tab=documents', icon: '📄' },
        { label: 'Verification', href: '/contractor-portal/profile?tab=verification', icon: '🛡️' },
      ],
    },
    {
      group: 'MARKETPLACE',
      items: [
        { label: 'Opportunities', href: '/contractor-portal/opportunities', icon: '🎯' },
        { label: 'Applications', href: '/contractor-portal/applications', icon: '📥' },
      ],
    },
    {
      group: 'ACCOUNT',
      items: [
        { label: 'Notifications', href: '/contractor-portal/notifications', icon: '🔔', badge: unreadNotificationCount },
        { label: 'Settings', href: '/contractor-portal/settings', icon: '⚙️' },
      ],
    },
  ];

  const staffNav: NavGroup[] = [
    {
      group: t.sidebarGroups.main,
      items: [
        { label: t.nav.dashboard, href: '/staff/dashboard', icon: '📊' },
        { label: 'KYC / Verification', href: '/staff/verification', icon: '🛡️' },
        { label: 'Contractors', href: '/staff/contractors', icon: '🏢' },
        { label: '+ Add Contractor', href: '/staff/contractors/new', icon: '➕' },
        { label: 'Engagements', href: '/staff/engagements', icon: '🤝' },
        { label: 'Notifications', href: '/staff/notifications', icon: '🔔' },
      ],
    },
  ];

  const navGroups =
    role === 'business'
      ? businessNav
      : role === 'contractor-portal'
        ? contractorPortalNav
        : role === 'staff'
          ? staffNav
          : contractorStaffNav;

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const getBadgeLabel = () => {
    if (role === 'business') return 'MANUFACTURER';
    if (role === 'contractor-portal') return 'CONTRACTOR';
    if (role === 'staff') return 'CRALY STAFF';
    return 'CRALY STAFF';
  };

  const getRoleUserText = () => {
    if (role === 'business') return 'Manufacturer Account';
    if (role === 'contractor-portal') return 'Contractor Account';
    return 'Internal Staff';
  };

  return (
    <aside className="workspace-sidebar">
      <div className="workspace-sidebar__brand">
        <Link href="/" className="workspace-sidebar__logo">
          <img src="/assets/craly-logo.png" alt="Craly" className="workspace-sidebar__logo-img" />
          <span className="workspace-sidebar__logo-sub">Verified Workforce Network</span>
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
            <span className="workspace-sidebar__user-role">{getRoleUserText()}</span>
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
