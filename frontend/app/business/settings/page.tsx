'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';
import { useAuth } from '@/lib/auth/useAuth';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { LANGUAGES, type Language } from '@/lib/i18n/translations';
import { getMyProfile, type BusinessProfile } from '@/lib/api/profile';
import LoadingState from '@/components/ui/LoadingState';
import {
  IconUser,
  IconShield,
  IconGlobe,
  IconBuilding,
  IconLock,
  IconLogout,
} from '@/components/ui/Icons';
import './business-settings.css';

type TabKey = 'account' | 'security' | 'preferences';

export default function BusinessSettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { language, setLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabKey>('account');
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Sliding switch state & refs
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number; opacity: number }>({
    left: 4,
    width: 0,
    opacity: 0,
  });
  const tabRefs = useRef<{ [key in TabKey]?: HTMLButtonElement | null }>({});

  useEffect(() => {
    getMyProfile()
      .then(({ data }) => {
        if (data.role === 'business') {
          setProfile(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Recalculate sliding indicator position when activeTab or loading changes
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
    // Re-measure after font load / layout render
    const timeout = setTimeout(updateIndicator, 50);
    window.addEventListener('resize', updateIndicator);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [activeTab, loading]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <>
      <WorkspacePageHeader
        title="Settings"
        subtitle="Manage your business authentication, preferences, and security configuration."
      />

      {loading ? (
        <LoadingState label="Loading settings…" />
      ) : (
        <div className="bs-wrapper">
          {/* Header Card */}
          <div className="bs-header-card">
            <div className="bs-header-card__info">
              <h2 className="bs-header-card__title">
                {profile?.company_name || 'Business Account'}
              </h2>
              <p className="bs-header-card__sub">
                Organization credentials and account security
              </p>
            </div>
            <span className="bs-header-card__badge">
              <IconShield size={12} /> Active
            </span>
          </div>

          {/* Sliding Switch Nav Tabs */}
          <div className="bs-nav-tabs-wrap">
            <div className="bs-nav-tabs">
              {/* Sliding Pill Indicator */}
              <div
                className="bs-sliding-indicator"
                style={{
                  transform: `translateX(${indicatorStyle.left}px)`,
                  width: `${indicatorStyle.width}px`,
                  opacity: indicatorStyle.opacity,
                }}
              />

              <button
                ref={(el) => { tabRefs.current.account = el; }}
                type="button"
                className={`bs-nav-tab ${activeTab === 'account' ? 'bs-nav-tab--active' : ''}`}
                onClick={() => setActiveTab('account')}
              >
                <IconUser size={14} /> Account
              </button>

              <button
                ref={(el) => { tabRefs.current.security = el; }}
                type="button"
                className={`bs-nav-tab ${activeTab === 'security' ? 'bs-nav-tab--active' : ''}`}
                onClick={() => setActiveTab('security')}
              >
                <IconShield size={14} /> Security
              </button>

              <button
                ref={(el) => { tabRefs.current.preferences = el; }}
                type="button"
                className={`bs-nav-tab ${activeTab === 'preferences' ? 'bs-nav-tab--active' : ''}`}
                onClick={() => setActiveTab('preferences')}
              >
                <IconGlobe size={14} /> Language
              </button>
            </div>
          </div>

          {/* Tab 1: Account Overview */}
          {activeTab === 'account' && (
            <div className="bs-panel-card" key="tab-account">
              <div className="bs-panel-card__header">
                <div className="bs-panel-card__icon">
                  <IconBuilding size={16} />
                </div>
                <h3 className="bs-panel-card__title">Account Credentials</h3>
              </div>

              <div className="bs-rows">
                <div className="bs-row">
                  <span className="bs-row__label">Company Name</span>
                  <span className="bs-row__value">{profile?.company_name || 'Not set'}</span>
                </div>

                <div className="bs-row">
                  <span className="bs-row__label">Account Role</span>
                  <span className="bs-row__value">MANUFACTURER</span>
                </div>

                <div className="bs-row">
                  <span className="bs-row__label">Login Email</span>
                  <span className="bs-row__value">{user?.email || '—'}</span>
                </div>

                <div className="bs-row">
                  <span className="bs-row__label">Account Status</span>
                  <span className="bs-row__value" style={{ color: '#059669' }}>
                    ● ACTIVE & VERIFIED
                  </span>
                </div>

                <div className="bs-row">
                  <span className="bs-row__label">Base Location</span>
                  <span className="bs-row__value">
                    {[profile?.city, profile?.state].filter(Boolean).join(', ') || 'Not declared'}
                  </span>
                </div>
              </div>

              {/* Logout Strip */}
              <div className="bs-logout-strip">
                <div className="bs-logout-strip__info">
                  <h4 className="bs-logout-strip__title">Session Management</h4>
                  <p className="bs-logout-strip__desc">Sign out of your account on this device.</p>
                </div>
                <button type="button" onClick={handleLogout} className="bs-logout-btn-compact">
                  <IconLogout size={13} /> Log Out
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Security & Privacy */}
          {activeTab === 'security' && (
            <div className="bs-panel-card" key="tab-security">
              <div className="bs-panel-card__header">
                <div className="bs-panel-card__icon">
                  <IconLock size={16} />
                </div>
                <h3 className="bs-panel-card__title">Security & Privacy Protections</h3>
              </div>

              <div className="bs-sec-list">
                <div className="bs-sec-item">
                  <span className="bs-sec-icon">✓</span>
                  <p className="bs-sec-text">
                    <strong>Encrypted Sessions:</strong> Authentication tokens are stored in secure HTTP-only cookies that expire every 7 days.
                  </p>
                </div>

                <div className="bs-sec-item">
                  <span className="bs-sec-icon">✓</span>
                  <p className="bs-sec-text">
                    <strong>Bcrypt Password Hashing:</strong> Credentials are encrypted using industry-standard salted multi-round hashing.
                  </p>
                </div>

                <div className="bs-sec-item">
                  <span className="bs-sec-icon">✓</span>
                  <p className="bs-sec-text">
                    <strong>Contact Privacy Shield:</strong> Phone numbers are kept confidential and only shared with contractors upon mutual application acceptance.
                  </p>
                </div>

                <div className="bs-sec-item">
                  <span className="bs-sec-icon">✓</span>
                  <p className="bs-sec-text">
                    <strong>Role-Based Access:</strong> Enforces strict data separation between manufacturer workspaces and contractor portals.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Language & Preferences */}
          {activeTab === 'preferences' && (
            <div className="bs-panel-card" key="tab-preferences">
              <div className="bs-panel-card__header">
                <div className="bs-panel-card__icon">
                  <IconGlobe size={16} />
                </div>
                <h3 className="bs-panel-card__title">Interface Language</h3>
              </div>

              <div className="bs-lang-compact">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    className={`bs-lang-btn ${language === l.code ? 'bs-lang-btn--active' : ''}`}
                    onClick={() => setLanguage(l.code)}
                  >
                    <span className="bs-lang-btn__name">{l.label}</span>
                    <span className="bs-lang-btn__code">
                      {language === l.code ? '✓ ' + l.code : l.code}
                    </span>
                  </button>
                ))}
              </div>

              <div className="bs-row" style={{ marginTop: '4px' }}>
                <span className="bs-row__label">Active Language</span>
                <span className="bs-row__value" style={{ color: 'var(--craly-teal-dark)' }}>
                  {LANGUAGES.find((l) => l.code === language)?.label || 'English'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
