import type { Metadata } from 'next';
import ContractorPortalClient from '@/components/workspace/ContractorPortalClient';

export const metadata: Metadata = {
  title: 'Contractor Portal',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function ContractorPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ContractorPortalClient>{children}</ContractorPortalClient>;
}
