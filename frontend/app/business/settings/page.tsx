'use client';

import { useState } from 'react';
import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';

export default function BusinessSettingsPage() {
  const [activeTab, setActiveTab] = useState<'account' | 'security'>('account');

  return (
    <>
      <WorkspacePageHeader
        title="Settings"
        subtitle="Manage your security preferences and account configuration."
      />
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--craly-border)', paddingBottom: '12px' }}>
        <button
          type="button"
          className={`btn ${activeTab === 'account' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setActiveTab('account')}
        >
          👤 Account
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'security' ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setActiveTab('security')}
        >
          🔒 Security
        </button>
      </div>

      <div style={{ maxWidth: '640px', background: 'var(--craly-white)', border: '1px solid var(--craly-border)', borderRadius: '16px', padding: '32px' }}>
          {activeTab === 'account' && (
            <div>
              <h3 style={{ margin: '0 0 12px', fontSize: '18px', color: 'var(--craly-navy)' }}>Account Settings</h3>
              <p style={{ fontSize: '14px', color: 'var(--craly-muted)' }}>
                Your business account is active on Craly B2B Workspace. For email address changes or organization transfers, contact Craly Support.
              </p>
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <h3 style={{ margin: '0 0 12px', fontSize: '18px', color: 'var(--craly-navy)' }}>Security & Auth</h3>
              <p style={{ fontSize: '14px', color: 'var(--craly-muted)' }}>
                Authentication token expires every 7 days. Your password and session cookies are encrypted with standard security policies.
              </p>
            </div>
          )}
      </div>
    </>
  );
}
