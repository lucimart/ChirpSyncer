'use client';

import { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useQuery } from '@tanstack/react-query';
import { List, Plus, Eye, BookOpen } from 'lucide-react';
import { Button, Tabs, PageHeader, SectionTitle } from '@/components/ui';
import { FeedPreview } from '@/components/feed-lab/FeedPreview';
import { RuleBuilder } from '@/components/feed-lab/RuleBuilder';
import { RuleList } from '@/components/feed-lab/RuleList';
import { RecipeGallery, Recipe } from '@/components/feed-lab/RecipeGallery';
import {
  useCreateFeedRule,
  useDeleteFeedRule,
  useFeedRules,
  useToggleFeedRule,
  useUpdateFeedRule,
  useReorderFeedRules,
  FeedRule,
} from '@/lib/feed-rules';
import { api } from '@/lib/api';

type TabId = 'rules' | 'create' | 'preview' | 'recipes';

// Pre-built recipe templates for common use cases
const RECIPE_TEMPLATES: Recipe[] = [
  {
    id: 'recipe-1',
    name: 'Boost Original Content',
    description: 'Prioritize posts from accounts you follow that are original thoughts, not retweets or replies.',
    category: 'engagement',
    type: 'boost',
    weight: 75,
    conditions: [
      { field: 'isRetweet', operator: 'equals', value: false },
      { field: 'isReply', operator: 'equals', value: false },
    ],
    tags: ['original', 'quality'],
    popularity: 92,
  },
  {
    id: 'recipe-2',
    name: 'Filter Low Engagement',
    description: 'Hide posts with very low engagement to focus on quality content.',
    category: 'filtering',
    type: 'filter',
    weight: 100,
    conditions: [
      { field: 'likeCount', operator: 'lessThan', value: 2 },
      { field: 'age', operator: 'greaterThan', value: '24h' },
    ],
    tags: ['quality', 'cleanup'],
    popularity: 78,
  },
  {
    id: 'recipe-3',
    name: 'Discover New Voices',
    description: 'Boost content from accounts you don\'t follow but your network engages with.',
    category: 'discovery',
    type: 'boost',
    weight: 50,
    conditions: [
      { field: 'isFollowing', operator: 'equals', value: false },
      { field: 'networkEngagement', operator: 'greaterThan', value: 3 },
    ],
    tags: ['discovery', 'network'],
    popularity: 65,
  },
  {
    id: 'recipe-4',
    name: 'Mute Promotional Content',
    description: 'Demote posts that contain common promotional patterns like "giveaway" or "discount".',
    category: 'filtering',
    type: 'demote',
    weight: 60,
    conditions: [
      { field: 'content', operator: 'contains', value: 'giveaway|discount|sale|promo' },
    ],
    tags: ['cleanup', 'ads'],
    popularity: 85,
  },
  {
    id: 'recipe-5',
    name: 'Thread Booster',
    description: 'Prioritize the start of long threads that often contain valuable insights.',
    category: 'productivity',
    type: 'boost',
    weight: 40,
    conditions: [
      { field: 'isThreadStart', operator: 'equals', value: true },
      { field: 'threadLength', operator: 'greaterThan', value: 3 },
    ],
    tags: ['threads', 'insights'],
    popularity: 71,
  },
];

const StyledTabs = styled(Tabs)`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
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

interface AppliedRule {
  ruleId: string;
  ruleName: string;
  contribution: number;
}

interface PreviewPost {
  id: string;
  content: string;
  author: string;
  timestamp: string;
  score: number;
  appliedRules: AppliedRule[];
}

interface RawAppliedRule {
  rule_id?: string;
  ruleId?: string;
  rule_name?: string;
  ruleName?: string;
  contribution?: number;
}

interface RawPost {
  id?: string | number;
  content?: string;
  author?: string;
  timestamp?: string;
  created_at?: string;
  score?: number;
  applied_rules?: RawAppliedRule[];
}

const ICON_SIZE = 16;

function mapRawPostToPreviewPost(post: RawPost): PreviewPost {
  return {
    id: String(post.id ?? ''),
    content: post.content ?? '',
    author: post.author ?? 'Unknown',
    timestamp: post.timestamp ?? post.created_at ?? '',
    score: post.score ?? 0,
    appliedRules: Array.isArray(post.applied_rules)
      ? post.applied_rules.map((rule) => ({
          ruleId: String(rule.rule_id ?? rule.ruleId ?? ''),
          ruleName: rule.rule_name ?? rule.ruleName ?? 'Rule',
          contribution: rule.contribution ?? 0,
        }))
      : [],
  };
}

export default function FeedLabPage() {
  const [activeTab, setActiveTab] = useState<TabId>('rules');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  const { data: rules = [], isLoading } = useFeedRules();
  const createRule = useCreateFeedRule();
  const updateRule = useUpdateFeedRule();
  const deleteRule = useDeleteFeedRule();
  const toggleRule = useToggleFeedRule();
  const reorderRules = useReorderFeedRules();

  const editingRule = useMemo(
    () => rules.find((rule) => rule.id === editingRuleId) ?? null,
    [rules, editingRuleId]
  );

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
      const rawPosts = (response.data as { posts?: RawPost[] }).posts ?? [];
      return rawPosts.map(mapRawPostToPreviewPost);
    },
    enabled: !isLoading,
  });

  const handleCreate = useCallback(
    (rule: {
      name: string;
      type: 'boost' | 'demote' | 'filter';
      weight: number;
      conditions: FeedRule['conditions'];
    }) => {
      createRule.mutate(
        { ...rule, enabled: true },
        { onSuccess: () => setEditingRuleId(null) }
      );
    },
    [createRule]
  );

  const handleUpdate = useCallback(
    (rule: {
      name: string;
      type: 'boost' | 'demote' | 'filter';
      weight: number;
      conditions: FeedRule['conditions'];
    }) => {
      if (!editingRuleId) return;
      updateRule.mutate(
        { id: editingRuleId, enabled: editingRule?.enabled ?? true, ...rule },
        { onSuccess: () => setEditingRuleId(null) }
      );
    },
    [editingRuleId, editingRule?.enabled, updateRule]
  );

  const handleApplyRecipe = useCallback(
    (recipe: Recipe) => {
      createRule.mutate(
        {
          name: recipe.name,
          type: recipe.type,
          weight: recipe.weight,
          conditions: recipe.conditions,
          enabled: true,
        },
        { onSuccess: () => setActiveTab('rules') }
      );
    },
    [createRule]
  );

  const handleToggleRule = useCallback(
    (id: string, enabled: boolean) => toggleRule.mutate({ id, enabled }),
    [toggleRule]
  );

  const handleEditRule = useCallback(
    (id: string) => {
      setEditingRuleId(id);
      setActiveTab('create');
    },
    []
  );

  const handleDeleteRule = useCallback(
    (id: string) => deleteRule.mutate(id),
    [deleteRule]
  );

  const handleReorderRules = useCallback(
    (reordered: FeedRule[]) => reorderRules.mutate(reordered),
    [reorderRules]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingRuleId(null);
    setActiveTab('rules');
  }, []);

  const handleTabChange = useCallback(
    (id: string) => setActiveTab(id as TabId),
    []
  );

  const goToCreateTab = useCallback(() => setActiveTab('create'), []);

  const handlePostClick = useCallback(() => {
    // Placeholder for future post detail view
  }, []);

  const tabItems = useMemo(
    () => [
      {
        id: 'rules',
        label: 'My Rules',
        icon: List,
        badge: rules.length > 0 ? rules.length : undefined,
      },
      {
        id: 'create',
        label: editingRuleId ? 'Edit Rule' : 'Create Rule',
        icon: Plus,
      },
      {
        id: 'preview',
        label: 'Preview',
        icon: Eye,
      },
      {
        id: 'recipes',
        label: 'Recipes',
        icon: BookOpen,
        badge: RECIPE_TEMPLATES.length,
      },
    ],
    [editingRuleId, rules.length]
  );

  return (
    <div>
      <PageHeader
        title="Feed Lab"
        description="Customize your algorithm and preview how rules shape your feed."
      />

      <StyledTabs
        items={tabItems}
        value={activeTab}
        onChange={handleTabChange}
        variant="accent"
      />

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
                <Button variant="primary" size="md" onClick={goToCreateTab}>
                  <Plus size={ICON_SIZE} />
                  Create Rule
                </Button>
              </CreateRulePrompt>
            ) : (
              <RuleList
                rules={rules}
                onToggle={handleToggleRule}
                onEdit={handleEditRule}
                onDelete={handleDeleteRule}
                onReorder={handleReorderRules}
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
              onCancel={handleCancelEdit}
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
              onPostClick={handlePostClick}
            />
          </Section>
        )}

        {activeTab === 'recipes' && (
          <Section>
            <SectionHeader>
              <SectionTitle>Recipe Templates</SectionTitle>
              <HelperText>Pre-built rule templates to quickly customize your feed.</HelperText>
            </SectionHeader>

            <RecipeGallery
              recipes={RECIPE_TEMPLATES}
              onSelectRecipe={handleApplyRecipe}
              onApplyRecipe={handleApplyRecipe}
              viewMode="grid"
            />
          </Section>
        )}
      </TabContent>
    </div>
  );
}
