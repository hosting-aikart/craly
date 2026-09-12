import type { Metadata } from 'next';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import { AuthProvider } from '@/lib/auth/useAuth';
import { SocketProvider } from '@/lib/socket/SocketContext';
import GoogleTranslateScript from '@/components/language/GoogleTranslateScript';
import Navbar from '@/components/Navbar';
import { generateOrganizationSchema } from '@/lib/seo/structuredData';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://craly.co';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Craly | Smarter Way to Hire Labour Contractors',
    template: '%s | Craly',
  },
  description:
    'Craly is a contractor verification and discovery platform that helps manufacturers evaluate labour contractors through verified business details, experience, and workforce capacity before hiring.',
  keywords: [
    'contractor verification',
    'labour contractor',
    'industrial hiring',
    'India',
    'EPC',
    'manufacturing workforce',
    'verified contractors',
    'manpower contractors',
  ],
  authors: [{ name: 'Craly' }],
  creator: 'Craly',
  publisher: 'Craly',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: siteUrl,
    siteName: 'Craly',
    title: 'Craly | Smarter Way to Hire Labour Contractors',
    description:
      'Verified contractor profiles for modern businesses. Build trust before the first phone call.',
    images: [
      {
        url: '/assets/craly-logo.png',
        width: 1200,
        height: 630,
        alt: 'Craly - Smarter Way to Hire Labour Contractors',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Craly | Smarter Way to Hire Labour Contractors',
    description:
      'Verified contractor profiles for modern businesses. Build trust before the first phone call.',
    images: ['/assets/craly-logo.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const orgSchema = generateOrganizationSchema();

  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@400;500;600;700;800;900&family=Poppins:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
      </head>
      <body>
        <AuthProvider>
          <SocketProvider>
            <LanguageProvider>
              <Navbar />
              {children}
              <GoogleTranslateScript />
            </LanguageProvider>
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

