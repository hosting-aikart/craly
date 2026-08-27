'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingState from '@/components/ui/LoadingState';

/**
 * Deactivated. This used to let a Manufacturer browse the contractor
 * directory and message a contractor directly — bypassing
 * Requirement → Matching → Application → Comparison → Selection → Craly
 * Staff coordination entirely, and with it the contact-privacy boundary
 * (Manufacturer/Contractor never see each other's phone/email before Staff
 * coordinates). The real, supported comparison flow is requirement-scoped:
 * /business/requirements/[id]/applications. Kept as a redirect rather than
 * deleted outright so the existing links into this route (the public
 * /contractors directory, and the legacy /business/enquiries "Find
 * Contractors" button) don't 404.
 */
export default function DeactivatedBusinessContractorsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/business/requirements');
  }, [router]);

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <LoadingState label="Redirecting to Requirements…" />
    </div>
  );
}
