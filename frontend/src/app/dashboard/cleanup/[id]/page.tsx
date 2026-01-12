'use client';

import { useState, use } from 'react';
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
  Play,
} from 'lucide-react';
import {
  Button,
  Card,
  DataTable,
  DangerConfirm,
  Progress,
  Column,
} from '@/components/ui';

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
  content: string;
  created_at: string;
  likes: number;
  retweets: number;
  views: number;
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

  const { data: rule } = useQuery<CleanupRule>({
    queryKey: ['cleanup-rule', id],
    queryFn: async () => {
      // Mock data
      return {
        id: parseInt(id),
        name: 'Delete old tweets',
        rule_type: 'age',
        config: { days: 90 },
      };
    },
  });

  const { data: preview, isLoading } = useQuery<PreviewTweet[]>({
    queryKey: ['cleanup-preview', id],
    queryFn: async () => {
      // Mock data - tweets that match the rule
      return Array.from({ length: 25 }, (_, i) => ({
        id: `tweet-${i + 1}`,
        content: `This is an old tweet #${i + 1} that will be deleted because it's older than 90 days and has low engagement...`,
        created_at: new Date(
          Date.now() - (100 + i * 5) * 24 * 60 * 60 * 1000
        ).toISOString(),
        likes: Math.floor(Math.random() * 10),
        retweets: Math.floor(Math.random() * 3),
        views: Math.floor(Math.random() * 500),
      }));
    },
  });

  const executeMutation = useMutation({
    mutationFn: async (reason: string) => {
      // Simulate execution with progress
      const toDelete = selectedIds.size > 0 ? selectedIds.size : preview?.length ?? 0;
      setExecution({
        isRunning: true,
        total: toDelete,
        deleted: 0,
        failed: 0,
      });

      for (let i = 0; i < toDelete; i++) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        setExecution((prev) => ({
          ...prev,
          deleted: prev.deleted + 1,
          failed: Math.random() < 0.05 ? prev.failed + 1 : prev.failed,
        }));
      }

      setExecution((prev) => ({ ...prev, isRunning: false }));
      return { deleted: toDelete, reason };
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
      render: (row) => <TweetContent>{row.content}</TweetContent>,
    },
    {
      key: 'created_at',
      header: 'Date',
      sortable: true,
      width: '120px',
      render: (row) => new Date(row.created_at).toLocaleDateString(),
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
            <Eye size={12} /> {row.views}
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
              ? `${(rule.config.days as number) ?? 90} days`
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
