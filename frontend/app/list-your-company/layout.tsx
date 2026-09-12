import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'List Your Company | Contractor Registration',
  description:
    'Register your labour contractor business with Craly to get verified and connect with manufacturers looking for workforce partners across India.',
  alternates: {
    canonical: '/list-your-company',
  },
  openGraph: {
    title: 'List Your Company | Craly Contractor Onboarding',
    description:
      'Register your labour contractor business with Craly to get verified and connect with manufacturers looking for workforce partners across India.',
    url: 'https://craly.co/list-your-company',
  },
};

export default function ListYourCompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
