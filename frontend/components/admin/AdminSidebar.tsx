'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { apiGet } from '@/lib/api';
import {
  IconDashboard, IconTrending, IconUsers, IconHardHat, IconClipboard, IconBell,
  IconShield, IconAlertTriangle, IconFile, IconSettings, IconLogout,
} from '@/components/ui/Icons';
import './AdminSidebar.css';

interface AdminSidebarProps {
  adminEmail: string;
}

export default function AdminSidebar({ adminEmail }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const { t } = useLanguage();

  const [pendingVerificationCount, setPendingVerificationCount] = useState(0);
  const [openReportsCount, setOpenReportsCount] = useState(0);

  useEffect(() => {
    apiGet<{ summary: { status: string; count: number }[] }>('/admin/verification?status=pending')
      .then(({ summary }) => {
        const pending = summary.find((s) => s.status === 'pending')?.count || 0;
        setPendingVerificationCount(pending);
      })
      .catch(() => {});

    apiGet<{ data: any[] }>('/admin/reports?status=open')
      .then(({ data }) => setOpenReportsCount(data.length))
      .catch(() => {});
  }, [pathname]);

  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  interface NavItem {
    label: string;
    href: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    badge?: number;
  }

  const navGroups: { group: string; items: NavItem[] }[] = [
    {
      group: t.sidebarGroups.overview,
      items: [
        { label: t.nav.dashboard, href: '/admin/dashboard', icon: IconDashboard },
        { label: t.nav.analytics, href: '/admin/analytics', icon: IconTrending },
      ],
    },
    {
      group: t.sidebarGroups.platform,
      items: [
        { label: t.nav.users, href: '/admin/users', icon: IconUsers },
        { label: t.nav.contractors, href: '/admin/contractors', icon: IconHardHat },
        { label: t.nav.enquiries, href: '/admin/enquiries', icon: IconClipboard },
        { label: t.notifications.pageTitle, href: '/admin/notifications', icon: IconBell },
      ],
    },
    {
      group: t.sidebarGroups.trustSafety,
      items: [
        { label: t.nav.verification, href: '/admin/verification', icon: IconShield, badge: pendingVerificationCount },
        { label: t.nav.reports, href: '/admin/reports', icon: IconAlertTriangle, badge: openReportsCount },
      ],
    },
    {
      group: t.sidebarGroups.system,
      items: [
        { label: t.nav.auditLogs, href: '/admin/audit-logs', icon: IconFile },
        { label: t.nav.settings, href: '/admin/settings', icon: IconSettings },
      ],
    },
  ];

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar__brand">
        <Link href="/admin/dashboard" className="admin-sidebar__logo">
          <img src="/assets/craly-logo-white.png" alt="Craly" className="admin-sidebar__logo-img" />
          <span className="admin-sidebar__logo-badge">ADMIN</span>
        </Link>
      </div>

      <nav className="admin-sidebar__nav">
        {navGroups.map((g) => (
          <div key={g.group} className="admin-sidebar__group">
            <span className="admin-sidebar__group-title">{g.group}</span>
            <ul className="admin-sidebar__list">
              {g.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`admin-sidebar__link ${active ? 'admin-sidebar__link--active' : ''}`}
                    >
                      <item.icon size={17} className="admin-sidebar__icon" />
                      <span className="admin-sidebar__label">{item.label}</span>
                      {Boolean(item.badge && item.badge > 0) && (
                        <span className="admin-sidebar__badge">{item.badge}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="admin-sidebar__footer">
        <div className="admin-sidebar__user">
          <div className="admin-sidebar__avatar"><IconShield size={18} /></div>
          <div className="admin-sidebar__user-info">
            <strong className="admin-sidebar__user-name">{adminEmail}</strong>
            <span className="admin-sidebar__user-role">Super Administrator</span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="admin-sidebar__logout-btn"
          title="Log Out"
        >
          <IconLogout size={16} />
        </button>
      </div>
    </aside>
  );
}
