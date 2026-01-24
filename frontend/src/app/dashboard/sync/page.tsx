'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Play,
} from 'lucide-react';
import {
  Button,
  Card,
  Progress,
  useToast,
  ConnectionStatus,
  EmptyState,
  PageHeader,
  StatCard,
  StatsGrid,
  PlatformIcon,
  SectionTitle,
  Stack,
  Typography,
  MetaItem,
  Grid,
} from '@/components/ui';
import { ConfettiCelebration } from '@/components/canvas';
import {
  useRealtimeMessage,
  SyncProgressPayload,
} from '@/providers/RealtimeProvider';
import { api } from '@/lib/api';

const DirectionStats = styled.div`
  display: flex;
  justify-content: space-around;
  padding: ${({ theme }) => theme.spacing[3]} 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const HistoryItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[3]};
  background-color: ${({ theme }) => theme.colors.background.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const HistoryIcon = styled.span<{ $status: string }>`
  color: ${({ $status, theme }) =>
    $status === 'success'
      ? theme.colors.success[500]
      : $status === 'failed'
        ? theme.colors.danger[500]
        : theme.colors.warning[500]};
`;

interface SyncStats {
  total_synced: number;
  last_sync: string | null;
  pending: number;
}

interface SyncHistory {
  id: number;
  direction: string;
  status: 'success' | 'failed' | 'pending';
  posts_synced: number;
  created_at: string;
}

interface SyncProgress {
  current: number;
  total: number;
  message: string;
}

export default function SyncPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useRealtimeMessage(
    'sync.progress',
    useCallback((payload: SyncProgressPayload) => {
      setSyncProgress({
        current: payload.current,
        total: payload.total,
        message: payload.message,
      });
    }, [])
  );

  useRealtimeMessage(
    'sync.complete',
    useCallback(
      (payload: { operation_id: string; synced: number }) => {
        setIsSyncing(false);
        setSyncProgress(null);
        queryClient.invalidateQueries({ queryKey: ['sync-stats'] });
        queryClient.invalidateQueries({ queryKey: ['sync-history'] });

        // Show confetti celebration for successful syncs with posts
        if (payload.synced > 0) {
          setShowConfetti(true);
        }

        addToast({
          type: 'success',
          title: 'Sync Complete',
          message: `Successfully synced ${payload.synced} posts`,
        });
      },
      [queryClient, addToast]
    )
  );

  const { data: stats } = useQuery<SyncStats>({
    queryKey: ['sync-stats'],
    queryFn: async () => {
      const response = await api.getSyncStats();
      if (response.success && response.data) {
        return {
          total_synced: response.data.total,
          last_sync: response.data.last_sync ?? null,
          pending: 0,
        };
      }
      throw new Error(response.error || 'Failed to fetch sync stats');
    },
  });

  const { data: history } = useQuery<SyncHistory[]>({
    queryKey: ['sync-history'],
    queryFn: async () => {
      const response = await api.getSyncHistory();
      if (response.success && response.data) {
        return response.data.items as SyncHistory[];
      }
      return [];
    },
  });

  const twitterToBluesky =
    history?.filter((item) =>
      item.direction.toLowerCase().startsWith('twitter')
    ).length ?? 0;
  const blueskyToTwitter =
    history?.filter((item) =>
      item.direction.toLowerCase().startsWith('bluesky')
    ).length ?? 0;

  const syncMutation = useMutation({
    mutationFn: async (direction: string) => {
      const response = await api.startSync();
      if (!response.success) {
        throw new Error(response.error || 'Failed to start sync');
      }
      return response.data;
    },
    onMutate: () => {
      setIsSyncing(true);
    },
    onSettled: () => {
      setIsSyncing(false);
      queryClient.invalidateQueries({ queryKey: ['sync-stats'] });
      queryClient.invalidateQueries({ queryKey: ['sync-history'] });
    },
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={20} />;
      case 'failed':
        return <XCircle size={20} />;
      default:
        return <Clock size={20} />;
    }
  };

  return (
    <div>
      <PageHeader
        title="Sync Dashboard"
        description="Manage synchronization between Twitter and Bluesky"
        actions={
          <>
            <ConnectionStatus />
            <Button
              onClick={() => syncMutation.mutate('both')}
              isLoading={isSyncing}
            >
              <RefreshCw size={18} />
              Sync Now
            </Button>
          </>
        }
      />

      {syncProgress && (
        <Card padding="md" style={{ marginBottom: '24px' }}>
          <Progress
            value={syncProgress.current}
            max={syncProgress.total}
            details={[
              { label: 'Progress', value: `${syncProgress.current}/${syncProgress.total}` },
              { label: 'Status', value: syncProgress.message },
            ]}
          />
        </Card>
      )}

      <StatsGrid minColumnWidth="200px">
        <StatCard
          value={stats?.total_synced ?? 0}
          label="Total Synced"
          variant="centered"
        />
        <StatCard
          value={stats?.pending ?? 0}
          label="Pending"
          variant="centered"
        />
        <StatCard
          value={stats?.last_sync ? formatDate(stats.last_sync).split(',')[0] : 'Never'}
          label="Last Sync"
          variant="centered"
        />
      </StatsGrid>

      <SectionTitle>Sync Directions</SectionTitle>
      <Grid minWidth="300px" gap={4} style={{ marginBottom: '24px' }}>
        <Card padding="md">
          <Stack gap={4}>
            <Stack direction="row" align="center" justify="center" gap={3}>
              <PlatformIcon icon="T" color="#1DA1F2" />
              <ArrowRight size={24} />
              <PlatformIcon icon="B" color="#0085FF" />
            </Stack>
            <DirectionStats>
              <div style={{ textAlign: 'center' }}>
                <Typography variant="h2">{twitterToBluesky}</Typography>
                <MetaItem size="xs" color="tertiary">Posts Synced</MetaItem>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Typography variant="h2">98%</Typography>
                <MetaItem size="xs" color="tertiary">Success Rate</MetaItem>
              </div>
            </DirectionStats>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => syncMutation.mutate('twitter_to_bluesky')}
              disabled={isSyncing}
            >
              <Play size={16} />
              Sync Twitter → Bluesky
            </Button>
          </Stack>
        </Card>

        <Card padding="md">
          <Stack gap={4}>
            <Stack direction="row" align="center" justify="center" gap={3}>
              <PlatformIcon icon="B" color="#0085FF" />
              <ArrowRight size={24} />
              <PlatformIcon icon="T" color="#1DA1F2" />
            </Stack>
            <DirectionStats>
              <div style={{ textAlign: 'center' }}>
                <Typography variant="h2">{blueskyToTwitter}</Typography>
                <MetaItem size="xs" color="tertiary">Posts Synced</MetaItem>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Typography variant="h2">95%</Typography>
                <MetaItem size="xs" color="tertiary">Success Rate</MetaItem>
              </div>
            </DirectionStats>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => syncMutation.mutate('bluesky_to_twitter')}
              disabled={isSyncing}
            >
              <Play size={16} />
              Sync Bluesky → Twitter
            </Button>
          </Stack>
        </Card>
      </Grid>

      <SectionTitle>Recent Sync History</SectionTitle>
      <Card padding="none">
        {history && history.length > 0 ? (
          <Stack gap={3}>
            {history.map((item) => (
              <HistoryItem key={item.id}>
                <Stack direction="row" align="center" gap={3}>
                  <HistoryIcon $status={item.status}>
                    {getStatusIcon(item.status)}
                  </HistoryIcon>
                  <div>
                    <Typography variant="label">{item.direction}</Typography>
                    <MetaItem size="xs" color="tertiary">
                      {item.posts_synced} posts · {formatDate(item.created_at)}
                    </MetaItem>
                  </div>
                </Stack>
              </HistoryItem>
            ))}
          </Stack>
        ) : (
          <EmptyState
            icon={Clock}
            title="No sync history available yet"
            size="md"
          />
        )}
      </Card>

      {/* Confetti celebration on sync success */}
      <ConfettiCelebration
        active={showConfetti}
        duration={2500}
        particleCount={80}
        spread="fountain"
        origin="center-top"
        onComplete={() => setShowConfetti(false)}
      />
    </div>
  );
}
