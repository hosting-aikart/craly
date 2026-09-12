import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://craly.co';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/contractors',
          '/contractors/*',
          '/list-your-company',
          '/assets/*',
          '/_next/static/*',
        ],
        disallow: [
          '/business/',
          '/contractor/',
          '/contractor-portal/',
          '/staff/',
          '/admin/',
          '/login',
          '/signup',
          '/onboarding',
          '/notifications',
          '/api/',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
