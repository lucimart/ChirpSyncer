import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CanonicalPost } from './connectors';

// Threads API Types

export interface ThreadsUser {
  id: string;
  username: string;
  name?: string;
  threads_profile_picture_url?: string;
  threads_biography?: string;
  is_eligible_for_geo_gating?: boolean;
}

export interface ThreadsPost {
  id: string;
  media_product_type?: string;
  media_type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL';
  media_url?: string;
  permalink?: string;
  owner?: { id: string };
  username?: string;
  text?: string;
  timestamp?: string;
  shortcode?: string;
  is_quote_post?: boolean;
  children?: Array<{ id: string }>;
}

export interface ThreadsResponse {
  data: ThreadsPost[];
  next_cursor?: string;
}

export interface ThreadsInsights {
  thread_id: string;
  views?: number;
  likes?: number;
  replies?: number;
  reposts?: number;
  quotes?: number;
}

export interface ThreadsAccountInsights {
  since: string;
  until: string;
  insights: {
    views?: number;
    likes?: number;
    replies?: number;
    reposts?: number;
    quotes?: number;
    followers_count?: number;
  };
}

// Publishing types
export interface CreateThreadContainerRequest {
  media_type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL';
  text?: string;
  image_url?: string;
  video_url?: string;
  children?: string[];
  reply_to_id?: string;
  quote_post_id?: string;
}

export interface ContainerResponse {
  container_id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'FINISHED' | 'ERROR' | 'EXPIRED';
  error_message?: string;
}

export interface PublishResponse {
  thread_id: string;
  permalink?: string;
  status: 'PUBLISHED';
}

// Utility Functions

export function getProfileUrl(username: string): string {
  return `https://threads.net/@${username}`;
}

export function getThreadUrl(username: string, shortcode: string): string {
  return `https://threads.net/@${username}/post/${shortcode}`;
}

export function threadsToCanonical(post: ThreadsPost, user?: ThreadsUser): CanonicalPost {
  return {
    id: post.id,
    content: post.text || '',
    created_at: post.timestamp || new Date().toISOString(),
    author: {
      id: user?.id || post.owner?.id || 'unknown',
      handle: user?.username || post.username || 'unknown',
      displayName: user?.name || user?.username || post.username || 'Unknown',
      avatar: user?.threads_profile_picture_url,
    },
    media: post.media_url
      ? [{
          type: post.media_type === 'VIDEO' ? 'video' : 'image',
          url: post.media_url,
        }]
      : undefined,
    metrics: { likes: 0, reposts: 0, replies: 0, quotes: 0 },
  };
}

// API Client

class ThreadsApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`/api/v1/threads${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data.data;
  }

  // Profile
  async getOwnProfile(): Promise<ThreadsUser> {
    return this.request('/profile');
  }

  // Threads
  async getThreads(limit = 25, since?: string, until?: string): Promise<ThreadsResponse> {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (since) params.set('since', since);
    if (until) params.set('until', until);
    return this.request(`/threads?${params.toString()}`);
  }

  async getSingleThread(threadId: string): Promise<ThreadsPost> {
    return this.request(`/thread/${encodeURIComponent(threadId)}`);
  }

  async getThreadReplies(threadId: string, limit = 25, reverse = false): Promise<ThreadsResponse> {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (reverse) params.set('reverse', 'true');
    return this.request(`/thread/${encodeURIComponent(threadId)}/replies?${params.toString()}`);
  }

  async getThreadConversation(threadId: string, limit = 25): Promise<ThreadsResponse> {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    return this.request(`/thread/${encodeURIComponent(threadId)}/conversation?${params.toString()}`);
  }

  // Insights
  async getThreadInsights(threadId: string): Promise<ThreadsInsights> {
    return this.request(`/thread/${encodeURIComponent(threadId)}/insights`);
  }

  async getAccountInsights(since: string, until: string): Promise<ThreadsAccountInsights> {
    const params = new URLSearchParams();
    params.set('since', since);
    params.set('until', until);
    return this.request(`/account/insights?${params.toString()}`);
  }

  // Publishing
  async createContainer(data: CreateThreadContainerRequest): Promise<ContainerResponse> {
    return this.request('/thread/container', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getContainerStatus(containerId: string): Promise<ContainerResponse> {
    return this.request(`/thread/container/${encodeURIComponent(containerId)}/status`);
  }

  async publish(containerId: string): Promise<PublishResponse> {
    return this.request('/thread/publish', {
      method: 'POST',
      body: JSON.stringify({ container_id: containerId }),
    });
  }

  async getReplyControl(): Promise<{ default_reply_config: string }> {
    return this.request('/reply_control');
  }
}

export const threadsApi = new ThreadsApiClient();

// React Query Hooks

export function useThreadsProfile() {
  return useQuery<ThreadsUser>({
    queryKey: ['threads-profile'],
    queryFn: () => threadsApi.getOwnProfile(),
  });
}

export function useThreads(since?: string, until?: string) {
  return useQuery<ThreadsResponse>({
    queryKey: ['threads-posts', since, until],
    queryFn: () => threadsApi.getThreads(25, since, until),
  });
}

export function useThread(threadId?: string) {
  return useQuery<ThreadsPost>({
    queryKey: ['threads-single', threadId],
    queryFn: () => threadsApi.getSingleThread(threadId!),
    enabled: !!threadId,
  });
}

export function useThreadReplies(threadId?: string, reverse = false) {
  return useQuery<ThreadsResponse>({
    queryKey: ['threads-replies', threadId, reverse],
    queryFn: () => threadsApi.getThreadReplies(threadId!, 25, reverse),
    enabled: !!threadId,
  });
}

export function useThreadConversation(threadId?: string) {
  return useQuery<ThreadsResponse>({
    queryKey: ['threads-conversation', threadId],
    queryFn: () => threadsApi.getThreadConversation(threadId!),
    enabled: !!threadId,
  });
}

export function useThreadInsights(threadId?: string) {
  return useQuery<ThreadsInsights>({
    queryKey: ['threads-insights', threadId],
    queryFn: () => threadsApi.getThreadInsights(threadId!),
    enabled: !!threadId,
  });
}

export function useThreadsAccountInsights(since?: string, until?: string) {
  return useQuery<ThreadsAccountInsights>({
    queryKey: ['threads-account-insights', since, until],
    queryFn: () => threadsApi.getAccountInsights(since!, until!),
    enabled: !!since && !!until,
  });
}

export function useThreadsContainerStatus(containerId?: string, pollInterval?: number) {
  return useQuery<ContainerResponse>({
    queryKey: ['threads-container-status', containerId],
    queryFn: () => threadsApi.getContainerStatus(containerId!),
    enabled: !!containerId,
    refetchInterval: pollInterval,
  });
}

export function useCreateThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateThreadContainerRequest) => {
      // Step 1: Create container
      const container = await threadsApi.createContainer(data);

      // Step 2: For text-only posts, publish immediately
      // For media posts, caller should poll status first
      if (data.media_type === 'TEXT') {
        return threadsApi.publish(container.container_id);
      }

      return container;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threads-posts'] });
    },
  });
}

export function usePublishThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (containerId: string) => threadsApi.publish(containerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threads-posts'] });
    },
  });
}

// Threads limitations
export const THREADS_LIMITATIONS = {
  maxTextLength: 500,
  maxMediaItems: 10, // For carousel
  maxImageSize: 8 * 1024 * 1024, // 8MB
  maxVideoSize: 100 * 1024 * 1024, // 100MB
  maxVideoDuration: 300, // 5 minutes
  supportedImageFormats: ['image/jpeg', 'image/png'],
  supportedVideoFormats: ['video/mp4', 'video/quicktime'],
  replyControls: ['everyone', 'accounts_you_follow', 'mentioned_only'],
  requiresBusinessAccount: false, // Personal accounts can use Threads API
  usesMetaAuth: true, // Same OAuth as Instagram
};
