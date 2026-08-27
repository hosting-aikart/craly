'use client';

import { WorkspacePageHeader } from '@/components/workspace/WorkspaceHeaderContext';

export default function AdminSettingsPage() {
  return (
    <>
      <WorkspacePageHeader
        title="Admin Settings"
        subtitle="Platform-wide configuration, access control, and administrative preferences."
      />
      <div style={{ maxWidth: '640px', background: 'var(--craly-white)', border: '1px solid var(--craly-border)', borderRadius: '16px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h3 style={{ margin: '0 0 6px', fontSize: '18px', color: 'var(--craly-navy)' }}>Security & Access Control</h3>
          <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--craly-muted)' }}>
            Super Administrator permissions are enforced on the backend via JWT token verification. Public admin signup is disabled.
          </p>
        </div>

        <div style={{ padding: '16px', background: 'var(--craly-mint)', border: '1px solid var(--craly-teal)', borderRadius: '12px', color: 'var(--craly-teal-dark)', fontSize: '13.5px' }}>
          <strong>🛡️ Protected Platform Role</strong>
          <p style={{ margin: '4px 0 0' }}>
            Initial admin accounts are provisioned via server-side CLI command (<code>npm run seed:admin</code>).
          </p>
        </div>
      </div>
    </>
  );
}
