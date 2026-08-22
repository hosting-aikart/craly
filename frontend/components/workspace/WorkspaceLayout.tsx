'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';
import { getMyProfile, type MyProfile } from '@/lib/api/profile';
import Sidebar from './Sidebar';
import WorkspaceHeader from './WorkspaceHeader';
import MobileNav from './MobileNav';
import LoadingState from '@/components/ui/LoadingState';
import './WorkspaceLayout.css';

import { getRoleDefaultDashboard } from '@/lib/util/roleRedirect';

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  requiredRole?: 'business' | 'contractor';
}

export default function WorkspaceLayout({
  children,
  title,
  subtitle,
  action,
  requiredRole,
}: WorkspaceLayoutProps) {
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

    if (requiredRole && user.role !== requiredRole) {
      router.push(getRoleDefaultDashboard(user.role));
      return;
    }

    getMyProfile()
      .then(({ data }) => setProfile(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authLoading, user, requiredRole, router]);

  if (authLoading || loading || !user) {
    return (
      <div className="workspace-loading">
        <LoadingState label="Loading workspace…" />
      </div>
    );
  }

  const role = user.role as 'business' | 'contractor';
  // requiredRole here is only ever 'business' | 'contractor' — narrow past
  // MyProfile's wider union (which now also covers Field Staff/Ops Head,
  // who have no company_name) rather than widening this read's shape.
  const companyName = (profile as { company_name?: string } | null)?.company_name || (role === 'business' ? 'Business User' : 'Contractor User');

  return (
    <div className="workspace-container">
      <Sidebar role={role} companyName={companyName} />

      <div className="workspace-main">
        <WorkspaceHeader
          title={title}
          subtitle={subtitle}
          userRole={role}
          companyName={companyName}
          onMobileMenuToggle={() => setMobileDrawerOpen(true)}
          action={action}
        />

        <main className="workspace-content">
          {children}
        </main>
      </div>

      <MobileNav
        role={role}
        companyName={companyName}
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
      />
    </div>
  );
}
