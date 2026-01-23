'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Button, Input, Alert, AuthLayout, AuthFooter, Form, TextLink, SocialLoginButtons } from '@/components/ui';

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
    <AuthLayout subtitle="Sign in to your account">
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

        <div style={{ marginTop: '-8px' }}>
          <TextLink href="/forgot-password" align="right" block>
            Forgot your password?
          </TextLink>
        </div>

        <Button type="submit" fullWidth isLoading={isLoading}>
          Sign In
        </Button>

        <SocialLoginButtons mode="login" disabled={isLoading} />
      </Form>

      <AuthFooter>
        Don&apos;t have an account?{' '}
        <Link href="/register">Create one</Link>
      </AuthFooter>
    </AuthLayout>
  );
}
