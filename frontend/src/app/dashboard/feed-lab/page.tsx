'use client';

import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { List, Plus, Eye } from 'lucide-react';
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

type TabId = 'rules' | 'create' | 'preview';

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
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

const TabsContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[1]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  padding-bottom: ${({ theme }) => theme.spacing[1]};
`;

const Tab = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]}`};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primary[500] : theme.colors.text.secondary};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.primary[500] + '15' : 'transparent'};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: ${({ theme, $active }) =>
      $active ? theme.colors.primary[500] + '20' : theme.colors.background.tertiary};
    color: ${({ theme, $active }) =>
      $active ? theme.colors.primary[500] : theme.colors.text.primary};
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const TabBadge = styled.span`
  background: ${({ theme }) => theme.colors.primary[500]};
  color: white;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  min-width: 20px;
  text-align: center;
`;

const TabContent = styled.div`
  min-height: 400px;
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const SectionHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const HelperText = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const CreateRulePrompt = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[8]};
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px dashed ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  text-align: center;
`;

const PromptText = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const CreateButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]}`};
  background: ${({ theme }) => theme.colors.primary[500]};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.primary[600]};
  }

  svg {
    width: 16px;
    height: 16px;
  }
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
  const [activeTab, setActiveTab] = useState<TabId>('rules');
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

      <TabsContainer>
        <Tab $active={activeTab === 'rules'} onClick={() => setActiveTab('rules')}>
          <List />
          My Rules
          {rules.length > 0 && <TabBadge>{rules.length}</TabBadge>}
        </Tab>
        <Tab $active={activeTab === 'create'} onClick={() => setActiveTab('create')}>
          <Plus />
          {editingRuleId ? 'Edit Rule' : 'Create Rule'}
        </Tab>
        <Tab $active={activeTab === 'preview'} onClick={() => setActiveTab('preview')}>
          <Eye />
          Preview
        </Tab>
      </TabsContainer>

      <TabContent>
        {activeTab === 'rules' && (
          <Section>
            <SectionHeader>
              <SectionTitle>Your Rules</SectionTitle>
              <HelperText>Create, tune, and toggle your feed rules.</HelperText>
            </SectionHeader>

            {rules.length === 0 ? (
              <CreateRulePrompt>
                <PromptText>No rules yet. Create your first rule to customize your feed.</PromptText>
                <CreateButton onClick={() => setActiveTab('create')}>
                  <Plus />
                  Create Rule
                </CreateButton>
              </CreateRulePrompt>
            ) : (
              <RuleList
                rules={rules}
                onToggle={(id, enabled) => toggleRule.mutate({ id, enabled })}
                onEdit={(id) => {
                  setEditingRuleId(id);
                  setActiveTab('create');
                }}
                onDelete={(id) => deleteRule.mutate(id)}
              />
            )}
          </Section>
        )}

        {activeTab === 'create' && (
          <Section>
            <SectionHeader>
              <SectionTitle>{editingRuleId ? 'Edit Rule' : 'Create New Rule'}</SectionTitle>
              <HelperText>
                {editingRuleId
                  ? 'Modify your rule settings below.'
                  : 'Define conditions and weights to shape your feed.'}
              </HelperText>
            </SectionHeader>

            <RuleBuilder
              onSubmit={editingRuleId ? handleUpdate : handleCreate}
              onCancel={() => {
                setEditingRuleId(null);
                setActiveTab('rules');
              }}
              initialRule={editingRule ?? undefined}
            />
          </Section>
        )}

        {activeTab === 'preview' && (
          <Section>
            <SectionHeader>
              <SectionTitle>Feed Preview</SectionTitle>
              <HelperText>See how your rules affect post scoring in real time.</HelperText>
            </SectionHeader>

            <FeedPreview
              posts={previewPosts}
              onPostClick={() => {}}
            />
          </Section>
        )}
      </TabContent>
    </div>
  );
}
