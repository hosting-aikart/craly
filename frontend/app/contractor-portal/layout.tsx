'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';
import { getMyProfile, type MyProfile, type ContractorProfile } from '@/lib/api/profile';
import Sidebar from '@/components/workspace/Sidebar';
import WorkspaceHeader from '@/components/workspace/WorkspaceHeader';
import MobileNav from '@/components/workspace/MobileNav';
import LoadingState from '@/components/ui/LoadingState';
import ContractorProfileModal from '@/components/contractor/ContractorProfileModal';
import { WorkspaceHeaderProvider } from '@/components/workspace/WorkspaceHeaderContext';
import '@/components/workspace/WorkspaceLayout.css';

import { getRoleDefaultDashboard } from '@/lib/util/roleRedirect';

export default function ContractorPortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const fetchProfile = useCallback(() => {
    setLoading(true);
    getMyProfile()
      .then(({ data }) => setProfile(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'contractor') {
      router.push(getRoleDefaultDashboard(user.role));
      return;
    }

    fetchProfile();
  }, [authLoading, user, router, fetchProfile]);

  if (authLoading || loading || !user || user.role !== 'contractor') {
    return (
      <div className="workspace-loading">
        <LoadingState label="Loading Contractor Portal…" />
      </div>
    );
  }

  const contractorProfile = profile?.role === 'contractor' ? (profile as ContractorProfile) : null;
  const companyName = contractorProfile?.company_name || user.email;
  const isProfileIncomplete = contractorProfile
    ? !contractorProfile.onboarding_complete || contractorProfile.workforce_size === null
    : false;

  return (
    <WorkspaceHeaderProvider>
      <div className="workspace-container">
        {isProfileIncomplete && (
          <ContractorProfileModal
            initialProfile={contractorProfile}
            onComplete={fetchProfile}
            allowClose={false}
          />
        )}

        <Sidebar role="contractor-portal" companyName={companyName} />

        <div className="workspace-main">
          <WorkspaceHeader
            userRole="contractor-portal"
            companyName={companyName}
            onMobileMenuToggle={() => setMobileDrawerOpen(true)}
          />

          <main className="workspace-content">{children}</main>
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
