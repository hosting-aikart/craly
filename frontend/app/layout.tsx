import type { Metadata } from 'next';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';
import { AuthProvider } from '@/lib/auth/useAuth';
import { SocketProvider } from '@/lib/socket/SocketContext';
import Navbar from '@/components/Navbar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Craly — Smarter Way to Hire Labour Contractors',
  description:
    'Craly is a contractor verification platform that helps businesses evaluate labour contractors through verified business information, work history, and compliance details before hiring.',
  keywords: 'contractor verification, labour contractor, hiring, India, EPC, manufacturing',
  openGraph: {
    title: 'Craly — Smarter Way to Hire Labour Contractors',
    description:
      'Verified contractor profiles for modern businesses. Build trust before the first phone call.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      </head>
      <body>
        <AuthProvider>
          <SocketProvider>
            <LanguageProvider>
              <Navbar />
              {children}
            </LanguageProvider>
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
