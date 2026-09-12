import type { Metadata } from 'next';
import { getApiUrl } from '@/lib/api';
import type { ContractorDetail } from '@/lib/api/contractors';
import ContractorProfileClient from '@/components/contractors/ContractorProfileClient';
import {
  generateContractorSchema,
  generateBreadcrumbSchema,
} from '@/lib/seo/structuredData';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function fetchContractor(id: string): Promise<ContractorDetail | null> {
  try {
    const url = getApiUrl(`/contractors/${id}`);
    const res = await fetch(url, {
      next: { revalidate: 60 }, // ISR cache for 60 seconds
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const contractor = await fetchContractor(id);

  if (!contractor) {
    return {
      title: 'Contractor Profile',
      description: 'Verified contractor profile on Craly.',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const location = [contractor.city, contractor.state].filter(Boolean).join(', ');
  const categoryNames = contractor.categories?.map((c) => c.name).join(', ');
  const title = `${contractor.company_name} - Verified Labour Contractor in ${contractor.city || 'India'}`;
  const description = `${contractor.company_name} is a verified labour contractor${
    location ? ` in ${location}` : ''
  }${
    categoryNames ? ` specializing in ${categoryNames}` : ''
  }${
    contractor.years_experience ? ` with ${contractor.years_experience}+ years of experience` : ''
  }. View verified details on Craly.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/contractors/${id}`,
    },
    openGraph: {
      title: `${title} | Craly`,
      description,
      url: `https://craly.co/contractors/${id}`,
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Craly`,
      description,
    },
  };
}

export default async function ContractorProfilePage({ params }: PageProps) {
  const { id } = await params;
  const contractor = await fetchContractor(id);

  if (!contractor) {
    return (
      <ContractorProfileClient
        id={id}
        initialContractor={null}
        initialNotFound={true}
      />
    );
  }

  const contractorSchema = generateContractorSchema(contractor);
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Contractors', url: '/contractors' },
    { name: contractor.company_name, url: `/contractors/${id}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contractorSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <ContractorProfileClient
        id={id}
        initialContractor={contractor}
        initialNotFound={false}
      />
    </>
  );
}
