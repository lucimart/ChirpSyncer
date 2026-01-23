import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { PlatformType } from './connectors';

// Message types
export type MessageType = 'mention' | 'reply' | 'dm' | 'comment';

// Unified message from any platform
export interface UnifiedMessage {
  id: string;
  platform: PlatformType;
  message_type: MessageType;
  author_handle: string;
  author_name: string;
  author_avatar?: string;
  content: string;
  original_url: string;
  is_read: boolean;
  is_starred: boolean;
  is_archived: boolean;
  created_at: string;
  // Optional context
  in_reply_to?: string;
  parent_content?: string;
}

// Filter options for inbox queries
export interface InboxFilters {
  platform?: PlatformType | 'all';
  message_type?: MessageType | 'all';
  is_read?: boolean;
  is_starred?: boolean;
  is_archived?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

// Stats response
export interface InboxStats {
  total_unread: number;
  by_platform: Record<string, number>;
  by_type: Record<MessageType, number>;
}

// Paginated response
export interface InboxResponse {
  messages: UnifiedMessage[];
  total: number;
  page: number;
  has_more: boolean;
}

// Query keys
export const inboxKeys = {
  all: ['inbox'] as const,
  messages: (filters?: InboxFilters) => [...inboxKeys.all, 'messages', filters] as const,
  stats: () => [...inboxKeys.all, 'stats'] as const,
  message: (id: string) => [...inboxKeys.all, 'message', id] as const,
};

/**
 * Fetch inbox messages with optional filters
 */
export function useInboxMessages(filters?: InboxFilters) {
  return useQuery<InboxResponse>({
    queryKey: inboxKeys.messages(filters),
    queryFn: async () => {
      const params: Record<string, unknown> = {};

      if (filters?.platform && filters.platform !== 'all') {
        params.platform = filters.platform;
      }
      if (filters?.message_type && filters.message_type !== 'all') {
        params.message_type = filters.message_type;
      }
      if (filters?.is_read !== undefined) {
        params.is_read = filters.is_read;
      }
      if (filters?.is_starred !== undefined) {
        params.is_starred = filters.is_starred;
      }
      if (filters?.is_archived !== undefined) {
        params.is_archived = filters.is_archived;
      }
      if (filters?.search) {
        params.search = filters.search;
      }
      if (filters?.page) {
        params.page = filters.page;
      }
      if (filters?.limit) {
        params.limit = filters.limit;
      }

      const response = await api.get<InboxResponse>('/inbox/messages', { params });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch messages');
      }

      return response.data;
    },
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Fetch inbox stats (unread counts)
 */
export function useInboxStats() {
  return useQuery<InboxStats>({
    queryKey: inboxKeys.stats(),
    queryFn: async () => {
      const response = await api.get<InboxStats>('/inbox/stats');

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch inbox stats');
      }

      return response.data;
    },
    staleTime: 30000,
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Mark message(s) as read
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageIds: string | string[]) => {
      const ids = Array.isArray(messageIds) ? messageIds : [messageIds];

      const response = await api.post<{ success: boolean }>('/inbox/mark-read', {
        message_ids: ids,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to mark as read');
      }

      return { ids, success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inboxKeys.all });
    },
    // Optimistic update
    onMutate: async (messageIds) => {
      const ids = Array.isArray(messageIds) ? messageIds : [messageIds];

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: inboxKeys.all });

      // Snapshot previous value
      const previousMessages = queryClient.getQueriesData({ queryKey: inboxKeys.messages() });
      const previousStats = queryClient.getQueryData(inboxKeys.stats());

      // Optimistically update messages
      queryClient.setQueriesData(
        { queryKey: inboxKeys.messages() },
        (old: InboxResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            messages: old.messages.map((msg) =>
              ids.includes(msg.id) ? { ...msg, is_read: true } : msg
            ),
          };
        }
      );

      return { previousMessages, previousStats };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        context.previousMessages.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousStats) {
        queryClient.setQueryData(inboxKeys.stats(), context.previousStats);
      }
    },
  });
}

/**
 * Toggle star on a message
 */
export function useToggleStar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, starred }: { messageId: string; starred: boolean }) => {
      const response = await api.post<{ success: boolean }>(`/inbox/messages/${messageId}/star`, {
        starred,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to toggle star');
      }

      return { messageId, starred };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inboxKeys.all });
    },
    // Optimistic update
    onMutate: async ({ messageId, starred }) => {
      await queryClient.cancelQueries({ queryKey: inboxKeys.all });

      const previousMessages = queryClient.getQueriesData({ queryKey: inboxKeys.messages() });

      queryClient.setQueriesData(
        { queryKey: inboxKeys.messages() },
        (old: InboxResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            messages: old.messages.map((msg) =>
              msg.id === messageId ? { ...msg, is_starred: starred } : msg
            ),
          };
        }
      );

      return { previousMessages };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousMessages) {
        context.previousMessages.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
  });
}

/**
 * Archive a message
 */
export function useArchiveMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const response = await api.post<{ success: boolean }>(`/inbox/messages/${messageId}/archive`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to archive message');
      }

      return { messageId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inboxKeys.all });
    },
    // Optimistic update - remove from list
    onMutate: async (messageId) => {
      await queryClient.cancelQueries({ queryKey: inboxKeys.all });

      const previousMessages = queryClient.getQueriesData({ queryKey: inboxKeys.messages() });

      queryClient.setQueriesData(
        { queryKey: inboxKeys.messages() },
        (old: InboxResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            messages: old.messages.map((msg) =>
              msg.id === messageId ? { ...msg, is_archived: true } : msg
            ),
            total: old.total - 1,
          };
        }
      );

      return { previousMessages };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousMessages) {
        context.previousMessages.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
  });
}

/**
 * Mark all messages as read
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (filters?: Pick<InboxFilters, 'platform' | 'message_type'>) => {
      const response = await api.post<{ success: boolean; count: number }>('/inbox/mark-all-read', filters);

      if (!response.success) {
        throw new Error(response.error || 'Failed to mark all as read');
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inboxKeys.all });
    },
  });
}
