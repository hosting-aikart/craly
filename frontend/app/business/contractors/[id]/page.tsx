'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingState from '@/components/ui/LoadingState';

/**
 * Deactivated — see app/business/contractors/page.tsx for why. A specific
 * contractor's profile isn't meaningful outside the requirement/application
 * context anymore, so this redirects to Requirements rather than a
 * dead-end profile view.
 */
export default function DeactivatedBusinessContractorProfilePage() {
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
