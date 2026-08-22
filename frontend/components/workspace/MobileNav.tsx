'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import LanguageSelector from '@/components/language/LanguageSelector';
import './MobileNav.css';

const helmetLogo = '/assets/helmet.png';

interface MobileNavProps {
  role: 'business' | 'contractor' | 'admin' | 'contractor-portal';
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
        : role === 'contractor-portal'
          ? '/contractor-portal/dashboard'
          : '/contractor/dashboard';
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
          <span className="mobile-nav__icon">📊</span>
          <span className="mobile-nav__label">{t.nav.home}</span>
        </Link>

        {role === 'business' && (
          <Link
            href="/business/contractors"
            className={`mobile-nav__item ${isActive('/business/contractors') ? 'mobile-nav__item--active' : ''}`}
          >
            <span className="mobile-nav__icon">🔍</span>
            <span className="mobile-nav__label">{t.nav.findContractors}</span>
          </Link>
        )}

        {isStaff && (
          <>
            <Link
              href="/contractor/requests"
              className={`mobile-nav__item ${isActive('/contractor/requests') ? 'mobile-nav__item--active' : ''}`}
            >
              <span className="mobile-nav__icon">📝</span>
              <span className="mobile-nav__label">{t.fieldStaff.nav.requests}</span>
            </Link>
            <Link
              href="/contractor/contractors"
              className={`mobile-nav__item ${isActive('/contractor/contractors') ? 'mobile-nav__item--active' : ''}`}
            >
              <span className="mobile-nav__icon">🛠️</span>
              <span className="mobile-nav__label">{t.fieldStaff.nav.contractors}</span>
            </Link>
          </>
        )}

        {role === 'business' && (
          <Link
            href={enquiriesPath}
            className={`mobile-nav__item ${isActive(enquiriesPath) ? 'mobile-nav__item--active' : ''}`}
          >
            <span className="mobile-nav__icon">📋</span>
            <span className="mobile-nav__label">{t.nav.enquiries}</span>
          </Link>
        )}

        {role === 'business' && (
          <Link
            href={inboxPath}
            className={`mobile-nav__item ${isActive(inboxPath) ? 'mobile-nav__item--active' : ''}`}
          >
            <span className="mobile-nav__icon">💬</span>
            <span className="mobile-nav__label">{t.nav.inbox}</span>
          </Link>
        )}

        <button
          type="button"
          className={`mobile-nav__item ${drawerOpen ? 'mobile-nav__item--active' : ''}`}
          onClick={openDrawer}
        >
          <span className="mobile-nav__icon">☰</span>
          <span className="mobile-nav__label">Menu</span>
        </button>
      </nav>

      {/* Mobile Drawer Overlay (Left Sidebar) */}
      {drawerOpen && (
        <div className="mobile-drawer__backdrop" onClick={closeDrawer}>
          <div className="mobile-drawer__content" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer__header">
              <div className="mobile-drawer__brand">
                <img src={helmetLogo} alt="Craly" className="mobile-drawer__logo-img" />
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
                📊 {t.nav.dashboard}
              </Link>

              {role === 'business' && (
                <Link
                  href="/business/contractors"
                  className={`mobile-drawer__link ${isActive('/business/contractors') ? 'mobile-drawer__link--active' : ''}`}
                  onClick={closeDrawer}
                >
                  🔍 {t.nav.findContractors}
                </Link>
              )}

              {isStaff && (
                <>
                  <Link
                    href="/contractor/requests"
                    className={`mobile-drawer__link ${isActive('/contractor/requests') ? 'mobile-drawer__link--active' : ''}`}
                    onClick={closeDrawer}
                  >
                    📝 {t.fieldStaff.nav.requests}
                  </Link>
                  <Link
                    href="/contractor/contractors"
                    className={`mobile-drawer__link ${isActive('/contractor/contractors') ? 'mobile-drawer__link--active' : ''}`}
                    onClick={closeDrawer}
                  >
                    🛠️ {t.fieldStaff.nav.contractors}
                  </Link>
                  <Link
                    href="/contractor/activity"
                    className={`mobile-drawer__link ${isActive('/contractor/activity') ? 'mobile-drawer__link--active' : ''}`}
                    onClick={closeDrawer}
                  >
                    🕒 {t.fieldStaff.nav.activity}
                  </Link>
                </>
              )}

              {role === 'business' && (
                <>
                  <Link
                    href={enquiriesPath}
                    className={`mobile-drawer__link ${isActive(enquiriesPath) ? 'mobile-drawer__link--active' : ''}`}
                    onClick={closeDrawer}
                  >
                    📋 {t.nav.enquiries}
                  </Link>

                  <Link
                    href={inboxPath}
                    className={`mobile-drawer__link ${isActive(inboxPath) ? 'mobile-drawer__link--active' : ''}`}
                    onClick={closeDrawer}
                  >
                    💬 {t.nav.inbox}
                  </Link>
                </>
              )}

              {role !== 'admin' && (
                <Link
                  href={notificationsPath}
                  className={`mobile-drawer__link ${isActive(notificationsPath) ? 'mobile-drawer__link--active' : ''}`}
                  onClick={closeDrawer}
                >
                  🔔 {t.notifications.pageTitle || 'Notifications'}
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
                    🏢 {t.nav.companyProfile || 'Company Profile'}
                  </Link>
                  <Link
                    href="/business/settings"
                    className={`mobile-drawer__link ${isActive('/settings') ? 'mobile-drawer__link--active' : ''}`}
                    onClick={closeDrawer}
                  >
                    ⚙️ {t.nav.settings || 'Settings'}
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
                    👤 {t.fieldStaff.nav.profile}
                  </Link>
                  <Link
                    href="/contractor/settings"
                    className={`mobile-drawer__link ${isActive('/contractor/settings') ? 'mobile-drawer__link--active' : ''}`}
                    onClick={closeDrawer}
                  >
                    ⚙️ {t.fieldStaff.nav.settings}
                  </Link>
                </>
              )}

              <div className="mobile-drawer__lang-box">
                <LanguageSelector variant="mobile" />
              </div>

              <button type="button" className="mobile-drawer__link mobile-drawer__link--logout" onClick={handleLogout}>
                🚪 {t.nav.logout || 'Log Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
