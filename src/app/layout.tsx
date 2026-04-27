import type { Metadata, Viewport } from 'next';
import { Outfit, Sora } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'NestMates - Find Housing in Your Community',
  description: 'The trusted housing platform for immigrants and international students. Find apartments, shared homes, and roommates worldwide.',
  keywords: ['housing', 'accommodation', 'roommates', 'international students', 'immigrants', 'expats', 'apartments'],
  authors: [{ name: 'NestMates Team' }],
  openGraph: {
    title: 'NestMates - Your Community, Your Home',
    description: 'Find trusted housing wherever life takes you.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NestMates',
    description: 'Find trusted housing wherever life takes you.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} ${sora.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
