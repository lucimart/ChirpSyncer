import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AdminUser } from '@/types';

export function useAdminUsers(params?: { search?: string; page?: number; limit?: number }) {
  return useQuery<AdminUser[]>({
    queryKey: ['admin-users', params?.search, params?.page, params?.limit],
    queryFn: async () => {
      const response = await api.getAdminUsers(params);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch users');
      }
      return response.data!;
    },
  });
}

export function useAdminUser(id: string) {
  return useQuery<AdminUser>({
    queryKey: ['admin-user', id],
    queryFn: async () => {
      const response = await api.getAdminUser(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch user');
      }
      return response.data!;
    },
    enabled: !!id,
  });
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();

  return useMutation<
    AdminUser,
    Error,
    { id: string; email?: string; password?: string; is_active?: boolean; is_admin?: boolean }
  >({
    mutationFn: async ({ id, ...payload }) => {
      const response = await api.updateAdminUser(id, payload);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update user');
      }
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}

export function useDeleteAdminUser() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const response = await api.deleteAdminUser(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete user');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}

export function useToggleUserActive() {
  const queryClient = useQueryClient();

  return useMutation<AdminUser, Error, string>({
    mutationFn: async (id) => {
      const response = await api.toggleUserActive(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to toggle user status');
      }
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}

export function useToggleUserAdmin() {
  const queryClient = useQueryClient();

  return useMutation<AdminUser, Error, string>({
    mutationFn: async (id) => {
      const response = await api.toggleUserAdmin(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to toggle admin status');
      }
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });
}
