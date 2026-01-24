'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { PageHeader, Stack } from '@/components/ui';
import { AlgorithmDashboard } from '@/components/algorithm-dashboard/AlgorithmDashboard';
import { useAlgorithmStats } from '@/hooks/useAlgorithmStats';

const QUERY_KEY = ['algorithm-settings'] as const;

export default function AlgorithmPage() {
  const router = useRouter();
  const { data, loading, error } = useAlgorithmStats();

  const { data: settings } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const response = await fetch('/api/v1/algorithm/settings');
      const payload = await response.json();
      if (!response.ok || payload?.success === false) {
        return { algorithm_enabled: true };
      }
      return payload?.data ?? payload;
    },
  });

  const [algorithmEnabled, setAlgorithmEnabled] = useState(true);

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

  const handleViewRule = useCallback(() => {
    router.push('/dashboard/feed-lab');
  }, [router]);

  const errorObj = useMemo(
    () => (error ? new Error(error) : null),
    [error]
  );

  return (
    <Stack>
      <PageHeader
        title="Algorithm Dashboard"
        description="Review your transparency score and see how rules shape the feed."
      />

      <AlgorithmDashboard
        stats={data ?? undefined}
        isLoading={loading}
        error={errorObj}
        algorithmEnabled={algorithmEnabled}
        onToggleAlgorithm={handleToggle}
        onViewRule={handleViewRule}
        useNivo
      />
    </Stack>
  );
}
