/**
 * Cohost API client hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

// Types
export interface CohostUser {
  loggedIn: boolean;
  userId?: number;
  email?: string;
  modMode?: boolean;
  activated?: boolean;
  readOnly?: boolean;
  projectId?: number;
}

export interface CohostProject {
  projectId: number;
  handle: string;
  displayName: string;
  dek?: string;
  description?: string;
  avatarURL?: string;
  avatarPreviewURL?: string;
  headerURL?: string;
  headerPreviewURL?: string;
  privacy: 'public' | 'private';
  pronouns?: string;
  url?: string;
  flags?: string[];
  avatarShape: 'circle' | 'squircle' | 'capsule-big' | 'capsule-small';
}

export interface CohostBlock {
  type: 'markdown' | 'attachment' | 'attachment-row';
  markdown?: {
    content: string;
  };
  attachment?: {
    fileURL: string;
    previewURL?: string;
    attachmentId: string;
    altText?: string;
  };
  attachmentRow?: string[];
}

export interface CohostPost {
  postId: number;
  headline: string;
  publishedAt: string;
  filename: string;
  state: number;
  numComments: number;
  numSharedComments: number;
  cws: string[];
  tags: string[];
  blocks: CohostBlock[];
  plainTextBody: string;
  postingProject: CohostProject;
  shareTree: CohostPost[];
  relatedProjects?: CohostProject[];
  singlePostPageUrl: string;
  effectiveAdultContent: boolean;
  isEditor: boolean;
  contributorBlockIncomingOrOutgoing: boolean;
  hasAnyContributorMuted: boolean;
  isLiked: boolean;
  canShare: boolean;
  canPublish: boolean;
  hasCohostPlus: boolean;
  pinned: boolean;
  commentsLocked: boolean;
  sharesLocked: boolean;
}

export interface CohostPagination {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
}

export interface CreatePostInput {
  headline?: string;
  blocks: CohostBlock[];
  tags?: string[];
  cws?: string[];
  adultContent?: boolean;
  shareOfPostId?: number;
}

// Query keys
export const cohostKeys = {
  all: ['cohost'] as const,
  me: () => [...cohostKeys.all, 'me'] as const,
  projects: () => [...cohostKeys.all, 'projects'] as const,
  project: (handle: string) => [...cohostKeys.all, 'project', handle] as const,
  projectPosts: (handle: string, page?: number) =>
    [...cohostKeys.all, 'project-posts', handle, page] as const,
  dashboard: (page?: number) => [...cohostKeys.all, 'dashboard', page] as const,
  notifications: (page?: number) => [...cohostKeys.all, 'notifications', page] as const,
  tagPosts: (tag: string, page?: number) => [...cohostKeys.all, 'tag-posts', tag, page] as const,
};

// Hooks
export function useCohostMe() {
  return useQuery({
    queryKey: cohostKeys.me(),
    queryFn: async () => {
      const response = await api.get<CohostUser>('/cohost/me');
      return response.data;
    },
  });
}

export function useCohostProjects() {
  return useQuery({
    queryKey: cohostKeys.projects(),
    queryFn: async () => {
      const response = await api.get<{ projects: CohostProject[] }>('/cohost/projects');
      return response.data?.projects;
    },
  });
}

export function useCohostProject(handle: string) {
  return useQuery({
    queryKey: cohostKeys.project(handle),
    queryFn: async () => {
      const response = await api.get<CohostProject>(`/cohost/projects/${handle}`);
      return response.data;
    },
    enabled: !!handle,
  });
}

export function useCohostProjectPosts(handle: string, page = 0) {
  return useQuery({
    queryKey: cohostKeys.projectPosts(handle, page),
    queryFn: async () => {
      const response = await api.get<{ posts: CohostPost[]; pagination: CohostPagination }>(
        `/cohost/projects/${handle}/posts`,
        { params: { page } }
      );
      return response.data;
    },
    enabled: !!handle,
  });
}

export function useCreateCohostPost(projectId: string | number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePostInput) => {
      const response = await api.post<CohostPost>(
        `/cohost/projects/${projectId}/posts`,
        input
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cohostKeys.all });
    },
  });
}

export function useUpdateCohostPost(projectId: string | number, postId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<CreatePostInput>) => {
      const response = await api.put<CohostPost>(
        `/cohost/projects/${projectId}/posts/${postId}`,
        input
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cohostKeys.all });
    },
  });
}

export function useDeleteCohostPost(projectId: string | number, postId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.delete(`/cohost/projects/${projectId}/posts/${postId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cohostKeys.all });
    },
  });
}

export function useLikeCohostPost(postId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post<{ liked: boolean }>(`/cohost/posts/${postId}/like`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cohostKeys.all });
    },
  });
}

export function useUnlikeCohostPost(postId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post<{ unliked: boolean }>(
        `/cohost/posts/${postId}/unlike`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cohostKeys.all });
    },
  });
}

export function useCohostDashboard(page = 0) {
  return useQuery({
    queryKey: cohostKeys.dashboard(page),
    queryFn: async () => {
      const response = await api.get<{ posts: CohostPost[]; pagination: CohostPagination }>(
        '/cohost/dashboard',
        { params: { page } }
      );
      return response.data;
    },
  });
}

export function useFollowCohostProject(handle: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post<{ following: boolean }>(
        `/cohost/projects/${handle}/follow`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cohostKeys.project(handle) });
    },
  });
}

export function useUnfollowCohostProject(handle: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.post<{ unfollowed: boolean }>(
        `/cohost/projects/${handle}/unfollow`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cohostKeys.project(handle) });
    },
  });
}

export function useCohostNotifications(page = 0) {
  return useQuery({
    queryKey: cohostKeys.notifications(page),
    queryFn: async () => {
      const response = await api.get<unknown>('/cohost/notifications', {
        params: { page },
      });
      return response.data;
    },
  });
}

export function useCohostTagPosts(tag: string, page = 0) {
  return useQuery({
    queryKey: cohostKeys.tagPosts(tag, page),
    queryFn: async () => {
      const response = await api.get<{ posts: CohostPost[]; pagination: CohostPagination }>(
        `/cohost/tags/${tag}`,
        { params: { page } }
      );
      return response.data;
    },
    enabled: !!tag,
  });
}
