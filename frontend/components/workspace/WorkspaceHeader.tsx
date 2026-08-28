'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NotificationBell from '@/components/NotificationBell';
import LanguageSelector from '@/components/language/LanguageSelector';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useAuth } from '@/lib/auth/useAuth';
import { useWorkspaceHeader } from './WorkspaceHeaderContext';
import { IconMenu, IconBuilding, IconSettings, IconDashboard, IconClipboard, IconLogout, IconChevronDown } from '@/components/ui/Icons';
import './WorkspaceHeader.css';

interface WorkspaceHeaderProps {
  title?: string;
  subtitle?: string;
  userRole: 'business' | 'contractor' | 'contractor-portal' | 'staff';
  companyName: string;
  onMobileMenuToggle?: () => void;
  action?: React.ReactNode;
}

export default function WorkspaceHeader({
  title: propTitle,
  subtitle: propSubtitle,
  userRole,
  companyName,
  onMobileMenuToggle,
  action: propAction,
}: WorkspaceHeaderProps) {
  const { t } = useLanguage();
  const { logout } = useAuth();
  const router = useRouter();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  let ctxHeader: { title?: string; subtitle?: string; action?: React.ReactNode } = {};
  try {
    const ctx = useWorkspaceHeader();
    ctxHeader = ctx.headerState;
  } catch {
    // Context optional fallback
  }

  const title = propTitle || ctxHeader.title || t.nav.dashboard;
  const subtitle = propSubtitle !== undefined ? propSubtitle : ctxHeader.subtitle;
  const action = propAction !== undefined ? propAction : ctxHeader.action;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    router.push('/login');
  };

  const getRoleLabel = () => {
    if (userRole === 'business') return 'Manufacturer Account';
    if (userRole === 'contractor-portal') return 'Contractor Account';
    return 'Internal Staff';
  };

  return (
    <header className="workspace-header">
      <div className="workspace-header__left">
        <button
          type="button"
          className="workspace-header__mobile-toggle"
          onClick={onMobileMenuToggle}
          aria-label="Open mobile navigation"
        >
          <IconMenu size={20} />
        </button>
        <h1 className="workspace-header__title">{title}</h1>
      </div>

      <div className="workspace-header__right">
        {action && <div className="workspace-header__action">{action}</div>}

        <div className="workspace-header__role-badge-pill">
          <span className="workspace-header__role-dot" />
          <span className="workspace-header__role-badge-val">{getRoleLabel()}</span>
        </div>


        <LanguageSelector variant="header" />

        <NotificationBell />

        <div className="workspace-header__user-wrapper" ref={userMenuRef}>
          <button
            type="button"
            className={`workspace-header__user-pill ${dropdownOpen ? 'workspace-header__user-pill--active' : ''}`}
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-expanded={dropdownOpen}
            aria-label="User profile menu"
          >
            <div className="workspace-header__avatar">
              {companyName ? companyName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="workspace-header__user-meta">
              <strong className="workspace-header__company">{companyName}</strong>
            </div>
            <IconChevronDown size={13} className="workspace-header__caret" />
          </button>

          {dropdownOpen && (
            <div className="workspace-header__dropdown">
              <div className="workspace-header__dropdown-user">
                <div className="workspace-header__dropdown-avatar">
                  {companyName ? companyName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="workspace-header__dropdown-meta">
                  <strong>{companyName}</strong>
                  <span>{getRoleLabel()}</span>
                </div>
              </div>

              <div className="workspace-header__dropdown-divider" />

              <div className="workspace-header__dropdown-menu">
                {userRole === 'contractor-portal' ? (
                  <>
                    <Link
                      href="/contractor-portal/profile"
                      className="workspace-header__dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <IconBuilding size={15} className="workspace-header__dropdown-icon" />
                      <span>{t.nav.companyProfile || 'Company Profile'}</span>
                    </Link>
                    <Link
                      href="/contractor-portal/settings"
                      className="workspace-header__dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <IconSettings size={15} className="workspace-header__dropdown-icon" />
                      <span>{t.nav.settings || 'Settings'}</span>
                    </Link>
                    <Link
                      href="/contractor-portal/dashboard"
                      className="workspace-header__dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <IconDashboard size={15} className="workspace-header__dropdown-icon" />
                      <span>{t.nav.dashboard || 'Dashboard'}</span>
                    </Link>
                  </>
                ) : userRole === 'contractor' ? (
                  <Link
                    href="/contractor/enquiries"
                    className="workspace-header__dropdown-item"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <IconClipboard size={15} className="workspace-header__dropdown-icon" />
                    <span>{t.nav.enquiries || 'Enquiries'}</span>
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/business/profile"
                      className="workspace-header__dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <IconBuilding size={15} className="workspace-header__dropdown-icon" />
                      <span>{t.nav.companyProfile || 'Company Profile'}</span>
                    </Link>
                    <Link
                      href="/business/settings"
                      className="workspace-header__dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <IconSettings size={15} className="workspace-header__dropdown-icon" />
                      <span>{t.nav.settings || 'Settings'}</span>
                    </Link>
                    <Link
                      href="/business/dashboard"
                      className="workspace-header__dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <IconDashboard size={15} className="workspace-header__dropdown-icon" />
                      <span>{t.nav.dashboard || 'Dashboard'}</span>
                    </Link>
                  </>
                )}

                <div className="workspace-header__dropdown-divider" />

                <button
                  type="button"
                  className="workspace-header__dropdown-item workspace-header__dropdown-item--logout"
                  onClick={handleLogout}
                >
                  <IconLogout size={15} className="workspace-header__dropdown-icon" />
                  <span>{t.nav.logout || 'Log Out'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
