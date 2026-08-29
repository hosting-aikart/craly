'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/useAuth';
import LoadingState from '@/components/ui/LoadingState';
import {
  IconSettings,
  IconShield,
  IconCheck,
  IconLock,
  IconArrowRight,
  IconUser,
  IconBell,
  IconBuilding,
  IconAlertCircle,
  IconClipboard,
} from '@/components/ui/Icons';
import './contractor-settings.css';

export default function ContractorSettingsPage() {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return <LoadingState label="Loading Account & Security Settings…" />;
  }

  return (
    <div className="contractor-settings-page">
      {/* ── Hero Banner ──────────────────────────────────────────────── */}
      <div className="contractor-settings-hero">
        <div className="contractor-settings-hero__content">
          <span className="contractor-settings-hero__badge">
            <IconSettings size={12} /> Security & Account Credentials
          </span>
          <h1>Account Settings & Security</h1>
          <p>
            Manage your registered contractor credentials, security parameters, system notification channels,
            and operational profile links.
          </p>

          <div className="contractor-settings-hero__highlights">
            <span className="settings-highlight-tag">
              <IconShield size={12} /> Enterprise Auth Secured
            </span>
            <span className="settings-highlight-tag">
              <IconLock size={12} /> Encrypted Session Token
            </span>
            <span className="settings-highlight-tag">
              <IconCheck size={12} /> Direct Operations Sync
            </span>
          </div>
        </div>
      </div>

      {/* ── Settings Content Grid ────────────────────────────────────── */}
      <div className="contractor-settings-grid">
        {/* Account Information Card */}
        <div className="contractor-settings-card">
          <div className="settings-card-header">
            <div className="settings-header-icon-box">
              <IconUser size={18} />
            </div>
            <div>
              <h3 className="settings-card-title">Account Information</h3>
              <span className="settings-card-sub">Authentication credentials and organization profile</span>
            </div>
          </div>

          <div className="contractor-settings-info-list">
            <div className="contractor-settings-info-item">
              <div className="settings-item-label">
                <span>Registered Email</span>
                <p>Primary email address used for login and official notifications</p>
              </div>
              <strong className="settings-item-val">{user.email}</strong>
            </div>

            <div className="contractor-settings-info-item">
              <div className="settings-item-label">
                <span>Account Role</span>
                <p>Access tier assigned to your registered company profile</p>
              </div>
              <span className="contractor-settings-role-tag">
                {user.role ? user.role.toUpperCase() : 'CONTRACTOR'}
              </span>
            </div>

            <div className="contractor-settings-info-item">
              <div className="settings-item-label">
                <span>Authentication Status</span>
                <p>Current authentication and session security state</p>
              </div>
              <span className="contractor-settings-status-tag">
                <span className="settings-status-dot" />
                ACTIVE & VERIFIED
              </span>
            </div>
          </div>

          <div className="settings-card-footer">
            <span className="settings-footer-text">
              To update your company name, GST, or trading licenses, visit your profile tabs.
            </span>
            <Link href="/contractor-portal/profile" className="settings-footer-link">
              Go to Profile Details <IconArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* System Notifications Card */}
        <div className="contractor-settings-card">
          <div className="settings-card-header">
            <div className="settings-header-icon-box settings-header-icon-box--amber">
              <IconBell size={18} />
            </div>
            <div>
              <h3 className="settings-card-title">In-App Operations Alerts</h3>
              <span className="settings-card-sub">Real-time status updates from Craly Operations</span>
            </div>
          </div>

          <div className="settings-notice-banner">
            <IconAlertCircle size={18} className="settings-notice-icon" />
            <div>
              <strong>Automated Dispatch & Compliance Updates:</strong>
              <p>
                Craly Operations automatically sends mission-critical alerts for high-match manufacturer tenders,
                application shortlist confirmations, and statutory KYC verification milestones.
              </p>
            </div>
          </div>

          <div className="settings-notifications-features">
            <div className="settings-feature-row">
              <div className="settings-feature-bullet">✓</div>
              <div className="settings-feature-content">
                <strong>Matching Tender Alerts</strong>
                <span>Instant notifications when verified manufacturers post requirements in your zone.</span>
              </div>
            </div>

            <div className="settings-feature-row">
              <div className="settings-feature-bullet">✓</div>
              <div className="settings-feature-content">
                <strong>Application Shortlist Status</strong>
                <span>Updates as client manufacturers review, shortlist, and select your workforce bids.</span>
              </div>
            </div>

            <div className="settings-feature-row">
              <div className="settings-feature-bullet">✓</div>
              <div className="settings-feature-content">
                <strong>Document Compliance Verification</strong>
                <span>Direct feedback from Craly compliance auditors on uploaded licenses and KYC vaults.</span>
              </div>
            </div>
          </div>

          <div className="settings-card-footer">
            <span className="settings-footer-text">
              View your notification history and operational alerts in the Notifications Hub.
            </span>
            <Link href="/contractor-portal/notifications" className="settings-footer-link">
              View Notifications Hub <IconArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
