'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import styled from 'styled-components';
import { Repeat, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
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

const ForgotCard = styled(Card)`
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

const SuccessMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const SuccessIcon = styled.div`
  width: 64px;
  height: 64px;
  background-color: ${({ theme }) => theme.colors.success[50]};
  color: ${({ theme }) => theme.colors.success[600]};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const SuccessTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const SuccessText = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const DevNote = styled.div`
  margin-top: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[3]};
  background-color: ${({ theme }) => theme.colors.warning[50]};
  border: 1px solid ${({ theme }) => theme.colors.warning[500]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.warning[700]};
  
  a {
    color: ${({ theme }) => theme.colors.primary[600]};
    font-weight: ${({ theme }) => theme.fontWeights.medium};
    word-break: break-all;
  }
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await api.forgotPassword(email);

    setIsLoading(false);

    if (result.success) {
      setIsSuccess(true);
      // In development, show the reset URL
      if (result.data?.dev_reset_url) {
        setDevResetUrl(result.data.dev_reset_url);
      }
    } else {
      setError(result.error || 'Failed to send reset email');
    }
  };

  return (
    <PageContainer>
      <ForgotCard padding="lg">
        <Logo>
          <LogoIcon>
            <Repeat size={28} />
          </LogoIcon>
          <LogoText>ChirpSyncer</LogoText>
          {!isSuccess && (
            <Subtitle>
              Enter your email address and we&apos;ll send you a link to reset your password.
            </Subtitle>
          )}
        </Logo>

        {isSuccess ? (
          <SuccessMessage>
            <SuccessIcon>
              <CheckCircle size={32} />
            </SuccessIcon>
            <SuccessTitle>Check your email</SuccessTitle>
            <SuccessText>
              If an account with that email exists, we&apos;ve sent you a password reset link.
              Please check your inbox and spam folder.
            </SuccessText>
            
            {devResetUrl && (
              <DevNote>
                <strong>Development Mode:</strong> Email sending is disabled. 
                Use this link to reset your password:
                <br />
                <Link href={devResetUrl}>{devResetUrl}</Link>
              </DevNote>
            )}
            
            <BackLink href="/login">
              <ArrowLeft size={16} />
              Back to sign in
            </BackLink>
          </SuccessMessage>
        ) : (
          <>
            <Form onSubmit={handleSubmit}>
              {error && <ErrorMessage>{error}</ErrorMessage>}

              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                fullWidth
                autoComplete="email"
              />

              <Button type="submit" fullWidth isLoading={isLoading}>
                <Mail size={18} />
                Send Reset Link
              </Button>
            </Form>

            <BackLink href="/login">
              <ArrowLeft size={16} />
              Back to sign in
            </BackLink>
          </>
        )}
      </ForgotCard>
    </PageContainer>
  );
}
