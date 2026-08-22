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

export default function ContractorPortalLayout({ children }: { children: React.ReactNode }) {
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

    if (user.role !== 'contractor') {
      if (user.role === 'business') {
        router.push('/business/dashboard');
      } else if (user.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/contractor/dashboard');
      }
      return;
    }

    getMyProfile()
      .then(({ data }) => setProfile(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authLoading, user, router]);

  if (authLoading || loading || !user || user.role !== 'contractor') {
    return (
      <div className="workspace-loading">
        <LoadingState label="Loading Contractor Portal…" />
      </div>
    );
  }

  const companyName = (profile as { company_name?: string } | null)?.company_name || user.email;

  return (
    <WorkspaceHeaderProvider>
      <div className="workspace-container">
        <Sidebar role="contractor-portal" companyName={companyName} />

        <div className="workspace-main">
          <WorkspaceHeader
            userRole="contractor-portal"
            companyName={companyName}
            onMobileMenuToggle={() => setMobileDrawerOpen(true)}
          />

          <main className="workspace-content">
            {children}
          </main>
        </div>

        <MobileNav
          role="contractor-portal"
          companyName={companyName}
          isOpen={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
        />
      </div>
    </WorkspaceHeaderProvider>
  );
}
