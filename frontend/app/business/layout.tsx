'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';
import { getMyProfile, type MyProfile } from '@/lib/api/profile';
import Sidebar from '@/components/workspace/Sidebar';
import WorkspaceHeader from '@/components/workspace/WorkspaceHeader';
import MobileNav from '@/components/workspace/MobileNav';
import LoadingState from '@/components/ui/LoadingState';
import { WorkspaceHeaderProvider } from '@/components/workspace/WorkspaceHeaderContext';
import '@/components/workspace/WorkspaceLayout.css';

import { getRoleDefaultDashboard } from '@/lib/util/roleRedirect';

export default function BusinessWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'business') {
      router.push(getRoleDefaultDashboard(user.role));
      return;
    }

    getMyProfile()
      .then(({ data }) => setProfile(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authLoading, user, router]);

  if (authLoading || loading || !user || user.role !== 'business') {
    return (
      <div className="workspace-loading">
        <LoadingState label="Loading Business Workspace…" />
      </div>
    );
  }

  // This layout only ever loads a business profile (guarded above), but
  // MyProfile is now a wider union (it also covers Field Staff/Ops Head,
  // who have no company_name) — narrow explicitly rather than widening the
  // whole union's shape just for this one read.
  const companyName = (profile as { company_name?: string } | null)?.company_name || 'Business User';

  return (
    <WorkspaceHeaderProvider>
      <div className="workspace-container">
        <Sidebar role="business" companyName={companyName} />

        <div className="workspace-main">
          <WorkspaceHeader
            userRole="business"
            companyName={companyName}
            onMobileMenuToggle={() => setMobileDrawerOpen(true)}
          />

          <main className="workspace-content">
            {children}
          </main>
        </div>

        <MobileNav
          role="business"
          companyName={companyName}
          isOpen={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
        />
      </div>
    </WorkspaceHeaderProvider>
  );
}
