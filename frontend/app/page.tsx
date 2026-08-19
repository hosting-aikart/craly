import Hero from '@/components/Hero';
import TrustSection from '@/components/TrustSection';
import WhyCraly from '@/components/WhyCraly';
import HowItWorks from '@/components/HowItWorks';
import BuiltFor from '@/components/BuiltFor';
import FAQ from '@/components/FAQ';
import Foot from '@/components/Foot';

export default function HomePage() {
  return (
    <main>
      <Hero />
      <TrustSection />
      <WhyCraly />
      <HowItWorks />
      <BuiltFor />
      <FAQ />
      <Foot />
    </main>
  );
}
