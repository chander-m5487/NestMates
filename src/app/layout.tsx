import type { Metadata } from 'next';
import { Outfit, Sora, JetBrains_Mono } from 'next/font/google';
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

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'NestMates - Find Housing, Rides & Events in Your Community',
  description: 'The trusted platform for immigrants and students to find housing, ride shares, and local community events worldwide.',
  keywords: ['community', 'housing', 'accommodation', 'ride share', 'events', 'international students', 'immigrants', 'expats'],
  authors: [{ name: 'NestMates Team' }],
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  openGraph: {
    title: 'NestMates - Your Community, Connected',
    description: 'Find housing, rides, and events in your community worldwide.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NestMates',
    description: 'Find housing, rides, and events in your community worldwide.',
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
      <body className={`${outfit.variable} ${sora.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}

