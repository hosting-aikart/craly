import type { Metadata } from 'next';
import HomeClient from '@/components/home/HomeClient';
import { generateWebSiteSchema } from '@/lib/seo/structuredData';

export const metadata: Metadata = {
  title: 'Craly | Smarter Way to Hire Labour Contractors',
  description:
    'Evaluate and hire verified labour contractors for manufacturing, EPC, and industrial projects with transparent work history and compliance details.',
  alternates: {
    canonical: '/',
  },
};

export default function HomePage() {
  const websiteSchema = generateWebSiteSchema();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <HomeClient />
    </>
  );
}
