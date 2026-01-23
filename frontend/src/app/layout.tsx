import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import { themeInitScript } from '@/styles/ThemeContext';

export const metadata: Metadata = {
  title: {
    default: 'Swoop - Your Social Hub',
    template: '%s | Swoop',
  },
  description: 'Swoop your content everywhere. Cross-post between Twitter, Bluesky, and more.',
  applicationName: 'Swoop',
  keywords: ['social media', 'twitter', 'bluesky', 'sync', 'dashboard', 'analytics', 'cross-post'],
  authors: [{ name: 'Swoop Team' }],
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/icon.svg',
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
