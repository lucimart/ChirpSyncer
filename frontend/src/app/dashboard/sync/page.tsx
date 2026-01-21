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
import { Button, Card, Progress, useToast, ConnectionStatus } from '@/components/ui';
import {
  useRealtimeMessage,
  SyncProgressPayload,
} from '@/providers/RealtimeProvider';
import { api } from '@/lib/api';

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const HeaderLeft = styled.div``;

const HeaderRight = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  align-items: center;
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const PageDescription = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const StatCard = styled(Card)`
  text-align: center;
`;

const StatValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.primary[600]};
`;

const StatLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const SyncDirections = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const DirectionCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const DirectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const PlatformIcon = styled.div<{ $color: string }>`
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background-color: ${({ $color }) => $color};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  font-size: ${({ theme }) => theme.fontSizes.lg};
`;

const DirectionStats = styled.div`
  display: flex;
  justify-content: space-around;
  padding: ${({ theme }) => theme.spacing[3]} 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const DirectionStat = styled.div`
  text-align: center;
`;

const DirectionStatValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const DirectionStatLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const HistoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const HistoryItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[3]};
  background-color: ${({ theme }) => theme.colors.background.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const HistoryInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const HistoryIcon = styled.div<{ $status: string }>`
  color: ${({ $status, theme }) =>
    $status === 'success'
      ? theme.colors.success[500]
      : $status === 'failed'
        ? theme.colors.danger[500]
        : theme.colors.warning[500]};
`;

const HistoryDetails = styled.div``;

const HistoryTitle = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const HistoryMeta = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[8]};
  color: ${({ theme }) => theme.colors.text.secondary};
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

  // Handle real-time sync progress updates
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

  // Handle sync completion
  useRealtimeMessage(
    'sync.complete',
    useCallback(
      (payload: { operation_id: string; synced: number }) => {
        setIsSyncing(false);
        setSyncProgress(null);
        queryClient.invalidateQueries({ queryKey: ['sync-stats'] });
        queryClient.invalidateQueries({ queryKey: ['sync-history'] });
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
      <PageHeader>
        <HeaderLeft>
          <PageTitle>Sync Dashboard</PageTitle>
          <PageDescription>
            Manage synchronization between Twitter and Bluesky
          </PageDescription>
        </HeaderLeft>
        <HeaderRight>
          <ConnectionStatus />
          <Button
            onClick={() => syncMutation.mutate('both')}
            isLoading={isSyncing}
          >
            <RefreshCw size={18} />
            Sync Now
          </Button>
        </HeaderRight>
      </PageHeader>

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

      <StatsGrid>
        <StatCard padding="md">
          <StatValue>{stats?.total_synced.toLocaleString() ?? 0}</StatValue>
          <StatLabel>Total Synced</StatLabel>
        </StatCard>
        <StatCard padding="md">
          <StatValue>{stats?.pending ?? 0}</StatValue>
          <StatLabel>Pending</StatLabel>
        </StatCard>
        <StatCard padding="md">
          <StatValue>
            {stats?.last_sync ? formatDate(stats.last_sync).split(',')[0] : 'Never'}
          </StatValue>
          <StatLabel>Last Sync</StatLabel>
        </StatCard>
      </StatsGrid>

      <SectionTitle>Sync Directions</SectionTitle>
      <SyncDirections>
        <DirectionCard padding="md">
          <DirectionHeader>
            <PlatformIcon $color="#1DA1F2">T</PlatformIcon>
            <ArrowRight size={24} />
            <PlatformIcon $color="#0085FF">B</PlatformIcon>
          </DirectionHeader>
          <DirectionStats>
            <DirectionStat>
              <DirectionStatValue>
                {twitterToBluesky}
              </DirectionStatValue>
              <DirectionStatLabel>Posts Synced</DirectionStatLabel>
            </DirectionStat>
            <DirectionStat>
              <DirectionStatValue>98%</DirectionStatValue>
              <DirectionStatLabel>Success Rate</DirectionStatLabel>
            </DirectionStat>
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
        </DirectionCard>

        <DirectionCard padding="md">
          <DirectionHeader>
            <PlatformIcon $color="#0085FF">B</PlatformIcon>
            <ArrowRight size={24} />
            <PlatformIcon $color="#1DA1F2">T</PlatformIcon>
          </DirectionHeader>
          <DirectionStats>
            <DirectionStat>
              <DirectionStatValue>
                {blueskyToTwitter}
              </DirectionStatValue>
              <DirectionStatLabel>Posts Synced</DirectionStatLabel>
            </DirectionStat>
            <DirectionStat>
              <DirectionStatValue>95%</DirectionStatValue>
              <DirectionStatLabel>Success Rate</DirectionStatLabel>
            </DirectionStat>
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
        </DirectionCard>
      </SyncDirections>

      <SectionTitle>Recent Sync History</SectionTitle>
      <Card padding="none">
        {history && history.length > 0 ? (
          <HistoryList>
            {history.map((item) => (
              <HistoryItem key={item.id}>
                <HistoryInfo>
                  <HistoryIcon $status={item.status}>
                    {getStatusIcon(item.status)}
                  </HistoryIcon>
                  <HistoryDetails>
                    <HistoryTitle>{item.direction}</HistoryTitle>
                    <HistoryMeta>
                      {item.posts_synced} posts · {formatDate(item.created_at)}
                    </HistoryMeta>
                  </HistoryDetails>
                </HistoryInfo>
              </HistoryItem>
            ))}
          </HistoryList>
        ) : (
          <EmptyState>No sync history yet</EmptyState>
        )}
      </Card>
    </div>
  );
}
