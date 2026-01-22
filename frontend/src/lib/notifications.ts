import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Notification } from '@/components/notifications';

const NOTIFICATIONS_QUERY_KEY = ['notifications'];

export function useNotifications() {
  return useQuery<Notification[]>({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: async () => {
      const response = await api.getNotifications();
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load notifications');
      }
      return response.data as Notification[];
    },
    staleTime: 30 * 1000,
  });
}

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
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
}

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
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
}

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
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
}
