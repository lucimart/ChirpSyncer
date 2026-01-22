'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styled from 'styled-components';
import { Repeat, ArrowLeft, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Button, Input, Card } from '@/components/ui';

const PageContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => 
    theme.mode === 'dark' 
      ? `linear-gradient(135deg, ${theme.colors.neutral[900]} 0%, ${theme.colors.neutral[800]} 100%)`
      : `linear-gradient(135deg, ${theme.colors.neutral[100]} 0%, ${theme.colors.neutral[50]} 100%)`
  };
`;

const ResetCard = styled(Card)`
  width: 100%;
  max-width: 400px;
  box-shadow: ${({ theme }) => theme.shadows.xl};
`;

const Logo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const LogoIcon = styled.div`
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary[500]} 0%, ${({ theme }) => theme.colors.primary[600]} 100%);
  color: white;
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  box-shadow: 0 4px 14px ${({ theme }) => theme.colors.primary[500]}40;
`;

const LogoText = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  color: ${({ theme }) => theme.colors.primary[600]};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-top: ${({ theme }) => theme.spacing[1]};
  text-align: center;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const ErrorMessage = styled.div`
  padding: ${({ theme }) => theme.spacing[3]};
  background-color: ${({ theme }) => theme.colors.danger[50]};
  border: 1px solid ${({ theme }) => theme.colors.danger[500]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.danger[700]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const StatusMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const StatusIcon = styled.div<{ $variant: 'success' | 'error' }>`
  width: 64px;
  height: 64px;
  background-color: ${({ theme, $variant }) => 
    $variant === 'success' ? theme.colors.success[50] : theme.colors.danger[50]};
  color: ${({ theme, $variant }) => 
    $variant === 'success' ? theme.colors.success[600] : theme.colors.danger[600]};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StatusTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const StatusText = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const BackLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: ${({ theme }) => theme.spacing[6]};
  
  &:hover {
    color: ${({ theme }) => theme.colors.primary[600]};
  }
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsValidating(false);
        setIsTokenValid(false);
        return;
      }

      const result = await api.validateResetToken(token);
      setIsValidating(false);
      
      if (result.success && result.data?.valid) {
        setIsTokenValid(true);
        setUserEmail(result.data.email);
      } else {
        setIsTokenValid(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    const result = await api.resetPassword(token!, newPassword);

    setIsLoading(false);

    if (result.success) {
      setIsSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } else {
      setError(result.error || 'Failed to reset password');
    }
  };

  if (isValidating) {
    return (
      <PageContainer>
        <ResetCard padding="lg">
          <Logo>
            <LogoIcon>
              <Repeat size={28} />
            </LogoIcon>
            <LogoText>ChirpSyncer</LogoText>
          </Logo>
          <LoadingState>
            <p>Validating reset link...</p>
          </LoadingState>
        </ResetCard>
      </PageContainer>
    );
  }

  if (!isTokenValid) {
    return (
      <PageContainer>
        <ResetCard padding="lg">
          <Logo>
            <LogoIcon>
              <Repeat size={28} />
            </LogoIcon>
            <LogoText>ChirpSyncer</LogoText>
          </Logo>
          <StatusMessage>
            <StatusIcon $variant="error">
              <AlertCircle size={32} />
            </StatusIcon>
            <StatusTitle>Invalid or Expired Link</StatusTitle>
            <StatusText>
              This password reset link is invalid or has expired.
              Please request a new one.
            </StatusText>
            <Link href="/forgot-password">
              <Button>Request New Link</Button>
            </Link>
            <BackLink href="/login">
              <ArrowLeft size={16} />
              Back to sign in
            </BackLink>
          </StatusMessage>
        </ResetCard>
      </PageContainer>
    );
  }

  if (isSuccess) {
    return (
      <PageContainer>
        <ResetCard padding="lg">
          <Logo>
            <LogoIcon>
              <Repeat size={28} />
            </LogoIcon>
            <LogoText>ChirpSyncer</LogoText>
          </Logo>
          <StatusMessage>
            <StatusIcon $variant="success">
              <CheckCircle size={32} />
            </StatusIcon>
            <StatusTitle>Password Reset Successfully</StatusTitle>
            <StatusText>
              Your password has been reset. You will be redirected to the login page shortly.
            </StatusText>
            <Link href="/login">
              <Button>Sign In Now</Button>
            </Link>
          </StatusMessage>
        </ResetCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <ResetCard padding="lg">
        <Logo>
          <LogoIcon>
            <Repeat size={28} />
          </LogoIcon>
          <LogoText>ChirpSyncer</LogoText>
          <Subtitle>
            Create a new password for {userEmail}
          </Subtitle>
        </Logo>

        <Form onSubmit={handleSubmit}>
          {error && <ErrorMessage>{error}</ErrorMessage>}

          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            hint="At least 8 characters"
            required
            fullWidth
            autoComplete="new-password"
          />

          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            required
            fullWidth
            autoComplete="new-password"
          />

          <Button type="submit" fullWidth isLoading={isLoading}>
            <Lock size={18} />
            Reset Password
          </Button>
        </Form>

        <BackLink href="/login">
          <ArrowLeft size={16} />
          Back to sign in
        </BackLink>
      </ResetCard>
    </PageContainer>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <PageContainer>
        <ResetCard padding="lg">
          <LoadingState>
            <p>Loading...</p>
          </LoadingState>
        </ResetCard>
      </PageContainer>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
