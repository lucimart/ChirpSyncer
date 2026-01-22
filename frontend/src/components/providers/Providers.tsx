'use client';

import { ReactNode, useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GlobalStyle } from '@/styles/GlobalStyle';
import { ThemeProvider } from '@/styles/ThemeContext';
import StyledComponentsRegistry from './StyledComponentsRegistry';
import { RealtimeProvider } from '@/providers/RealtimeProvider';
import { ToastProvider } from '@/components/ui/Toast';
import dynamic from 'next/dynamic';

// Dynamically import CommandPalette to avoid SSR issues with useTheme
const CommandPalette = dynamic(
  () => import('@/components/ui/CommandPalette').then((mod) => mod.CommandPalette),
  { ssr: false }
);

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <StyledComponentsRegistry>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <GlobalStyle />
          <RealtimeProvider>
            <ToastProvider>
              {children}
              <CommandPalette />
            </ToastProvider>
          </RealtimeProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </StyledComponentsRegistry>
  );
}
