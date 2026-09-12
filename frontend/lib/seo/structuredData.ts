/**
 * Structured Data (JSON-LD) Generators for Craly SEO
 * Conforms to Schema.org standards.
 */

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://craly.co';

export interface ContractorSchemaData {
  id: string;
  company_name: string;
  description?: string | null;
  city?: string | null;
  state?: string | null;
  years_experience?: number | null;
  workforce_size?: number | null;
  categories?: { id: string | number; name: string; slug?: string }[];
}

/**
 * Site-wide Organization JSON-LD Schema
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: 'Craly',
    url: SITE_URL,
    logo: `${SITE_URL}/assets/craly-logo.png`,
    description:
      'Craly is a B2B contractor verification and discovery platform helping manufacturers and businesses evaluate and hire verified labour contractors in India.',
    email: 'hello@craly.com',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'IN',
    },
    sameAs: [],
  };
}

/**
 * WebSite JSON-LD Schema with SearchAction
 */
export function generateWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: 'Craly',
    description: 'Smarter Way to Hire Verified Labour Contractors',
    publisher: {
      '@id': `${SITE_URL}/#organization`,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/contractors?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * BreadcrumbList JSON-LD Schema
 */
export function generateBreadcrumbSchema(
  items: { name: string; url: string }[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}

/**
 * Contractor Profile JSON-LD Schema (LocalBusiness / ProfessionalService)
 * Excludes all private/sensitive fields (phone, email, KYC docs) for privacy.
 */
export function generateContractorSchema(contractor: ContractorSchemaData) {
  const addressLocality = contractor.city || undefined;
  const addressRegion = contractor.state || undefined;
  const hasAddress = addressLocality || addressRegion;

  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${SITE_URL}/contractors/${contractor.id}#business`,
    name: contractor.company_name,
    description:
      contractor.description ||
      `${contractor.company_name} is a verified labour contractor on Craly.`,
    url: `${SITE_URL}/contractors/${contractor.id}`,
    ...(hasAddress && {
      address: {
        '@type': 'PostalAddress',
        addressLocality,
        addressRegion,
        addressCountry: 'IN',
      },
    }),
    ...(contractor.categories && contractor.categories.length > 0 && {
      knowsAbout: contractor.categories.map((c) => c.name),
    }),
    isAccessibleForFree: true,
  };
}
