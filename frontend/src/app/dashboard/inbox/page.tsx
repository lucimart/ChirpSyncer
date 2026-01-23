'use client';

import { useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Inbox, RefreshCw, CheckCheck, Filter } from 'lucide-react';
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  Stack,
  Spinner,
  useToast,
  SidebarLayout,
} from '@/components/ui';
import {
  MessageCard,
  MessageFilters,
  InboxStats,
  QuickReply,
} from '@/components/inbox';
import {
  useInboxMessages,
  useInboxStats,
  useMarkAsRead,
  useToggleStar,
  useArchiveMessage,
  useMarkAllAsRead,
  type InboxFilters as InboxFiltersType,
  type UnifiedMessage,
} from '@/lib/inbox';

const PageContainer = styled.div`
  height: 100%;
`;

const FiltersCard = styled(Card)`
  position: sticky;
  top: ${({ theme }) => theme.spacing[4]};
`;

const MessageList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[8]};
`;

const ErrorContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[6]};
  text-align: center;
  color: ${({ theme }) => theme.colors.danger[600]};
`;

const LoadMoreButton = styled.div`
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[4]};
`;

const MobileFiltersButton = styled.div`
  display: none;

  @media (max-width: 768px) {
    display: block;
    margin-bottom: ${({ theme }) => theme.spacing[4]};
  }
`;

const SidebarContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};

  @media (max-width: 768px) {
    display: none;
  }
`;

const defaultFilters: InboxFiltersType = {
  platform: 'all',
  message_type: 'all',
  is_read: undefined,
  is_archived: false,
  page: 1,
  limit: 20,
};

export default function InboxPage() {
  const { addToast } = useToast();
  const [filters, setFilters] = useState<InboxFiltersType>(defaultFilters);
  const [replyingTo, setReplyingTo] = useState<UnifiedMessage | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Data fetching
  const {
    data: messagesData,
    isLoading: messagesLoading,
    isError: messagesError,
    refetch: refetchMessages,
  } = useInboxMessages(filters);

  const { data: stats, isLoading: statsLoading } = useInboxStats();

  // Mutations
  const markAsRead = useMarkAsRead();
  const toggleStar = useToggleStar();
  const archiveMessage = useArchiveMessage();
  const markAllAsRead = useMarkAllAsRead();

  // Handlers
  const handleFilterChange = useCallback((newFilters: InboxFiltersType) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      page: 1, // Reset to first page on filter change
    }));
  }, []);

  const handleMarkAsRead = useCallback(
    async (messageId: string) => {
      try {
        await markAsRead.mutateAsync(messageId);
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to mark message as read',
        });
      }
    },
    [markAsRead, addToast]
  );

  const handleToggleStar = useCallback(
    async (messageId: string, starred: boolean) => {
      try {
        await toggleStar.mutateAsync({ messageId, starred });
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to update star',
        });
      }
    },
    [toggleStar, addToast]
  );

  const handleArchive = useCallback(
    async (messageId: string) => {
      try {
        await archiveMessage.mutateAsync(messageId);
        addToast({
          type: 'success',
          title: 'Archived',
          message: 'Message archived successfully',
        });
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to archive message',
        });
      }
    },
    [archiveMessage, addToast]
  );

  const handleNavigate = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      const result = await markAllAsRead.mutateAsync({
        platform: filters.platform !== 'all' ? filters.platform : undefined,
        message_type: filters.message_type !== 'all' ? filters.message_type : undefined,
      });
      addToast({
        type: 'success',
        title: 'Done',
        message: `Marked ${result?.count || 0} messages as read`,
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to mark all as read',
      });
    }
  }, [markAllAsRead, filters, addToast]);

  const handleReply = useCallback(
    async (content: string) => {
      // TODO: Implement actual reply functionality
      addToast({
        type: 'info',
        title: 'Reply',
        message: 'Reply functionality coming soon',
      });
      setReplyingTo(null);
    },
    [addToast]
  );

  const handleLoadMore = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      page: (prev.page || 1) + 1,
    }));
  }, []);

  // Filter messages by archived status (in case backend doesn't filter)
  const messages = useMemo(() => {
    if (!messagesData?.messages) return [];
    return messagesData.messages.filter((msg) => !msg.is_archived);
  }, [messagesData?.messages]);

  const hasUnread = stats && stats.total_unread > 0;
  const hasMore = messagesData?.has_more || false;

  // Sidebar content
  const sidebar = (
    <SidebarContent>
      <InboxStats stats={stats} isLoading={statsLoading} showTypeBreakdown />

      <FiltersCard padding="md">
        <Stack gap={4}>
          <Stack direction="row" align="center" gap={2}>
            <Filter size={18} />
            <span style={{ fontWeight: 600 }}>Filters</span>
          </Stack>
          <MessageFilters filters={filters} onChange={handleFilterChange} />
        </Stack>
      </FiltersCard>
    </SidebarContent>
  );

  return (
    <PageContainer>
      <PageHeader
        title="Unified Inbox"
        description="View and respond to mentions, replies, and DMs from all platforms"
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => refetchMessages()}
              disabled={messagesLoading}
              aria-label="Refresh"
            >
              <RefreshCw size={18} />
            </Button>
            {hasUnread && (
              <Button
                variant="secondary"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsRead.isPending}
                leftIcon={<CheckCheck size={18} />}
              >
                Mark All Read
              </Button>
            )}
          </>
        }
      />

      {/* Mobile filters toggle */}
      <MobileFiltersButton>
        <Button
          variant="secondary"
          fullWidth
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          leftIcon={<Filter size={18} />}
        >
          {showMobileFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>
        {showMobileFilters && (
          <Card padding="md" style={{ marginTop: 12 }}>
            <InboxStats stats={stats} isLoading={statsLoading} variant="compact" />
            <div style={{ marginTop: 16 }}>
              <MessageFilters filters={filters} onChange={handleFilterChange} />
            </div>
          </Card>
        )}
      </MobileFiltersButton>

      <SidebarLayout sidebar={sidebar} sidebarWidth={300}>
        {/* Quick Reply Panel */}
        {replyingTo && (
          <div style={{ marginBottom: 16 }}>
            <QuickReply
              message={replyingTo}
              onSend={handleReply}
              onCancel={() => setReplyingTo(null)}
            />
          </div>
        )}

        {/* Loading State */}
        {messagesLoading && !messagesData && (
          <LoadingContainer>
            <Spinner size="lg" />
          </LoadingContainer>
        )}

        {/* Error State */}
        {messagesError && (
          <Card padding="lg">
            <ErrorContainer>
              Failed to load messages. Please try again.
              <br />
              <Button
                variant="secondary"
                onClick={() => refetchMessages()}
                style={{ marginTop: 16 }}
              >
                Retry
              </Button>
            </ErrorContainer>
          </Card>
        )}

        {/* Empty State */}
        {!messagesLoading && !messagesError && messages.length === 0 && (
          <EmptyState
            icon={Inbox}
            title="No messages"
            description={
              filters.platform !== 'all' ||
              filters.message_type !== 'all' ||
              filters.is_read !== undefined
                ? 'No messages match your current filters. Try adjusting or clearing filters.'
                : 'Your inbox is empty. Connect your accounts to start receiving messages.'
            }
            action={
              filters.platform !== 'all' ||
              filters.message_type !== 'all' ||
              filters.is_read !== undefined ? (
                <Button
                  variant="secondary"
                  onClick={() => handleFilterChange(defaultFilters)}
                >
                  Clear Filters
                </Button>
              ) : undefined
            }
          />
        )}

        {/* Message List */}
        {messages.length > 0 && (
          <>
            <MessageList>
              {messages.map((message) => (
                <MessageCard
                  key={message.id}
                  message={message}
                  onMarkAsRead={handleMarkAsRead}
                  onToggleStar={handleToggleStar}
                  onArchive={handleArchive}
                  onNavigate={handleNavigate}
                />
              ))}
            </MessageList>

            {/* Load More */}
            {hasMore && (
              <LoadMoreButton>
                <Button
                  variant="secondary"
                  onClick={handleLoadMore}
                  disabled={messagesLoading}
                >
                  {messagesLoading ? 'Loading...' : 'Load More'}
                </Button>
              </LoadMoreButton>
            )}
          </>
        )}
      </SidebarLayout>
    </PageContainer>
  );
}
