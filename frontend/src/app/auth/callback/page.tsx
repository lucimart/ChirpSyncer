'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styled from 'styled-components';
import { useAuth } from '@/lib/auth';
import { Spinner, Alert, AuthLayout } from '@/components/ui';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[4]};
  min-height: 200px;
`;

const StatusText = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.base};
  text-align: center;
`;

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setToken } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    if (processed) return;

    const processAuth = async () => {
      const token = searchParams.get('token');
      const refreshToken = searchParams.get('refresh_token');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setStatus('error');
        const errorMessages: Record<string, string> = {
          oauth_denied: 'Authentication was cancelled or denied.',
          oauth_invalid: 'Invalid OAuth response. Please try again.',
          oauth_state_invalid: 'Security verification failed. Please try again.',
          oauth_token_error: 'Failed to authenticate with provider. Please try again.',
          oauth_token_missing: 'Authentication token not received. Please try again.',
          oauth_userinfo_error: 'Failed to get user information. Please try again.',
          user_not_found: 'User account not found.',
          user_creation_failed: 'Failed to create account. Please try again.',
        };
        setError(errorMessages[errorParam] || 'An error occurred during authentication.');
        setProcessed(true);
        return;
      }

      if (!token) {
        setStatus('error');
        setError('No authentication token received.');
        setProcessed(true);
        return;
      }

      // Store and verify the token (waits for user verification)
      await setToken(token, refreshToken || undefined);
      setProcessed(true);

      // Check if auth succeeded
      const { isAuthenticated, user } = useAuth.getState();
      if (isAuthenticated && user) {
        setStatus('success');
        // Small delay for UX before redirect
        setTimeout(() => {
          router.push('/dashboard');
        }, 300);
      } else {
        setStatus('error');
        setError('Failed to verify authentication. Please try logging in again.');
      }
    };

    processAuth();
  }, [searchParams, setToken, router, processed]);

  return (
    <Container>
      {status === 'processing' && (
        <>
          <Spinner size="lg" />
          <StatusText>Completing authentication...</StatusText>
        </>
      )}

      {status === 'success' && (
        <>
          <Spinner size="lg" />
          <StatusText>Success! Redirecting to dashboard...</StatusText>
        </>
      )}

      {status === 'error' && (
        <>
          <Alert variant="error">{error}</Alert>
          <StatusText>
            <a href="/login" style={{ color: 'inherit', textDecoration: 'underline' }}>
              Return to login
            </a>
          </StatusText>
        </>
      )}
    </Container>
  );
}

function LoadingFallback() {
  return (
    <Container>
      <Spinner size="lg" />
      <StatusText>Loading...</StatusText>
    </Container>
  );
}

export default function AuthCallbackPage() {
  return (
    <AuthLayout subtitle="Completing sign in...">
      <Suspense fallback={<LoadingFallback />}>
        <AuthCallbackContent />
      </Suspense>
    </AuthLayout>
  );
}
