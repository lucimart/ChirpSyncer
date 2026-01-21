'use client';

import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { AlgorithmDashboard } from '@/components/algorithm-dashboard/AlgorithmDashboard';
import { useAlgorithmStats } from '@/hooks/useAlgorithmStats';

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const HeaderLeft = styled.div``;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const PageDescription = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

export default function AlgorithmPage() {
  const router = useRouter();
  const { data, loading, error } = useAlgorithmStats();

  const { data: settings } = useQuery({
    queryKey: ['algorithm-settings'],
    queryFn: async () => {
      const response = await fetch('/api/v1/algorithm/settings');
      const payload = await response.json();
      if (!response.ok || payload?.success === false) {
        return { algorithm_enabled: true };
      }
      return payload?.data ?? payload;
    },
  });

  const [algorithmEnabled, setAlgorithmEnabled] = useState<boolean>(true);

  useEffect(() => {
    if (typeof settings?.algorithm_enabled === 'boolean') {
      setAlgorithmEnabled(settings.algorithm_enabled);
    }
  }, [settings?.algorithm_enabled]);

  const updateSettings = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await fetch('/api/v1/algorithm/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ algorithm_enabled: enabled }),
      });
      const payload = await response.json();
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error?.message || 'Failed to update settings');
      }
      return payload?.data ?? payload;
    },
    onSuccess: (result) => {
      setAlgorithmEnabled(Boolean(result.algorithm_enabled));
    },
  });

  const handleToggle = useCallback(
    (enabled: boolean) => {
      setAlgorithmEnabled(enabled);
      updateSettings.mutate(enabled);
    },
    [updateSettings]
  );

  return (
    <div>
      <PageHeader>
        <HeaderLeft>
          <PageTitle>Algorithm Dashboard</PageTitle>
          <PageDescription>
            Review your transparency score and see how rules shape the feed.
          </PageDescription>
        </HeaderLeft>
      </PageHeader>

      <AlgorithmDashboard
        stats={data ?? undefined}
        isLoading={loading}
        error={error ? new Error(error) : null}
        algorithmEnabled={algorithmEnabled}
        onToggleAlgorithm={handleToggle}
        onViewRule={() => router.push('/dashboard/feed-lab')}
      />
    </div>
  );
}
