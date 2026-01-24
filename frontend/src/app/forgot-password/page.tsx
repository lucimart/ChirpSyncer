'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import styled from 'styled-components';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Button, Input, Alert, AuthLayout, Form, Stack, Typography, SmallText } from '@/components/ui';

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

const DevNoteLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary[600]};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  word-break: break-all;
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
    <AuthLayout
      subtitle={
        isSuccess
          ? undefined
          : "Enter your email address and we'll send you a link to reset your password."
      }
    >
      {isSuccess ? (
        <Stack align="center" gap={4} style={{ textAlign: 'center' }}>
          <SuccessIcon>
            <CheckCircle size={32} />
          </SuccessIcon>
          <Typography variant="h3">Check your email</Typography>
          <SmallText>
            If an account with that email exists, we&apos;ve sent you a password reset link.
            Please check your inbox and spam folder.
          </SmallText>

          {devResetUrl && (
            <Alert variant="warning" title="Development Mode">
              Email sending is disabled. Use this link to reset your password:
              <br />
              <DevNoteLink href={devResetUrl}>{devResetUrl}</DevNoteLink>
            </Alert>
          )}

          <BackLink href="/login">
            <ArrowLeft size={16} />
            Back to sign in
          </BackLink>
        </Stack>
      ) : (
        <>
          <Form onSubmit={handleSubmit}>
            {error && <Alert variant="error">{error}</Alert>}

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
    </AuthLayout>
  );
}
