/**
 * Medium API client hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

// Types
export interface MediumUser {
  id: string;
  username: string;
  name: string;
  url: string;
  imageUrl: string;
}

export interface MediumPublication {
  id: string;
  name: string;
  description: string;
  url: string;
  imageUrl: string;
}

export interface MediumPost {
  id: string;
  title: string;
  authorId: string;
  url: string;
  canonicalUrl: string;
  publishStatus: 'public' | 'draft' | 'unlisted';
  publishedAt: number;
  license: string;
  licenseUrl: string;
  tags: string[];
}

export interface CreatePostInput {
  title: string;
  content: string;
  contentFormat?: 'html' | 'markdown';
  publishStatus?: 'public' | 'draft' | 'unlisted';
  tags?: string[];
  canonicalUrl?: string;
  license?: string;
}

// Query keys
export const mediumKeys = {
  all: ['medium'] as const,
  me: () => [...mediumKeys.all, 'me'] as const,
  publications: (userId: string) => [...mediumKeys.all, 'publications', userId] as const,
  contributors: (publicationId: string) => [...mediumKeys.all, 'contributors', publicationId] as const,
};

// Hooks
export function useMediumMe() {
  return useQuery({
    queryKey: mediumKeys.me(),
    queryFn: async () => {
      const response = await api.get<MediumUser>('/medium/me');
      return response.data;
    },
  });
}

export function useMediumPublications(userId: string) {
  return useQuery({
    queryKey: mediumKeys.publications(userId),
    queryFn: async () => {
      const response = await api.get<{ publications: MediumPublication[] }>(
        `/medium/users/${userId}/publications`
      );
      return response.data?.publications;
    },
    enabled: !!userId,
  });
}

export function useCreateMediumPost(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePostInput) => {
      const response = await api.post<MediumPost>(
        `/medium/users/${userId}/posts`,
        input
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediumKeys.all });
    },
  });
}

export function useCreatePublicationPost(publicationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePostInput) => {
      const response = await api.post<MediumPost>(
        `/medium/publications/${publicationId}/posts`,
        input
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mediumKeys.all });
    },
  });
}

export function useUploadMediumImage() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);

      // Note: FormData sets content-type automatically
      const response = await api.post<{ url: string; md5: string }>(
        '/medium/images',
        formData
      );
      return response.data;
    },
  });
}

export function useMediumPublicationContributors(publicationId: string) {
  return useQuery({
    queryKey: mediumKeys.contributors(publicationId),
    queryFn: async () => {
      const response = await api.get<{ contributors: Array<{ publicationId: string; userId: string; role: string }> }>(
        `/medium/publications/${publicationId}/contributors`
      );
      return response.data?.contributors;
    },
    enabled: !!publicationId,
  });
}
