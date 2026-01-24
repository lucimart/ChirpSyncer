'use client';

import { useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import {
  Library,
  Sparkles,
  RefreshCw,
  TrendingUp,
  Leaf,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/StatCard';
import { Stack } from '@/components/ui/Stack';
import { Grid } from '@/components/ui/Grid';
import { Modal } from '@/components/ui/Modal';
import {
  ContentCard,
  SuggestionCard,
  LibraryFilters,
  TagEditor,
} from '@/components/recycling';
import {
  useContentLibrary,
  useRecycleSuggestions,
  useLibraryStats,
  useSyncLibrary,
  useUpdateTags,
  useRecycleContent,
  useAcceptSuggestion,
  useDismissSuggestion,
  type ContentFilters,
  type ContentItem,
  type PlatformType,
} from '@/lib/recycling';

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[6]};
  padding: ${({ theme }) => theme.spacing[6]};
  max-width: 1400px;
  margin: 0 auto;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
`;

const ContentSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
`;

const SuggestionsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const TabContent = styled.div`
  padding-top: ${({ theme }) => theme.spacing[4]};
`;

const TAB_ITEMS = [
  { id: 'library', label: 'Library', icon: Library },
  { id: 'suggestions', label: 'AI Suggestions', icon: Sparkles },
];

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState('library');
  const [filters, setFilters] = useState<ContentFilters>({
    sort_by: 'recycle_score',
    sort_order: 'desc',
  });
  const [editingTagsItem, setEditingTagsItem] = useState<ContentItem | null>(null);
  const [recyclingItem, setRecyclingItem] = useState<ContentItem | null>(null);

  // Queries
  const {
    data: libraryData,
    isLoading: isLoadingLibrary,
    error: libraryError,
  } = useContentLibrary(filters);

  const {
    data: suggestions,
    isLoading: isLoadingSuggestions,
  } = useRecycleSuggestions();

  const {
    data: stats,
    isLoading: isLoadingStats,
  } = useLibraryStats();

  // Mutations
  const syncLibrary = useSyncLibrary();
  const updateTags = useUpdateTags();
  const recycleContent = useRecycleContent();
  const acceptSuggestion = useAcceptSuggestion();
  const dismissSuggestion = useDismissSuggestion();

  // Handlers
  const handleSync = useCallback(() => {
    syncLibrary.mutate();
  }, [syncLibrary]);

  const handleRecycle = useCallback((id: string) => {
    const item = libraryData?.items.find((i) => i.id === id);
    if (item) {
      setRecyclingItem(item);
    }
  }, [libraryData]);

  const handleConfirmRecycle = useCallback((platforms: PlatformType[]) => {
    if (recyclingItem) {
      recycleContent.mutate({
        contentId: recyclingItem.id,
        platforms,
      });
      setRecyclingItem(null);
    }
  }, [recyclingItem, recycleContent]);

  const handleEditTags = useCallback((id: string) => {
    const item = libraryData?.items.find((i) => i.id === id);
    if (item) {
      setEditingTagsItem(item);
    }
  }, [libraryData]);

  const handleSaveTags = useCallback((tags: string[]) => {
    if (editingTagsItem) {
      updateTags.mutate({
        contentId: editingTagsItem.id,
        tags,
      });
      setEditingTagsItem(null);
    }
  }, [editingTagsItem, updateTags]);

  const handleViewOriginal = useCallback((id: string, platform: PlatformType, postId: string) => {
    let url = '';
    if (platform === 'twitter') {
      url = `https://twitter.com/i/status/${postId}`;
    } else if (platform === 'bluesky') {
      url = `https://bsky.app/profile/${postId}`;
    }
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  const handleAcceptSuggestion = useCallback((id: string) => {
    acceptSuggestion.mutate({ suggestionId: id });
  }, [acceptSuggestion]);

  const handleDismissSuggestion = useCallback((id: string) => {
    dismissSuggestion.mutate(id);
  }, [dismissSuggestion]);

  const handleScheduleSuggestion = useCallback((id: string) => {
    // Would open a scheduling modal
    console.log('Schedule suggestion:', id);
  }, []);

  // Derived data
  const availableTags = useMemo(() => {
    if (!stats?.top_tags) return [];
    return stats.top_tags.map((t) => t.tag);
  }, [stats]);

  const pendingSuggestionsCount = useMemo(() => {
    return suggestions?.filter((s) => s.status === 'pending').length || 0;
  }, [suggestions]);

  return (
    <PageContainer>
      <PageHeader
        title="Content Library"
        description="Manage and recycle your best performing content"
        actions={
          <HeaderActions>
            <Button
              variant="secondary"
              onClick={handleSync}
              disabled={syncLibrary.isPending}
            >
              {syncLibrary.isPending ? (
                <Spinner size="sm" />
              ) : (
                <RefreshCw size={16} />
              )}
              {syncLibrary.isPending ? 'Syncing...' : 'Sync Library'}
            </Button>
          </HeaderActions>
        }
      />

      {/* Stats Section */}
      <StatsGrid>
        <StatCard
          label="Total Content"
          value={stats?.total_items ?? 0}
          icon={Library}
        />
        <StatCard
          label="Avg. Engagement"
          value={stats ? `${Math.round(stats.avg_engagement_score)}%` : '0%'}
          icon={TrendingUp}
        />
        <StatCard
          label="Avg. Evergreen"
          value={stats ? `${Math.round(stats.avg_evergreen_score)}%` : '0%'}
          icon={Leaf}
        />
        <StatCard
          label="Avg. Recycle Score"
          value={stats ? `${Math.round(stats.avg_recycle_score)}%` : '0%'}
          icon={BarChart3}
        />
      </StatsGrid>

      {/* Tabs */}
      <Tabs
        items={TAB_ITEMS.map((tab) => ({
          ...tab,
          badge: tab.id === 'suggestions' && pendingSuggestionsCount > 0
            ? pendingSuggestionsCount
            : undefined,
        }))}
        value={activeTab}
        onChange={setActiveTab}
        variant="soft"
      />

      <TabContent>
        {/* Library Tab */}
        {activeTab === 'library' && (
          <ContentSection>
            <LibraryFilters
              filters={filters}
              onFiltersChange={setFilters}
              availableTags={availableTags}
            />

            {isLoadingLibrary ? (
              <LoadingContainer>
                <Spinner size="lg" />
              </LoadingContainer>
            ) : libraryError ? (
              <EmptyState
                title="Failed to load library"
                description="There was an error loading your content library. Please try again."
                icon={Library}
                action={
                  <Button onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                }
              />
            ) : !libraryData?.items.length ? (
              <EmptyState
                title="No content yet"
                description="Sync your content from connected platforms to start building your library."
                icon={Library}
                action={
                  <Button variant="primary" onClick={handleSync}>
                    <RefreshCw size={16} />
                    Sync Now
                  </Button>
                }
              />
            ) : (
              <ContentGrid>
                {libraryData.items.map((item) => (
                  <ContentCard
                    key={item.id}
                    content={item}
                    onRecycle={handleRecycle}
                    onEditTags={handleEditTags}
                    onViewOriginal={handleViewOriginal}
                  />
                ))}
              </ContentGrid>
            )}
          </ContentSection>
        )}

        {/* Suggestions Tab */}
        {activeTab === 'suggestions' && (
          <ContentSection>
            {isLoadingSuggestions ? (
              <LoadingContainer>
                <Spinner size="lg" />
              </LoadingContainer>
            ) : !suggestions?.length ? (
              <EmptyState
                title="No suggestions yet"
                description="AI suggestions will appear here once you have content in your library."
                icon={Sparkles}
              />
            ) : (
              <SuggestionsGrid>
                {suggestions
                  .filter((s) => s.status === 'pending')
                  .map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      onAccept={handleAcceptSuggestion}
                      onDismiss={handleDismissSuggestion}
                      onSchedule={handleScheduleSuggestion}
                    />
                  ))}

                {suggestions.filter((s) => s.status === 'pending').length === 0 && (
                  <EmptyState
                    title="All caught up!"
                    description="You've reviewed all suggestions. Check back later for new ones."
                    icon={Sparkles}
                  />
                )}
              </SuggestionsGrid>
            )}
          </ContentSection>
        )}
      </TabContent>

      {/* Edit Tags Modal */}
      <Modal
        isOpen={!!editingTagsItem}
        onClose={() => setEditingTagsItem(null)}
        title="Edit Tags"
      >
        {editingTagsItem && (
          <Stack gap={4}>
            <TagEditor
              tags={editingTagsItem.tags}
              onChange={handleSaveTags}
              suggestedTags={availableTags.filter(
                (t) => !editingTagsItem.tags.includes(t)
              )}
              maxTags={10}
            />
            <Stack direction="row" gap={2} justify="end">
              <Button variant="ghost" onClick={() => setEditingTagsItem(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => handleSaveTags(editingTagsItem.tags)}
                disabled={updateTags.isPending}
              >
                {updateTags.isPending ? 'Saving...' : 'Save Tags'}
              </Button>
            </Stack>
          </Stack>
        )}
      </Modal>

      {/* Recycle Modal */}
      <Modal
        isOpen={!!recyclingItem}
        onClose={() => setRecyclingItem(null)}
        title="Recycle Content"
      >
        {recyclingItem && (
          <Stack gap={4}>
            <Card padding="sm">
              <p style={{ margin: 0 }}>{recyclingItem.content}</p>
            </Card>
            <p>Select platforms to recycle this content to:</p>
            <Stack direction="row" gap={2}>
              <Button
                variant="secondary"
                onClick={() => handleConfirmRecycle(['twitter'])}
                disabled={recyclingItem.platform === 'twitter' || recycleContent.isPending}
              >
                Twitter / X
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleConfirmRecycle(['bluesky'])}
                disabled={recyclingItem.platform === 'bluesky' || recycleContent.isPending}
              >
                Bluesky
              </Button>
              <Button
                variant="primary"
                onClick={() => handleConfirmRecycle(['twitter', 'bluesky'])}
                disabled={recycleContent.isPending}
              >
                Both Platforms
              </Button>
            </Stack>
          </Stack>
        )}
      </Modal>
    </PageContainer>
  );
}
