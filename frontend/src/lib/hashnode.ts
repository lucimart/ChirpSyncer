/**
 * Hashnode API client hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

// Types
export interface HashnodeUser {
  id: string;
  username: string;
  name: string;
  bio?: {
    markdown: string;
  };
  profilePicture: string;
  socialMediaLinks?: {
    twitter?: string;
    github?: string;
    linkedin?: string;
    website?: string;
  };
  badges?: Array<{
    id: string;
    name: string;
  }>;
  followersCount: number;
  followingsCount: number;
  posts?: {
    totalDocuments: number;
  };
}

export interface HashnodePublication {
  id: string;
  title: string;
  displayTitle?: string;
  url: string;
  canonicalURL?: string;
  favicon?: string;
  isTeam: boolean;
  followersCount: number;
  about?: {
    markdown: string;
  };
}

export interface HashnodePost {
  id: string;
  title: string;
  slug: string;
  brief?: string;
  url: string;
  canonicalUrl?: string;
  publishedAt: string;
  updatedAt?: string;
  readTimeInMinutes: number;
  views?: number;
  reactionCount?: number;
  responseCount?: number;
  content?: {
    markdown: string;
    html: string;
  };
  coverImage?: {
    url: string;
  };
  tags?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  author?: {
    id: string;
    username: string;
    name: string;
  };
  seo?: {
    title?: string;
    description?: string;
  };
}

export interface HashnodeDraft {
  id: string;
  title: string;
  slug?: string;
  updatedAt: string;
  author?: {
    username: string;
  };
}

export interface HashnodeSeries {
  id: string;
  name: string;
  slug: string;
  description?: {
    markdown: string;
  };
  coverImage?: string;
  posts?: {
    totalDocuments: number;
  };
}

export interface HashnodeTag {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  postsCount?: number;
  followersCount?: number;
}

export interface PageInfo {
  hasNextPage: boolean;
  endCursor?: string;
}

export interface CreatePostInput {
  title: string;
  contentMarkdown: string;
  tags?: Array<{ id: string; name?: string; slug?: string }>;
  coverImageURL?: string;
  slug?: string;
  subtitle?: string;
  disableComments?: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

export interface UpdatePostInput {
  title?: string;
  contentMarkdown?: string;
  subtitle?: string;
  slug?: string;
  coverImageURL?: string;
  tags?: Array<{ id: string; name?: string; slug?: string }>;
}

// Query keys
export const hashnodeKeys = {
  all: ['hashnode'] as const,
  me: () => [...hashnodeKeys.all, 'me'] as const,
  publications: () => [...hashnodeKeys.all, 'publications'] as const,
  posts: (publicationId: string, params?: { first?: number; after?: string }) =>
    [...hashnodeKeys.all, 'posts', publicationId, params] as const,
  post: (postId: string) => [...hashnodeKeys.all, 'post', postId] as const,
  drafts: (publicationId: string, params?: { first?: number; after?: string }) =>
    [...hashnodeKeys.all, 'drafts', publicationId, params] as const,
  series: (publicationId: string, params?: { first?: number; after?: string }) =>
    [...hashnodeKeys.all, 'series', publicationId, params] as const,
  tags: (params?: { q?: string; first?: number }) =>
    [...hashnodeKeys.all, 'tags', params] as const,
};

// Hooks
export function useHashnodeMe() {
  return useQuery({
    queryKey: hashnodeKeys.me(),
    queryFn: async () => {
      const response = await api.get<HashnodeUser>('/hashnode/me');
      return response.data;
    },
  });
}

export function useHashnodePublications() {
  return useQuery({
    queryKey: hashnodeKeys.publications(),
    queryFn: async () => {
      const response = await api.get<{ publications: HashnodePublication[] }>(
        '/hashnode/publications'
      );
      return response.data?.publications;
    },
  });
}

export function useHashnodePosts(
  publicationId: string,
  params?: { first?: number; after?: string }
) {
  return useQuery({
    queryKey: hashnodeKeys.posts(publicationId, params),
    queryFn: async () => {
      const response = await api.get<{ posts: HashnodePost[]; pageInfo: PageInfo }>(
        `/hashnode/publications/${publicationId}/posts`,
        { params }
      );
      return response.data;
    },
    enabled: !!publicationId,
  });
}

export function useHashnodePost(postId: string) {
  return useQuery({
    queryKey: hashnodeKeys.post(postId),
    queryFn: async () => {
      const response = await api.get<HashnodePost>(`/hashnode/posts/${postId}`);
      return response.data;
    },
    enabled: !!postId,
  });
}

export function useCreateHashnodePost(publicationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePostInput) => {
      const response = await api.post<HashnodePost>(
        `/hashnode/publications/${publicationId}/posts`,
        input
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hashnodeKeys.all });
    },
  });
}

export function useUpdateHashnodePost(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdatePostInput) => {
      const response = await api.put<HashnodePost>(`/hashnode/posts/${postId}`, input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hashnodeKeys.all });
    },
  });
}

export function useDeleteHashnodePost(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.delete(`/hashnode/posts/${postId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hashnodeKeys.all });
    },
  });
}

export function useHashnodeDrafts(
  publicationId: string,
  params?: { first?: number; after?: string }
) {
  return useQuery({
    queryKey: hashnodeKeys.drafts(publicationId, params),
    queryFn: async () => {
      const response = await api.get<{ drafts: HashnodeDraft[]; pageInfo: PageInfo }>(
        `/hashnode/publications/${publicationId}/drafts`,
        { params }
      );
      return response.data;
    },
    enabled: !!publicationId,
  });
}

export function useHashnodeSeries(
  publicationId: string,
  params?: { first?: number; after?: string }
) {
  return useQuery({
    queryKey: hashnodeKeys.series(publicationId, params),
    queryFn: async () => {
      const response = await api.get<{ series: HashnodeSeries[]; pageInfo: PageInfo }>(
        `/hashnode/publications/${publicationId}/series`,
        { params }
      );
      return response.data;
    },
    enabled: !!publicationId,
  });
}

export function useHashnodeTags(params?: { q?: string; first?: number }) {
  return useQuery({
    queryKey: hashnodeKeys.tags(params),
    queryFn: async () => {
      const response = await api.get<{ tags: HashnodeTag[] }>('/hashnode/tags', {
        params,
      });
      return response.data?.tags;
    },
  });
}
