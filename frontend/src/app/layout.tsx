import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import { themeInitScript } from '@/styles/ThemeContext';

export const metadata: Metadata = {
  title: 'ChirpSyncer - Social Hub Dashboard',
  description: 'Manage your social media presence across Twitter and Bluesky',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
