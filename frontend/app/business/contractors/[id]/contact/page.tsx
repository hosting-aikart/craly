'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingState from '@/components/ui/LoadingState';

/**
 * Deactivated — this was the actual direct-contact bypass: it let a
 * Manufacturer send a contractor an enquiry (createEnquiry) with no
 * requirement, no matching, no Staff involvement, and no contact-privacy
 * boundary at all. See app/business/contractors/page.tsx for the full
 * rationale. Publishing a requirement is the only supported way to reach a
 * contractor now.
 */
export default function DeactivatedContactContractorPage() {
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
