'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styled from 'styled-components';
import { Repeat } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button, Input, Card, Alert } from '@/components/ui';

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

const LoginCard = styled(Card)`
  width: 100%;
  max-width: 400px;
  box-shadow: ${({ theme }) => theme.shadows.xl};
`;

const LoginCardContent = styled(Card.Content)`
  padding: 2rem;
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
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;


const ForgotPasswordLink = styled(Link)`
  display: block;
  text-align: right;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.primary[600]};
  margin-top: -${({ theme }) => theme.spacing[2]};
  
  &:hover {
    text-decoration: underline;
  }
`;

const Footer = styled.div`
  margin-top: ${({ theme }) => theme.spacing[6]};
  text-align: center;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};

  a {
    color: ${({ theme }) => theme.colors.primary[600]};
    font-weight: ${({ theme }) => theme.fontWeights.medium};
  }
`;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(username, password);

    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error || 'Login failed');
      setIsLoading(false);
    }
  };

  return (
    <PageContainer>
      <LoginCard padding="none">
        <LoginCardContent>
          <Logo>
            <LogoIcon>
              <Repeat size={28} />
            </LogoIcon>
            <LogoText>ChirpSyncer</LogoText>
            <Subtitle>Sign in to your account</Subtitle>
          </Logo>

          <Form onSubmit={handleSubmit}>
          {error && <Alert variant="error">{error}</Alert>}

            <Input
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              fullWidth
              autoComplete="username"
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              fullWidth
              autoComplete="current-password"
            />

            <ForgotPasswordLink href="/forgot-password">
              Forgot your password?
            </ForgotPasswordLink>

            <Button type="submit" fullWidth isLoading={isLoading}>
              Sign In
            </Button>
          </Form>

          <Footer>
            Don&apos;t have an account?{' '}
            <Link href="/register">Create one</Link>
          </Footer>
        </LoginCardContent>
      </LoginCard>
    </PageContainer>
  );
}
