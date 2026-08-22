'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';
import AdminSidebar from '@/components/admin/AdminSidebar';
import WorkspaceHeader from '@/components/workspace/WorkspaceHeader';
import MobileNav from '@/components/workspace/MobileNav';
import LoadingState from '@/components/ui/LoadingState';
import { WorkspaceHeaderProvider } from '@/components/workspace/WorkspaceHeaderContext';
import '@/components/workspace/WorkspaceLayout.css';

import { getRoleDefaultDashboard } from '@/lib/util/roleRedirect';

export default function AdminWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'admin') {
      router.push(getRoleDefaultDashboard(user.role));
    }
  }, [authLoading, user, router]);

  if (authLoading || !user || user.role !== 'admin') {
    return (
      <div className="workspace-loading">
        <LoadingState label="Verifying admin credentials…" />
      </div>
    );
  }

  const companyName = `ADMIN (${user.email})`;

  return (
    <WorkspaceHeaderProvider>
      <div className="workspace-container">
        <AdminSidebar adminEmail={user.email} />

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
          role="admin"
          companyName={user.email}
          isOpen={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
        />
      </div>
    </WorkspaceHeaderProvider>
  );
}
