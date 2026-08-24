'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';
import AdminSidebar from './AdminSidebar';
import WorkspaceHeader from '@/components/workspace/WorkspaceHeader';
import MobileNav from '@/components/workspace/MobileNav';
import LoadingState from '@/components/ui/LoadingState';
import { getRoleDefaultDashboard } from '@/lib/util/roleRedirect';
import '@/components/workspace/WorkspaceLayout.css';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function AdminLayout({
  children,
  title,
  subtitle,
  action,
}: AdminLayoutProps) {
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

  return (
    <div className="workspace-container">
      <AdminSidebar adminEmail={user.email} />

      <div className="workspace-main">
        <WorkspaceHeader
          title={title}
          subtitle={subtitle}
          userRole="business"
          companyName={`ADMIN (${user.email})`}
          onMobileMenuToggle={() => setMobileDrawerOpen(true)}
          action={action}
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
  );
}
