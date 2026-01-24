/**
 * RSS/Atom Feed API client hooks
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from './api';

// Types
export interface RSSFeedEntry {
  id: string;
  title: string;
  link: string;
  description?: string;
  content?: string;
  summary?: string;
  published?: string;
  updated?: string;
  author?: string | { name?: string; email?: string; uri?: string };
  categories: string[];
  enclosures?: { url: string; type: string; length: string }[];
}

export interface RSSFeed {
  type: 'rss' | 'atom';
  title: string;
  link: string;
  description?: string;
  language?: string;
  last_build_date?: string;
  updated?: string;
  image?: { url: string; title: string; link: string };
  author?: { name?: string; email?: string; uri?: string };
  entries: RSSFeedEntry[];
  url: string;
  fetched_at: string;
}

export interface DiscoveredFeed {
  url: string;
  type: 'rss' | 'atom';
  title: string;
}

export interface OPMLFeed {
  url: string;
  title: string;
  html_url: string;
  type: string;
  folder: string;
}

export interface OPMLMetadata {
  title: string;
  date_created: string;
  owner_name: string;
}

export interface FeedValidation {
  url: string;
  valid: boolean;
  type: 'rss' | 'atom' | null;
  title: string | null;
  entry_count: number;
  errors: string[];
}

export interface FeedHash {
  url: string;
  content_hash: string;
  etag: string | null;
  last_modified: string | null;
  content_length: number;
}

// Query keys
export const rssKeys = {
  all: ['rss'] as const,
  feed: (url: string) => [...rssKeys.all, 'feed', url] as const,
  discover: (url: string) => [...rssKeys.all, 'discover', url] as const,
  validate: (url: string) => [...rssKeys.all, 'validate', url] as const,
  hash: (url: string) => [...rssKeys.all, 'hash', url] as const,
};

// Hooks
export function useParseFeed(feedUrl: string, enabled = true) {
  return useQuery({
    queryKey: rssKeys.feed(feedUrl),
    queryFn: async () => {
      const response = await api.post<RSSFeed>('/rss/parse', { url: feedUrl });
      return response.data;
    },
    enabled: enabled && !!feedUrl,
  });
}

export function useDiscoverFeeds(pageUrl: string, enabled = true) {
  return useQuery({
    queryKey: rssKeys.discover(pageUrl),
    queryFn: async () => {
      const response = await api.post<{ feeds: DiscoveredFeed[]; source_url: string }>(
        '/rss/discover',
        { url: pageUrl }
      );
      return response.data;
    },
    enabled: enabled && !!pageUrl,
  });
}

export function useValidateFeed(feedUrl: string, enabled = true) {
  return useQuery({
    queryKey: rssKeys.validate(feedUrl),
    queryFn: async () => {
      const response = await api.post<FeedValidation>('/rss/validate', { url: feedUrl });
      return response.data;
    },
    enabled: enabled && !!feedUrl,
  });
}

export function useFeedHash(feedUrl: string, enabled = true) {
  return useQuery({
    queryKey: rssKeys.hash(feedUrl),
    queryFn: async () => {
      const response = await api.post<FeedHash>('/rss/hash', { url: feedUrl });
      return response.data;
    },
    enabled: enabled && !!feedUrl,
  });
}

export function useParseFeedMutation() {
  return useMutation({
    mutationFn: async (feedUrl: string) => {
      const response = await api.post<RSSFeed>('/rss/parse', { url: feedUrl });
      return response.data;
    },
  });
}

export function useDiscoverFeedsMutation() {
  return useMutation({
    mutationFn: async (pageUrl: string) => {
      const response = await api.post<{ feeds: DiscoveredFeed[]; source_url: string }>(
        '/rss/discover',
        { url: pageUrl }
      );
      return response.data;
    },
  });
}

export function useParseOPML() {
  return useMutation({
    mutationFn: async (content: string) => {
      const response = await api.post<{
        data: { feeds: OPMLFeed[]; total: number; metadata: OPMLMetadata };
      }>('/rss/opml/parse', { content });
      return response.data;
    },
  });
}

export function useParseOPMLFile() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      // Note: FormData sets content-type automatically
      const response = await api.post<{ feeds: OPMLFeed[]; total: number; metadata: OPMLMetadata }>(
        '/rss/opml/parse',
        formData
      );
      return response.data;
    },
  });
}

export function useExportOPML() {
  return useMutation({
    mutationFn: async ({
      feeds,
      title,
      ownerName,
    }: {
      feeds: Array<{ url: string; title?: string; html_url?: string; folder?: string }>;
      title?: string;
      ownerName?: string;
    }) => {
      const response = await api.post<{ opml: string; feed_count: number }>(
        '/rss/opml/export',
        {
          feeds,
          title,
          owner_name: ownerName,
        }
      );
      return response.data;
    },
  });
}

export function useValidateFeedMutation() {
  return useMutation({
    mutationFn: async (feedUrl: string) => {
      const response = await api.post<FeedValidation>('/rss/validate', { url: feedUrl });
      return response.data;
    },
  });
}

export function useFeedHashMutation() {
  return useMutation({
    mutationFn: async (feedUrl: string) => {
      const response = await api.post<FeedHash>('/rss/hash', { url: feedUrl });
      return response.data;
    },
  });
}
