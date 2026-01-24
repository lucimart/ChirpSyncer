'use client';

import { useState, type FC, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { GlobalStyle } from '@/styles/GlobalStyle';
import { ThemeProvider } from '@/styles/ThemeContext';
import { RealtimeProvider } from '@/providers/RealtimeProvider';
import { ToastProvider } from '@/components/ui/Toast';
import StyledComponentsRegistry from './StyledComponentsRegistry';

const CommandPalette = dynamic(
  () => import('@/components/ui/CommandPalette').then((mod) => mod.CommandPalette),
  { ssr: false }
);

/** Query client configuration */
const QUERY_CLIENT_CONFIG = {
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
} as const;

export interface ProvidersProps {
  children: ReactNode;
}

/**
 * Root providers wrapper for the application.
 * Provides: styled-components, react-query, theme, realtime, and toast contexts.
 */
export const Providers: FC<ProvidersProps> = ({ children }) => {
  const [queryClient] = useState(() => new QueryClient(QUERY_CLIENT_CONFIG));

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
};
