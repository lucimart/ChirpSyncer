/**
 * Dev.to (Forem) API client hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

// Types
export interface DevtoUser {
  id: number;
  username: string;
  name: string;
  twitter_username: string | null;
  github_username: string | null;
  summary: string | null;
  location: string | null;
  website_url: string | null;
  joined_at: string;
  profile_image: string;
}

export interface DevtoArticle {
  id: number;
  title: string;
  description: string;
  slug: string;
  path: string;
  url: string;
  canonical_url: string;
  comments_count: number;
  positive_reactions_count: number;
  public_reactions_count: number;
  page_views_count: number;
  published_at: string | null;
  created_at: string;
  edited_at: string | null;
  published: boolean;
  tags: string[];
  tag_list: string;
  cover_image: string | null;
  body_markdown: string;
  body_html: string;
  reading_time_minutes: number;
  user: {
    name: string;
    username: string;
    profile_image: string;
  };
}

export interface DevtoComment {
  id_code: string;
  body_html: string;
  created_at: string;
  user: {
    name: string;
    username: string;
    profile_image_90: string;
  };
  children: DevtoComment[];
}

export interface DevtoTag {
  id: number;
  name: string;
  bg_color_hex: string;
  text_color_hex: string;
}

export interface DevtoOrganization {
  id: number;
  username: string;
  name: string;
  summary: string;
  profile_image: string;
  slug: string;
}

export interface DevtoFollower {
  id: number;
  name: string;
  path: string;
  username: string;
  profile_image: string;
}

export interface CreateArticleInput {
  title: string;
  body_markdown: string;
  published?: boolean;
  tags?: string[];
  series?: string;
  main_image?: string;
  canonical_url?: string;
  description?: string;
  organization_id?: number;
}

// Query keys
export const devtoKeys = {
  all: ['devto'] as const,
  me: () => [...devtoKeys.all, 'me'] as const,
  articles: (params?: { page?: number; per_page?: number; state?: string }) =>
    [...devtoKeys.all, 'articles', params] as const,
  publishedArticles: (params?: { page?: number; per_page?: number }) =>
    [...devtoKeys.all, 'articles', 'published', params] as const,
  unpublishedArticles: (params?: { page?: number; per_page?: number }) =>
    [...devtoKeys.all, 'articles', 'unpublished', params] as const,
  article: (id: number) => [...devtoKeys.all, 'article', id] as const,
  comments: (articleId: number) => [...devtoKeys.all, 'comments', articleId] as const,
  tags: (params?: { page?: number; per_page?: number }) =>
    [...devtoKeys.all, 'tags', params] as const,
  organization: (id: string) => [...devtoKeys.all, 'organization', id] as const,
  followers: (params?: { page?: number; per_page?: number }) =>
    [...devtoKeys.all, 'followers', params] as const,
  readingList: (params?: { page?: number; per_page?: number }) =>
    [...devtoKeys.all, 'reading-list', params] as const,
};

// Hooks
export function useDevtoMe() {
  return useQuery({
    queryKey: devtoKeys.me(),
    queryFn: async () => {
      const response = await api.get<DevtoUser>('/devto/me');
      return response.data;
    },
  });
}

export function useDevtoArticles(params?: { page?: number; per_page?: number; state?: string }) {
  return useQuery({
    queryKey: devtoKeys.articles(params),
    queryFn: async () => {
      const response = await api.get<{ articles: DevtoArticle[] }>('/devto/articles', {
        params,
      });
      return response.data?.articles;
    },
  });
}

export function useDevtoPublishedArticles(params?: { page?: number; per_page?: number }) {
  return useQuery({
    queryKey: devtoKeys.publishedArticles(params),
    queryFn: async () => {
      const response = await api.get<{ articles: DevtoArticle[] }>(
        '/devto/articles/published',
        { params }
      );
      return response.data?.articles;
    },
  });
}

export function useDevtoUnpublishedArticles(params?: { page?: number; per_page?: number }) {
  return useQuery({
    queryKey: devtoKeys.unpublishedArticles(params),
    queryFn: async () => {
      const response = await api.get<{ articles: DevtoArticle[] }>(
        '/devto/articles/unpublished',
        { params }
      );
      return response.data?.articles;
    },
  });
}

export function useDevtoArticle(articleId: number) {
  return useQuery({
    queryKey: devtoKeys.article(articleId),
    queryFn: async () => {
      const response = await api.get<DevtoArticle>(`/devto/articles/${articleId}`);
      return response.data;
    },
    enabled: !!articleId,
  });
}

export function useCreateDevtoArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateArticleInput) => {
      const response = await api.post<DevtoArticle>('/devto/articles', input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: devtoKeys.all });
    },
  });
}

export function useUpdateDevtoArticle(articleId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<CreateArticleInput>) => {
      const response = await api.put<DevtoArticle>(`/devto/articles/${articleId}`, input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: devtoKeys.all });
    },
  });
}

export function useUnpublishDevtoArticle(articleId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.put<DevtoArticle>(
        `/devto/articles/${articleId}/unpublish`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: devtoKeys.all });
    },
  });
}

export function useDevtoComments(articleId: number) {
  return useQuery({
    queryKey: devtoKeys.comments(articleId),
    queryFn: async () => {
      const response = await api.get<{ comments: DevtoComment[] }>('/devto/comments', {
        params: { a_id: articleId },
      });
      return response.data?.comments;
    },
    enabled: !!articleId,
  });
}

export function useDevtoTags(params?: { page?: number; per_page?: number }) {
  return useQuery({
    queryKey: devtoKeys.tags(params),
    queryFn: async () => {
      const response = await api.get<{ tags: DevtoTag[] }>('/devto/tags', { params });
      return response.data?.tags;
    },
  });
}

export function useDevtoOrganization(organizationId: string) {
  return useQuery({
    queryKey: devtoKeys.organization(organizationId),
    queryFn: async () => {
      const response = await api.get<DevtoOrganization>(
        `/devto/organizations/${organizationId}`
      );
      return response.data;
    },
    enabled: !!organizationId,
  });
}

export function useDevtoFollowers(params?: { page?: number; per_page?: number; sort?: string }) {
  return useQuery({
    queryKey: devtoKeys.followers(params),
    queryFn: async () => {
      const response = await api.get<{ followers: DevtoFollower[] }>('/devto/followers', {
        params,
      });
      return response.data?.followers;
    },
  });
}

export function useDevtoReadingList(params?: { page?: number; per_page?: number }) {
  return useQuery({
    queryKey: devtoKeys.readingList(params),
    queryFn: async () => {
      const response = await api.get<{ reading_list: DevtoArticle[] }>(
        '/devto/readinglist',
        { params }
      );
      return response.data?.reading_list;
    },
  });
}
