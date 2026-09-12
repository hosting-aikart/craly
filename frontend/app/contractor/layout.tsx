import type { Metadata } from 'next';
import ContractorWorkspaceClient from '@/components/workspace/ContractorWorkspaceClient';

export const metadata: Metadata = {
  title: 'Field Operations',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function ContractorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ContractorWorkspaceClient>{children}</ContractorWorkspaceClient>;
}
