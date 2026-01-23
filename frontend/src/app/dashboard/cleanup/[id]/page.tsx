'use client';

import { useState, use, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
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
  StatCard,
  StatsGrid,
  SectionTitle,
  MetaItem,
  Stack,
  PageTitle,
  SmallText,
  TruncatedText,
  IconBadge,
} from '@/components/ui';
import {
  useRealtimeMessage,
  CleanupProgressPayload,
} from '@/providers/RealtimeProvider';
import { api } from '@/lib/api';

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

const RULE_TYPE_VARIANT = {
  age: 'warning',
  engagement: 'success',
  pattern: 'primary',
} as const;

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
      render: (row) => <TruncatedText $maxWidth="400px">{row.text}</TruncatedText>,
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
        <Stack direction="row" gap={4}>
          <MetaItem size="xs" color="secondary">
            <Heart size={12} /> {row.likes}
          </MetaItem>
          <MetaItem size="xs" color="secondary">
            <MessageSquare size={12} /> {row.retweets}
          </MetaItem>
          <MetaItem size="xs" color="secondary">
            <Eye size={12} /> {row.replies}
          </MetaItem>
        </Stack>
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
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/dashboard/cleanup')}
        style={{ marginBottom: '8px' }}
      >
        <ArrowLeft size={16} />
        Back to rules
      </Button>

      <Stack direction="row" justify="between" align="start" gap={4} style={{ marginBottom: '24px' }}>
        <div>
          <Stack direction="row" gap={3} align="center">
            {rule && (
              <IconBadge variant={RULE_TYPE_VARIANT[rule.rule_type]}>
                {getRuleIcon(rule.rule_type)}
              </IconBadge>
            )}
            <PageTitle>{rule?.name ?? 'Loading...'}</PageTitle>
          </Stack>
          <div style={{ marginTop: '4px' }}>
            <SmallText>Preview tweets that match this rule before deleting</SmallText>
          </div>
        </div>
        <Button
          variant="danger"
          onClick={() => setShowConfirm(true)}
          disabled={execution.isRunning || !preview?.length}
        >
          <Trash2 size={18} />
          Delete {deleteCount} tweets
        </Button>
      </Stack>

      <StatsGrid>
        <StatCard
          value={preview?.length ?? 0}
          label="Matching Tweets"
          variant="centered"
        />
        <StatCard
          value={selectedIds.size}
          label="Selected"
          variant="centered"
        />
        <StatCard
          value={
            rule?.rule_type === 'age'
              ? `${(rule.config.max_age_days as number) ?? (rule.config.days as number) ?? 90} days`
              : rule?.rule_type === 'engagement'
                ? `< ${(rule.config.min_likes as number) ?? 5} likes`
                : 'Pattern'
          }
          label="Rule Criteria"
          variant="centered"
        />
      </StatsGrid>

      {execution.isRunning || execution.deleted > 0 ? (
        <Card padding="lg" style={{ marginTop: '24px' }}>
          <Stack direction="row" justify="between" align="center" style={{ marginBottom: '16px' }}>
            <SectionTitle style={{ marginBottom: 0 }}>
              {execution.isRunning ? 'Deleting tweets...' : 'Execution complete'}
            </SectionTitle>
          </Stack>
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
        </Card>
      ) : (
        <>
          <Stack direction="row" justify="between" align="center" style={{ marginBottom: '16px' }}>
            <SectionTitle style={{ marginBottom: 0 }}>Preview Results</SectionTitle>
            {selectedIds.size > 0 && (
              <SmallText>
                {selectedIds.size} tweet{selectedIds.size !== 1 ? 's' : ''} selected
              </SmallText>
            )}
          </Stack>

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
