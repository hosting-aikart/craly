import type { MetadataRoute } from 'next';
import { getApiUrl } from '@/lib/api';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://craly.co';

interface ContractorItem {
  id: string;
  updated_at?: string;
  created_at?: string;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${siteUrl}/contractors`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/list-your-company`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  let contractorPages: MetadataRoute.Sitemap = [];

  try {
    const url = getApiUrl('/contractors?limit=50');
    const res = await fetch(url, {
      next: { revalidate: 3600 },
    });

    if (res.ok) {
      const json = await res.json();
      const contractors: ContractorItem[] = json?.data || [];

      contractorPages = contractors.map((c) => ({
        url: `${siteUrl}/contractors/${c.id}`,
        lastModified: c.updated_at ? new Date(c.updated_at) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      }));
    }
  } catch {
    // If backend is unreachable at build time, continue gracefully with static routes
  }

  return [...staticPages, ...contractorPages];
}
