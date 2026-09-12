import type { Metadata } from 'next';
import StaffWorkspaceClient from '@/components/workspace/StaffWorkspaceClient';

export const metadata: Metadata = {
  title: 'Staff Operations',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StaffWorkspaceClient>{children}</StaffWorkspaceClient>;
}
