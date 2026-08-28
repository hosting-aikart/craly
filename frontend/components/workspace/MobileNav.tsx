'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import LanguageSelector from '@/components/language/LanguageSelector';
import {
  IconDashboard, IconRequirements, IconApplications, IconMenu, IconBell,
  IconBuilding, IconSettings, IconUser, IconLogout,
} from '@/components/ui/Icons';
import './MobileNav.css';

interface MobileNavProps {
  role: 'business' | 'contractor' | 'admin' | 'contractor-portal' | 'staff';
  companyName: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function MobileNav({ role, companyName, isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const { t } = useLanguage();
  const [localDrawerOpen, setLocalDrawerOpen] = useState(false);

  const drawerOpen = isOpen !== undefined ? isOpen : localDrawerOpen;

  const closeDrawer = () => {
    setLocalDrawerOpen(false);
    if (onClose) onClose();
  };

  const openDrawer = () => {
    setLocalDrawerOpen(true);
  };

  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  const isStaff = role === 'contractor';
  const dashboardPath =
    role === 'business'
      ? '/business/dashboard'
      : role === 'admin'
        ? '/admin/dashboard'
        : role === 'staff'
          ? '/staff/dashboard'
          : role === 'contractor-portal'
            ? '/contractor-portal/dashboard'
            : '/contractor-portal/dashboard';
  const enquiriesPath = role === 'business' ? '/business/enquiries' : '/contractor/enquiries';
  const inboxPath = role === 'business' ? '/business/inbox' : '/contractor/inbox';
  const notificationsPath = role === 'business' ? '/business/notifications' : '/notifications';

  const handleLogout = async () => {
    closeDrawer();
    await logout();
    router.push('/login');
  };

  return (
    <>
      <nav className="mobile-nav">
        <Link
          href={dashboardPath}
          className={`mobile-nav__item ${isActive(dashboardPath) ? 'mobile-nav__item--active' : ''}`}
        >
          <span className="mobile-nav__icon"><IconDashboard size={18} /></span>
          <span className="mobile-nav__label">{t.nav.home}</span>
        </Link>

        {role === 'business' && (
          <>
            <Link
              href="/business/requirements"
              className={`mobile-nav__item ${isActive('/business/requirements') ? 'mobile-nav__item--active' : ''}`}
            >
              <span className="mobile-nav__icon"><IconRequirements size={18} /></span>
              <span className="mobile-nav__label">Requirements</span>
            </Link>
            <Link
              href="/business/applications"
              className={`mobile-nav__item ${isActive('/business/applications') ? 'mobile-nav__item--active' : ''}`}
            >
              <span className="mobile-nav__icon"><IconApplications size={18} /></span>
              <span className="mobile-nav__label">Applications</span>
            </Link>
          </>
        )}

        <button
          type="button"
          className={`mobile-nav__item ${drawerOpen ? 'mobile-nav__item--active' : ''}`}
          onClick={openDrawer}
        >
          <span className="mobile-nav__icon"><IconMenu size={18} /></span>
          <span className="mobile-nav__label">Menu</span>
        </button>
      </nav>

      {/* Mobile Drawer Overlay (Left Sidebar) */}
      {drawerOpen && (
        <div className="mobile-drawer__backdrop" onClick={closeDrawer}>
          <div className="mobile-drawer__content" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer__header">
              <div className="mobile-drawer__brand">
                <img src="/assets/craly-logo-white.png" alt="Craly" className="mobile-drawer__logo-img" />
              </div>
              <button className="mobile-drawer__close" onClick={closeDrawer} aria-label="Close menu">×</button>
            </div>

            <div className="mobile-drawer__user">
              <div className="mobile-drawer__avatar">{companyName ? companyName.charAt(0).toUpperCase() : 'U'}</div>
              <div className="mobile-drawer__user-meta">
                <strong>{companyName}</strong>
                <span>{role === 'contractor' ? 'Internal Staff' : role === 'admin' ? 'Admin Account' : 'Manufacturer Account'}</span>
              </div>
            </div>

            <div className="mobile-drawer__links">
              <span className="mobile-drawer__section-title">{t.sidebarGroups.main}</span>
              <Link
                href={dashboardPath}
                className={`mobile-drawer__link ${isActive(dashboardPath) ? 'mobile-drawer__link--active' : ''}`}
                onClick={closeDrawer}
              >
                <IconDashboard size={16} /> {t.nav.dashboard}
              </Link>

              {role === 'business' && (
                <>
                  <Link
                    href="/business/requirements"
                    className={`mobile-drawer__link ${isActive('/business/requirements') ? 'mobile-drawer__link--active' : ''}`}
                    onClick={closeDrawer}
                  >
                    <IconRequirements size={16} /> Requirements
                  </Link>
                  <Link
                    href="/business/applications"
                    className={`mobile-drawer__link ${isActive('/business/applications') ? 'mobile-drawer__link--active' : ''}`}
                    onClick={closeDrawer}
                  >
                    <IconApplications size={16} /> Applications
                  </Link>
                </>
              )}

              {role !== 'admin' && (
                <Link
                  href={notificationsPath}
                  className={`mobile-drawer__link ${isActive(notificationsPath) ? 'mobile-drawer__link--active' : ''}`}
                  onClick={closeDrawer}
                >
                  <IconBell size={16} /> {t.notifications.pageTitle || 'Notifications'}
                </Link>
              )}

              {role === 'business' && (
                <>
                  <span className="mobile-drawer__section-title">{t.sidebarGroups.account}</span>
                  <Link
                    href="/business/profile"
                    className={`mobile-drawer__link ${isActive('/business/profile') ? 'mobile-drawer__link--active' : ''}`}
                    onClick={closeDrawer}
                  >
                    <IconBuilding size={16} /> {t.nav.companyProfile || 'Company Profile'}
                  </Link>
                  <Link
                    href="/business/settings"
                    className={`mobile-drawer__link ${isActive('/settings') ? 'mobile-drawer__link--active' : ''}`}
                    onClick={closeDrawer}
                  >
                    <IconSettings size={16} /> {t.nav.settings || 'Settings'}
                  </Link>
                </>
              )}

              {isStaff && (
                <>
                  <span className="mobile-drawer__section-title">{t.sidebarGroups.account}</span>
                  <Link
                    href="/contractor/profile"
                    className={`mobile-drawer__link ${isActive('/contractor/profile') ? 'mobile-drawer__link--active' : ''}`}
                    onClick={closeDrawer}
                  >
                    <IconUser size={16} /> {t.fieldStaff.nav.profile}
                  </Link>
                  <Link
                    href="/contractor/settings"
                    className={`mobile-drawer__link ${isActive('/contractor/settings') ? 'mobile-drawer__link--active' : ''}`}
                    onClick={closeDrawer}
                  >
                    <IconSettings size={16} /> {t.fieldStaff.nav.settings}
                  </Link>
                </>
              )}

              <div className="mobile-drawer__lang-box">
                <LanguageSelector variant="mobile" />
              </div>

              <button type="button" className="mobile-drawer__link mobile-drawer__link--logout" onClick={handleLogout}>
                <IconLogout size={16} /> {t.nav.logout || 'Log Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
