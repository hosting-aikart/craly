import Hero from '@/components/Hero';
import RoleSelect from '@/components/RoleSelect';
import TrustSection from '@/components/TrustSection';
import WhyCraly from '@/components/WhyCraly';
import HowItWorks from '@/components/HowItWorks';
import BuiltFor from '@/components/BuiltFor';
import ContactSection from '@/components/ContactSection';
import FAQ from '@/components/FAQ';
import Foot from '@/components/Foot';

export default function HomePage() {
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
