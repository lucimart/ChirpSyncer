'use client';

import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { FeedPreview } from '@/components/feed-lab/FeedPreview';
import { RuleBuilder } from '@/components/feed-lab/RuleBuilder';
import { RuleList } from '@/components/feed-lab/RuleList';
import {
  useCreateFeedRule,
  useDeleteFeedRule,
  useFeedRules,
  useToggleFeedRule,
  useUpdateFeedRule,
  FeedRule,
} from '@/lib/feed-rules';
import { api } from '@/lib/api';

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

const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  gap: ${({ theme }) => theme.spacing[6]};

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const HelperText = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

interface PreviewPost {
  id: string;
  content: string;
  author: string;
  timestamp: string;
  score: number;
  appliedRules: Array<{ ruleId: string; ruleName: string; contribution: number }>;
}

export default function FeedLabPage() {
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  const { data: rules = [], isLoading } = useFeedRules();
  const createRule = useCreateFeedRule();
  const updateRule = useUpdateFeedRule();
  const deleteRule = useDeleteFeedRule();
  const toggleRule = useToggleFeedRule();

  const editingRule = rules.find((rule) => rule.id === editingRuleId) || null;

  const previewRules = useMemo(
    () =>
      rules.map((rule) => ({
        id: rule.id,
        name: rule.name,
        type: rule.type,
        conditions: rule.conditions,
        weight: rule.weight,
        enabled: rule.enabled,
      })),
    [rules]
  );

  const previewKey = useMemo(() => JSON.stringify(previewRules), [previewRules]);

  const { data: previewPosts = [] } = useQuery<PreviewPost[]>({
    queryKey: ['feed-preview', previewKey],
    queryFn: async () => {
      const response = await api.previewFeed(previewRules);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load feed preview');
      }
      const rawPosts = (response.data as { posts?: Array<any> }).posts ?? [];
      return rawPosts.map((post) => ({
        id: String(post.id ?? ''),
        content: post.content ?? '',
        author: post.author ?? 'Unknown',
        timestamp: post.timestamp ?? post.created_at ?? '',
        score: post.score ?? 0,
        appliedRules: Array.isArray(post.applied_rules)
          ? post.applied_rules.map((rule: any) => ({
              ruleId: String(rule.rule_id ?? rule.ruleId),
              ruleName: rule.rule_name ?? rule.ruleName ?? 'Rule',
              contribution: rule.contribution ?? 0,
            }))
          : [],
      }));
    },
    enabled: !isLoading,
  });

  const handleCreate = (rule: {
    name: string;
    type: 'boost' | 'demote' | 'filter';
    weight: number;
    conditions: FeedRule['conditions'];
  }) => {
    createRule.mutate({ ...rule, enabled: true }, {
      onSuccess: () => setEditingRuleId(null),
    });
  };

  const handleUpdate = (rule: {
    name: string;
    type: 'boost' | 'demote' | 'filter';
    weight: number;
    conditions: FeedRule['conditions'];
  }) => {
    if (!editingRuleId) {
      return;
    }
    updateRule.mutate({ id: editingRuleId, enabled: editingRule?.enabled ?? true, ...rule }, {
      onSuccess: () => setEditingRuleId(null),
    });
  };

  return (
    <div>
      <PageHeader>
        <HeaderLeft>
          <PageTitle>Feed Lab</PageTitle>
          <PageDescription>
            Customize your algorithm and preview how rules shape your feed.
          </PageDescription>
        </HeaderLeft>
      </PageHeader>

      <Grid>
        <Section>
          <div>
            <SectionTitle>Your Rules</SectionTitle>
            <HelperText>Create, tune, and toggle your feed rules.</HelperText>
          </div>

          <RuleList
            rules={rules}
            onToggle={(id, enabled) => toggleRule.mutate({ id, enabled })}
            onEdit={(id) => setEditingRuleId(id)}
            onDelete={(id) => deleteRule.mutate(id)}
          />

          <div>
            <SectionTitle>{editingRule ? 'Edit Rule' : 'Create Rule'}</SectionTitle>
            <RuleBuilder
              onSubmit={editingRule ? handleUpdate : handleCreate}
              onCancel={() => setEditingRuleId(null)}
              initialRule={editingRule ?? undefined}
            />
          </div>
        </Section>

        <Section>
          <div>
            <SectionTitle>Preview</SectionTitle>
            <HelperText>See how your rules affect scoring in real time.</HelperText>
          </div>

          <FeedPreview
            posts={previewPosts}
            onPostClick={() => {}}
          />
        </Section>
      </Grid>
    </div>
  );
}
