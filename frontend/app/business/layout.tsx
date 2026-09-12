import type { Metadata } from 'next';
import BusinessWorkspaceClient from '@/components/workspace/BusinessWorkspaceClient';

export const metadata: Metadata = {
  title: 'Manufacturer Workspace',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BusinessWorkspaceClient>{children}</BusinessWorkspaceClient>;
}
