'use client';

import { useEffect } from 'react';
import styled from 'styled-components';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: ${({ theme }) => theme.spacing[6]};
  text-align: center;
  background-color: ${({ theme }) => theme.colors.background.primary};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  margin-top: ${({ theme }) => theme.spacing[6]};
`;

const IconWrapper = styled.div`
  color: ${({ theme }) => theme.colors.danger[500]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  
  svg {
    width: 48px;
    height: 48px;
  }
`;

const Title = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const Message = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  max-width: 400px;
  line-height: 1.5;
`;

const ErrorDetails = styled.pre`
  background-color: ${({ theme }) => theme.colors.background.tertiary};
  padding: ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  max-width: 100%;
  overflow-x: auto;
  text-align: left;
`;

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to console
    console.error(error);
  }, [error]);

  return (
    <ErrorContainer role="alert" aria-live="assertive">
      <IconWrapper>
        <AlertCircle aria-hidden="true" />
      </IconWrapper>
      
      <Title>Something went wrong</Title>
      
      <Message>
        We encountered an error while loading the algorithm dashboard. 
        Please try refreshing the page.
      </Message>

      {process.env.NODE_ENV === 'development' && error.message && (
        <ErrorDetails>
          {error.message}
        </ErrorDetails>
      )}

      <Button onClick={() => reset()} variant="primary" size="md">
        <RefreshCw size={16} />
        Try again
      </Button>
    </ErrorContainer>
  );
}
