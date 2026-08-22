'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';
import Sidebar from '@/components/workspace/Sidebar';
import WorkspaceHeader from '@/components/workspace/WorkspaceHeader';
import MobileNav from '@/components/workspace/MobileNav';
import LoadingState from '@/components/ui/LoadingState';

import { getRoleDefaultDashboard } from '@/lib/util/roleRedirect';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }

    const isStaffRole = ['staff', 'admin', 'ops_head', 'field_staff'].includes(user.role);
    if (!isStaffRole) {
      router.replace(getRoleDefaultDashboard(user.role));
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <LoadingState label="Authenticating Staff workspace…" />;
  }

  const isStaffRole = ['staff', 'admin', 'ops_head', 'field_staff'].includes(user.role);
  if (!isStaffRole) {
    return null;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 flex-shrink-0">
        <Sidebar role="staff" companyName="Craly Staff Operations" />
      </div>

      {/* Mobile Drawer */}
      <MobileNav
        role="staff"
        companyName="Craly Staff Operations"
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <WorkspaceHeader
          userRole="staff"
          companyName="Craly Operations"
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
