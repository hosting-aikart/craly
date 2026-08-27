'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';
import Sidebar from '@/components/workspace/Sidebar';
import WorkspaceHeader from '@/components/workspace/WorkspaceHeader';
import MobileNav from '@/components/workspace/MobileNav';
import LoadingState from '@/components/ui/LoadingState';
import { WorkspaceHeaderProvider } from '@/components/workspace/WorkspaceHeaderContext';
import '@/components/workspace/WorkspaceLayout.css';

/**
 * Contractors have no platform login in Phase 1 (see docs/open-decisions.md)
 * — this workspace is now Ops Head / Field Staff acting on a contractor's
 * behalf, reusing the same nav shell as the business/admin workspaces. The
 * `role="contractor"` prop passed to Sidebar/Header/MobileNav is a naming
 * leftover from before the pivot; those components render "Internal Staff"
 * copy for it, not a contractor identity.
 */
import { getRoleDefaultDashboard } from '@/lib/util/roleRedirect';

export default function ContractorWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'ops_head' && user.role !== 'field_staff') {
      router.push(getRoleDefaultDashboard(user.role));
    }
  }, [authLoading, user, router]);

  const isStaff = !!user && (user.role === 'ops_head' || user.role === 'field_staff');

  if (authLoading || !user || !isStaff) {
    return (
      <div className="workspace-loading">
        <LoadingState label="Loading…" />
      </div>
    );
  }

  const displayName = user.email;

  return (
    <WorkspaceHeaderProvider>
      <div className="workspace-container">
        <Sidebar role="contractor" companyName={displayName} />

        <div className="workspace-main">
          <WorkspaceHeader
            userRole="contractor"
            companyName={displayName}
            onMobileMenuToggle={() => setMobileDrawerOpen(true)}
          />

          <main className="workspace-content">
            {children}
          </main>
        </div>

        <MobileNav
          role="contractor"
          companyName={displayName}
          isOpen={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
        />
      </div>
    </WorkspaceHeaderProvider>
  );
}
