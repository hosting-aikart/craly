'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/useAuth';
import LoadingState from '@/components/ui/LoadingState';
import './contractor-settings.css';

export default function ContractorSettingsPage() {
  const { user, loading } = useAuth();
  const [notificationEmail, setNotificationEmail] = useState(true);
  const [saved, setSaved] = useState(false);

  if (loading || !user) {
    return <LoadingState label="Loading Settings…" />;
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="contractor-settings-page">
      <div className="contractor-settings-header">
        <h1 className="contractor-settings-title">Account Settings</h1>
        <p className="contractor-settings-subtitle">
          Manage your account credentials, security, and preferences.
        </p>
      </div>

      {saved && (
        <div className="contractor-settings-alert">
          Settings updated successfully.
        </div>
      )}

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

      <form onSubmit={handleSave}>
        <div className="contractor-settings-card">
          <h3 className="contractor-settings-section-title">Notification Preferences</h3>
          <label className="contractor-settings-toggle">
            <input
              type="checkbox"
              checked={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.checked)}
            />
            <div>
              <strong>Email Notifications</strong>
              <p>Receive updates about manpower opportunity matches and Craly Operations announcements.</p>
            </div>
          </label>
        </div>

        <div className="contractor-settings-actions">
          <button type="submit" className="contractor-settings-save-btn">
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
}
