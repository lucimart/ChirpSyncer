'use client';

import { useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button, Card, Stack, SectionTitle, SmallText } from '@/components/ui';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const IconWrapper = styled.div`
  color: ${({ theme }) => theme.colors.danger[500]};
`;

const ErrorDetails = styled.pre`
  background-color: ${({ theme }) => theme.colors.background.tertiary};
  padding: ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
  max-width: 100%;
  overflow-x: auto;
  text-align: left;
`;

const ICON_SIZE = 48;

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <Card padding="lg" style={{ marginTop: '24px' }}>
      <Stack
        align="center"
        justify="center"
        gap={4}
        style={{ minHeight: '400px', textAlign: 'center' }}
        role="alert"
        aria-live="assertive"
      >
        <IconWrapper>
          <AlertCircle size={ICON_SIZE} aria-hidden="true" />
        </IconWrapper>

        <Stack align="center" gap={2}>
          <SectionTitle>Something went wrong</SectionTitle>
          <SmallText style={{ maxWidth: '400px', lineHeight: 1.5 }}>
            We encountered an error while loading the algorithm dashboard.
            Please try refreshing the page.
          </SmallText>
        </Stack>

        {process.env.NODE_ENV === 'development' && error.message && (
          <ErrorDetails>{error.message}</ErrorDetails>
        )}

        <Button onClick={handleReset} variant="primary" size="md">
          <RefreshCw size={16} />
          Try again
        </Button>
      </Stack>
    </Card>
  );
}
