import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Notification } from '@/components/notifications';

// Extended notification types for Notifications Hub
export type NotificationCategory = 'sync' | 'alert' | 'system' | 'engagement' | 'security';
export type NotificationPriority = 1 | 2 | 3 | 4 | 5;
export type EmailDigestFrequency = 'daily' | 'weekly';

export interface NotificationPreferences {
  in_app_enabled: boolean;
  push_enabled: boolean;
  telegram_enabled: boolean;
  telegram_chat_id?: string;
  discord_enabled: boolean;
  discord_webhook_url?: string;
  email_digest_enabled: boolean;
  email_digest_frequency: EmailDigestFrequency;
  quiet_hours_start?: number;
  quiet_hours_end?: number;
}

export interface NotificationFilters {
  category?: NotificationCategory | 'all';
  is_read?: boolean;
  priority?: NotificationPriority;
  page?: number;
  limit?: number;
}

export interface NotificationsResponse {
  notifications: (Notification & {
    category?: NotificationCategory;
    body?: string;
    priority?: NotificationPriority;
    is_read?: boolean;
    created_at?: string;
    data?: Record<string, unknown>;
  })[];
  total: number;
  unread_count: number;
  page: number;
  has_more: boolean;
}

// Query keys
export const notificationKeys = {
  all: ['notifications'] as const,
  list: (filters?: NotificationFilters) => [...notificationKeys.all, 'list', filters] as const,
  infinite: (filters?: NotificationFilters) => [...notificationKeys.all, 'infinite', filters] as const,
  preferences: () => [...notificationKeys.all, 'preferences'] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
};

/**
 * Fetch notifications with optional filters
 */
export function useNotifications(filters?: NotificationFilters) {
  return useQuery<NotificationsResponse>({
    queryKey: notificationKeys.list(filters),
    queryFn: async () => {
      const params: Record<string, unknown> = {};

      if (filters?.category && filters.category !== 'all') {
        params.category = filters.category;
      }
      if (filters?.is_read !== undefined) {
        params.is_read = filters.is_read;
      }
      if (filters?.priority !== undefined) {
        params.priority = filters.priority;
      }
      if (filters?.page) {
        params.page = filters.page;
      }
      if (filters?.limit) {
        params.limit = filters.limit;
      }

      const response = await api.get<NotificationsResponse>('/notifications', { params });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch notifications');
      }

      return response.data;
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

/**
 * Fetch notifications with infinite scroll
 */
export function useInfiniteNotifications(filters?: Omit<NotificationFilters, 'page'>) {
  return useInfiniteQuery<NotificationsResponse>({
    queryKey: notificationKeys.infinite(filters),
    queryFn: async ({ pageParam = 1 }) => {
      const params: Record<string, unknown> = {
        page: pageParam,
        limit: filters?.limit || 20,
      };

      if (filters?.category && filters.category !== 'all') {
        params.category = filters.category;
      }
      if (filters?.is_read !== undefined) {
        params.is_read = filters.is_read;
      }
      if (filters?.priority !== undefined) {
        params.priority = filters.priority;
      }

      const response = await api.get<NotificationsResponse>('/notifications', { params });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch notifications');
      }

      return response.data;
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.has_more) return undefined;
      return lastPage.page + 1;
    },
    initialPageParam: 1,
    staleTime: 30000,
  });
}

/**
 * Mark notification as read
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation<Notification, Error, string>({
    mutationFn: async (id) => {
      const response = await api.markNotificationRead(id);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to mark notification as read');
      }
      return response.data as Notification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    // Optimistic update
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });

      const previousData = queryClient.getQueriesData({ queryKey: notificationKeys.list() });

      queryClient.setQueriesData(
        { queryKey: notificationKeys.list() },
        (old: NotificationsResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            notifications: old.notifications.map((n) =>
              n.id === notificationId ? { ...n, read: true, is_read: true } : n
            ),
            unread_count: Math.max(0, old.unread_count - 1),
          };
        }
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
  });
}

/**
 * Mark all notifications as read
 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error>({
    mutationFn: async () => {
      const response = await api.markAllNotificationsRead();
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to mark all notifications as read');
      }
      return response.data as { success: boolean };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Delete/dismiss a notification
 */
export function useDismissNotification() {
  const queryClient = useQueryClient();

  return useMutation<{ deleted: boolean }, Error, string>({
    mutationFn: async (id) => {
      const response = await api.deleteNotification(id);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to dismiss notification');
      }
      return response.data as { deleted: boolean };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Fetch notification preferences
 */
export function useNotificationPreferences() {
  return useQuery<NotificationPreferences>({
    queryKey: notificationKeys.preferences(),
    queryFn: async () => {
      const response = await api.get<NotificationPreferences>('/notifications/preferences');

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch notification preferences');
      }

      return response.data;
    },
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Update notification preferences
 */
export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences: Partial<NotificationPreferences>) => {
      const response = await api.put<NotificationPreferences>(
        '/notifications/preferences',
        preferences
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to update preferences');
      }

      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(notificationKeys.preferences(), data);
    },
    // Optimistic update
    onMutate: async (newPreferences) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.preferences() });

      const previousPreferences = queryClient.getQueryData<NotificationPreferences>(
        notificationKeys.preferences()
      );

      queryClient.setQueryData(
        notificationKeys.preferences(),
        (old: NotificationPreferences | undefined) => {
          if (!old) return old;
          return { ...old, ...newPreferences };
        }
      );

      return { previousPreferences };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousPreferences) {
        queryClient.setQueryData(notificationKeys.preferences(), context.previousPreferences);
      }
    },
  });
}

/**
 * Test a notification channel
 */
export function useTestChannel() {
  return useMutation({
    mutationFn: async (channel: 'telegram' | 'discord' | 'email') => {
      const response = await api.post<{ success: boolean; message: string }>(
        `/notifications/test/${channel}`
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || `Failed to test ${channel} channel`);
      }

      return response.data;
    },
  });
}

/**
 * Get unread notification count
 */
export function useUnreadNotificationCount() {
  return useQuery<number>({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      const response = await api.get<{ unread_count: number }>('/notifications/unread-count');

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch unread count');
      }

      return response.data.unread_count;
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

// Priority colors for UI
export const PRIORITY_COLORS = {
  1: 'neutral',
  2: 'info',
  3: 'warning',
  4: 'error',
  5: 'error',
} as const;

// Category display config
export const CATEGORY_CONFIG = {
  sync: { label: 'Sync', color: 'primary' },
  alert: { label: 'Alert', color: 'warning' },
  system: { label: 'System', color: 'neutral' },
  engagement: { label: 'Engagement', color: 'success' },
  security: { label: 'Security', color: 'danger' },
} as const;
