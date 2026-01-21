'use client';

import { useState, use, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import styled from 'styled-components';
import {
  ArrowLeft,
  Trash2,
  Calendar,
  ThumbsUp,
  MessageSquare,
  Eye,
  Heart,
} from 'lucide-react';
import {
  Button,
  Card,
  DataTable,
  DangerConfirm,
  Progress,
  Column,
  useToast,
} from '@/components/ui';
import {
  useRealtimeMessage,
  CleanupProgressPayload,
} from '@/providers/RealtimeProvider';
import { api } from '@/lib/api';

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  cursor: pointer;
  margin-bottom: ${({ theme }) => theme.spacing[2]};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const TitleSection = styled.div``;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const RuleIcon = styled.div<{ $type: string }>`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ $type, theme }) =>
    $type === 'age'
      ? theme.colors.warning[100]
      : $type === 'engagement'
        ? theme.colors.success[100]
        : theme.colors.primary[100]};
  color: ${({ $type, theme }) =>
    $type === 'age'
      ? theme.colors.warning[600]
      : $type === 'engagement'
        ? theme.colors.success[600]
        : theme.colors.primary[600]};
`;

const PageDescription = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const StatCard = styled(Card)`
  text-align: center;
`;

const StatValue = styled.div<{ $danger?: boolean }>`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ $danger, theme }) =>
    $danger ? theme.colors.danger[600] : theme.colors.text.primary};
`;

const StatLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const TableActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const SelectedInfo = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ExecutionCard = styled(Card)`
  margin-top: ${({ theme }) => theme.spacing[6]};
`;

const ExecutionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const TweetContent = styled.div`
  max-width: 400px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TweetMeta = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
`;

const MetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
`;

interface PreviewTweet {
  id: string;
  text: string;
  created_at: number;
  likes: number;
  retweets: number;
  replies: number;
}

interface CleanupRule {
  id: number;
  name: string;
  rule_type: 'age' | 'engagement' | 'pattern';
  config: Record<string, unknown>;
}

interface ExecutionState {
  isRunning: boolean;
  total: number;
  deleted: number;
  failed: number;
}

export default function CleanupPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { addToast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(
    new Set()
  );
  const [showConfirm, setShowConfirm] = useState(false);
  const [execution, setExecution] = useState<ExecutionState>({
    isRunning: false,
    total: 0,
    deleted: 0,
    failed: 0,
  });

  // Handle real-time cleanup progress
  useRealtimeMessage(
    'cleanup.progress',
    useCallback(
      (payload: CleanupProgressPayload) => {
        if (payload.rule_id === parseInt(id)) {
          setExecution((prev) => ({
            ...prev,
            deleted: payload.deleted,
            total: payload.total,
          }));
        }
      },
      [id]
    )
  );

  // Handle cleanup completion
  useRealtimeMessage(
    'cleanup.complete',
    useCallback(
      (payload: { rule_id: number; deleted: number }) => {
        if (payload.rule_id === parseInt(id)) {
          setExecution((prev) => ({
            ...prev,
            isRunning: false,
          }));
          addToast({
            type: 'success',
            title: 'Cleanup Complete',
            message: `Successfully deleted ${payload.deleted} tweets`,
          });
        }
      },
      [id, addToast]
    )
  );

  const { data: rule } = useQuery<CleanupRule>({
    queryKey: ['cleanup-rule', id],
    queryFn: async () => {
      const response = await api.getCleanupRules();
      if (response.success && response.data) {
        const rules = response.data as CleanupRule[];
        const match = rules.find((item) => item.id === parseInt(id, 10));
        if (!match) {
          throw new Error('Cleanup rule not found');
        }
        return match;
      }
      throw new Error('Failed to load rule');
    },
  });

  const { data: preview, isLoading } = useQuery<PreviewTweet[]>({
    queryKey: ['cleanup-preview', id],
    queryFn: async () => {
      const response = await api.previewCleanupRule(parseInt(id, 10));
      if (response.success && response.data) {
        const data = response.data as { tweets?: PreviewTweet[] };
        return data.tweets ?? [];
      }
      return [];
    },
  });

  const executeMutation = useMutation({
    mutationFn: async (reason: string) => {
      setExecution({
        isRunning: true,
        total: selectedIds.size > 0 ? selectedIds.size : preview?.length ?? 0,
        deleted: 0,
        failed: 0,
      });
      const response = await api.executeCleanupRule(parseInt(id, 10), reason);
      if (!response.success) {
        throw new Error(response.error || 'Failed to execute cleanup');
      }
      const deleted = (response.data as { tweets_deleted?: number })?.tweets_deleted ?? 0;
      setExecution((prev) => ({ ...prev, deleted, isRunning: false }));
      return { deleted };
    },
  });

  const getRuleIcon = (type: string) => {
    switch (type) {
      case 'age':
        return <Calendar size={20} />;
      case 'engagement':
        return <ThumbsUp size={20} />;
      default:
        return <MessageSquare size={20} />;
    }
  };

  const columns: Column<PreviewTweet>[] = [
    {
      key: 'content',
      header: 'Tweet',
      render: (row) => <TweetContent>{row.text}</TweetContent>,
    },
    {
      key: 'created_at',
      header: 'Date',
      sortable: true,
      width: '120px',
      render: (row) => new Date(row.created_at * 1000).toLocaleDateString(),
    },
    {
      key: 'engagement',
      header: 'Engagement',
      width: '200px',
      render: (row) => (
        <TweetMeta>
          <MetaItem>
            <Heart size={12} /> {row.likes}
          </MetaItem>
          <MetaItem>
            <MessageSquare size={12} /> {row.retweets}
          </MetaItem>
          <MetaItem>
            <Eye size={12} /> {row.replies}
          </MetaItem>
        </TweetMeta>
      ),
    },
  ];

  const handleExecute = (reason: string) => {
    setShowConfirm(false);
    executeMutation.mutate(reason);
  };

  const deleteCount = selectedIds.size > 0 ? selectedIds.size : preview?.length ?? 0;

  return (
    <div>
      <BackButton onClick={() => router.push('/dashboard/cleanup')}>
        <ArrowLeft size={16} />
        Back to rules
      </BackButton>

      <PageHeader>
        <TitleSection>
          <PageTitle>
            {rule && (
              <RuleIcon $type={rule.rule_type}>{getRuleIcon(rule.rule_type)}</RuleIcon>
            )}
            {rule?.name ?? 'Loading...'}
          </PageTitle>
          <PageDescription>
            Preview tweets that match this rule before deleting
          </PageDescription>
        </TitleSection>
        <Button
          variant="danger"
          onClick={() => setShowConfirm(true)}
          disabled={execution.isRunning || !preview?.length}
        >
          <Trash2 size={18} />
          Delete {deleteCount} tweets
        </Button>
      </PageHeader>

      <StatsRow>
        <StatCard padding="md">
          <StatValue $danger>{preview?.length ?? 0}</StatValue>
          <StatLabel>Matching Tweets</StatLabel>
        </StatCard>
        <StatCard padding="md">
          <StatValue>{selectedIds.size}</StatValue>
          <StatLabel>Selected</StatLabel>
        </StatCard>
        <StatCard padding="md">
          <StatValue>
            {rule?.rule_type === 'age'
              ? `${(rule.config.max_age_days as number) ?? (rule.config.days as number) ?? 90} days`
              : rule?.rule_type === 'engagement'
                ? `< ${(rule.config.min_likes as number) ?? 5} likes`
                : 'Pattern'}
          </StatValue>
          <StatLabel>Rule Criteria</StatLabel>
        </StatCard>
      </StatsRow>

      {execution.isRunning || execution.deleted > 0 ? (
        <ExecutionCard padding="lg">
          <ExecutionHeader>
            <SectionTitle>
              {execution.isRunning ? 'Deleting tweets...' : 'Execution complete'}
            </SectionTitle>
          </ExecutionHeader>
          <Progress
            value={execution.deleted}
            max={execution.total}
            label="Progress"
            variant={execution.isRunning ? 'primary' : 'success'}
            animated={execution.isRunning}
            details={[
              { label: 'Deleted', value: execution.deleted },
              { label: 'Failed', value: execution.failed },
              { label: 'Remaining', value: execution.total - execution.deleted },
            ]}
          />
        </ExecutionCard>
      ) : (
        <>
          <TableActions>
            <SectionTitle>Preview Results</SectionTitle>
            {selectedIds.size > 0 && (
              <SelectedInfo>
                {selectedIds.size} tweet{selectedIds.size !== 1 ? 's' : ''} selected
              </SelectedInfo>
            )}
          </TableActions>

          {isLoading ? (
            <Card padding="lg">
              <div style={{ textAlign: 'center', color: '#666' }}>
                Loading preview...
              </div>
            </Card>
          ) : (
            <DataTable
              columns={columns}
              data={preview ?? []}
              selectable
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              pageSize={10}
              emptyMessage="No tweets match this rule"
            />
          )}
        </>
      )}

      <DangerConfirm
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleExecute}
        title="Delete Tweets Permanently"
        description={`You are about to permanently delete ${deleteCount} tweet${deleteCount !== 1 ? 's' : ''}. This action cannot be undone.`}
        confirmPhrase="DELETE MY TWEETS"
        isLoading={executeMutation.isPending}
        requireReason
      />
    </div>
  );
}
