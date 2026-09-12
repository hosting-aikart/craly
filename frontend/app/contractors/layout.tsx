import type { Metadata } from 'next';
import { generateBreadcrumbSchema } from '@/lib/seo/structuredData';

export const metadata: Metadata = {
  title: 'Browse Verified Labour Contractors',
  description:
    'Search and evaluate verified labour contractors across India by city, industry category, experience, and workforce size.',
  alternates: {
    canonical: '/contractors',
  },
  openGraph: {
    title: 'Browse Verified Labour Contractors | Craly',
    description:
      'Search and evaluate verified labour contractors across India by city, industry category, experience, and workforce size.',
    url: 'https://craly.co/contractors',
  },
};

export default function ContractorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const breadcrumbs = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Contractors', url: '/contractors' },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      {children}
    </>
  );
}
