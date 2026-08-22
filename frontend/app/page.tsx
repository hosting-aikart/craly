'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';
import Hero from '@/components/Hero';
import RoleSelect from '@/components/RoleSelect';
import TrustSection from '@/components/TrustSection';
import WhyCraly from '@/components/WhyCraly';
import HowItWorks from '@/components/HowItWorks';
import BuiltFor from '@/components/BuiltFor';
import ContactSection from '@/components/ContactSection';
import FAQ from '@/components/FAQ';
import Foot from '@/components/Foot';
import LoadingState from '@/components/ui/LoadingState';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) {
      if (user.role === 'admin') {
        router.replace('/admin/dashboard');
      } else if (user.role === 'business') {
        router.replace('/business/dashboard');
      } else {
        router.replace('/contractor/dashboard');
      }
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingState label="Redirecting to workspace…" />
      </div>
    );
  }

  return (
    <main>
      <Hero />
      <RoleSelect />
      <TrustSection />
      <WhyCraly />
      <HowItWorks />
      <BuiltFor />
      <ContactSection />
      <FAQ />
      <Foot />
    </main>
  );
}
