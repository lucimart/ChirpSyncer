'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'styled-components';
import { useAuth } from '@/lib/auth';
import { Spinner, Stack } from '@/components/ui';

export default function Home() {
  const router = useRouter();
  const theme = useTheme();
  const { isAuthenticated, isLoading, checkAuth } = useAuth();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading) {
      router.replace(isAuthenticated ? '/dashboard' : '/login');
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <Stack
      align="center"
      justify="center"
      style={{
        minHeight: '100vh',
        backgroundColor: theme.colors.background.secondary,
      }}
    >
      <Spinner size="lg" />
    </Stack>
  );
}
