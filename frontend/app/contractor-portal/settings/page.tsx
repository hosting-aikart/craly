'use client';

import React from 'react';
import { useAuth } from '@/lib/auth/useAuth';
import LoadingState from '@/components/ui/LoadingState';
import './contractor-settings.css';

/**
 * Account settings — deliberately read-only beyond what's already editable
 * elsewhere. There is no notification-preference system in the backend
 * (Craly Operations notifications are always sent, not opt-in/out per
 * Phase 1 scope — see backend/src/utils/notifications.ts), so this page
 * doesn't offer a toggle that would silently do nothing. Profile fields
 * (company, industry, skills, coverage) are edited on the Profile page.
 */
export default function ContractorSettingsPage() {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return <LoadingState label="Loading Settings…" />;
  }

  return (
    <div className="contractor-settings-page">
      <div className="contractor-settings-header">
        <h1 className="contractor-settings-title">Account Settings</h1>
        <p className="contractor-settings-subtitle">
          Your account credentials and status.
        </p>
      </div>

      <div className="contractor-settings-card">
        <h3 className="contractor-settings-section-title">Account Information</h3>
        <div className="contractor-settings-info-list">
          <div className="contractor-settings-info-item">
            <span>Registered Email</span>
            <strong>{user.email}</strong>
          </div>
          <div className="contractor-settings-info-item">
            <span>Account Role</span>
            <strong className="contractor-settings-role-tag">{user.role.toUpperCase()}</strong>
          </div>
          <div className="contractor-settings-info-item">
            <span>Account Status</span>
            <strong style={{ color: '#047857' }}>ACTIVE</strong>
          </div>
        </div>
      </div>

      <div className="contractor-settings-card">
        <h3 className="contractor-settings-section-title">Notifications</h3>
        <p className="contractor-settings-subtitle" style={{ margin: 0 }}>
          Craly Operations sends you in-app notifications for matching opportunities, application status
          changes, and KYC/document verification updates. View them from the bell icon in the sidebar.
        </p>
      </div>
    </div>
  );
}
