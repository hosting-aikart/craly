import type { Metadata } from 'next';
import AdminWorkspaceClient from '@/components/workspace/AdminWorkspaceClient';

export const metadata: Metadata = {
  title: 'Admin Operations',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminWorkspaceClient>{children}</AdminWorkspaceClient>;
}
