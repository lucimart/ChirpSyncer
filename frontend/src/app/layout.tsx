import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import { themeInitScript } from '@/styles/ThemeContext';

export const metadata: Metadata = {
  title: {
    default: 'ChirpSyncer - Social Hub Dashboard',
    template: '%s | ChirpSyncer',
  },
  description: 'Manage your social media presence across Twitter and Bluesky',
  applicationName: 'ChirpSyncer',
  keywords: ['social media', 'twitter', 'bluesky', 'sync', 'dashboard', 'analytics'],
  authors: [{ name: 'ChirpSyncer Team' }],
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
