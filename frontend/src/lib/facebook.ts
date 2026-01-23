import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CanonicalPost } from './connectors';

// Facebook API Types

export interface FacebookUser {
  id: string;
  name: string;
  email?: string;
  picture_url?: string;
}

export interface FacebookPage {
  id: string;
  name: string;
  category?: string;
  picture?: {
    data: {
      url: string;
    };
  };
  access_token?: string;
  fan_count?: number;
  about?: string;
  description?: string;
  cover?: {
    source: string;
  };
  followers_count?: number;
  link?: string;
  website?: string;
}

export interface FacebookPagesResponse {
  pages: FacebookPage[];
  paging?: {
    cursors?: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

export interface FacebookPost {
  id: string;
  message?: string;
  created_time: string;
  full_picture?: string;
  permalink_url?: string;
  shares?: {
    count: number;
  };
  reactions?: {
    summary: {
      total_count: number;
    };
  };
  comments?: {
    summary: {
      total_count: number;
    };
  };
  attachments?: {
    data: Array<{
      media?: {
        image?: {
          src: string;
        };
      };
      media_type?: string;
      url?: string;
      title?: string;
      description?: string;
    }>;
  };
}

export interface FacebookPostsResponse {
  posts: FacebookPost[];
  paging?: {
    cursors?: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

export interface FacebookComment {
  id: string;
  message: string;
  created_time: string;
  from?: {
    id: string;
    name: string;
    picture?: {
      data: {
        url: string;
      };
    };
  };
  reactions?: {
    summary: {
      total_count: number;
    };
  };
  comment_count?: number;
}

export interface FacebookCommentsResponse {
  comments: FacebookComment[];
  paging?: {
    cursors?: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

export interface FacebookReaction {
  id: string;
  name: string;
  type: 'LIKE' | 'LOVE' | 'WOW' | 'HAHA' | 'SAD' | 'ANGRY' | 'CARE';
  pic?: string;
}

export interface FacebookReactionsResponse {
  reactions: FacebookReaction[];
  paging?: {
    cursors?: {
      before: string;
      after: string;
    };
  };
  summary?: {
    total_count: number;
  };
}

export interface FacebookInsightValue {
  value: number | Record<string, number>;
  end_time?: string;
}

export interface FacebookInsight {
  id: string;
  name: string;
  period: string;
  values: FacebookInsightValue[];
  title: string;
  description: string;
}

export interface FacebookPageInsightsResponse {
  insights: FacebookInsight[];
  paging?: {
    previous?: string;
    next?: string;
  };
}

export interface FacebookPostInsightsResponse {
  post_id: string;
  insights: FacebookInsight[];
}

// Create post types
export interface CreateFacebookPostRequest {
  message?: string;
  link?: string;
  published?: boolean;
  scheduled_publish_time?: number;
}

export interface CreatePhotoPostRequest {
  url: string;
  caption?: string;
  published?: boolean;
}

export interface CreatePostResponse {
  id: string;
  status?: string;
  post_id?: string;
}

// Utility Functions

export function getPageUrl(pageId: string): string {
  return `https://facebook.com/${pageId}`;
}

export function getPostUrl(postId: string): string {
  return `https://facebook.com/${postId.replace('_', '/posts/')}`;
}

export function facebookToCanonical(post: FacebookPost, page?: FacebookPage): CanonicalPost {
  return {
    id: post.id,
    content: post.message || '',
    created_at: post.created_time,
    author: {
      id: page?.id || 'unknown',
      handle: page?.name || 'Facebook Page',
      displayName: page?.name || 'Facebook Page',
      avatar: page?.picture?.data?.url,
    },
    media: post.full_picture ? [{
      type: 'image' as const,
      url: post.full_picture,
    }] : undefined,
    metrics: {
      likes: post.reactions?.summary?.total_count || 0,
      reposts: post.shares?.count || 0,
      replies: post.comments?.summary?.total_count || 0,
      quotes: 0,
    },
  };
}

// API Client

class FacebookApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`/api/v1/facebook${endpoint}`, {
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

  // User
  async getMe(): Promise<FacebookUser> {
    return this.request('/me');
  }

  // Pages
  async getPages(): Promise<FacebookPagesResponse> {
    return this.request('/pages');
  }

  async getPage(pageId: string): Promise<FacebookPage> {
    return this.request(`/page/${encodeURIComponent(pageId)}`);
  }

  // Posts
  async getPagePosts(pageId: string, limit = 25, after?: string): Promise<FacebookPostsResponse> {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (after) params.set('after', after);
    return this.request(`/page/${encodeURIComponent(pageId)}/posts?${params.toString()}`);
  }

  async getPost(postId: string): Promise<FacebookPost> {
    return this.request(`/post/${encodeURIComponent(postId)}`);
  }

  async createPost(pageId: string, data: CreateFacebookPostRequest): Promise<CreatePostResponse> {
    return this.request(`/page/${encodeURIComponent(pageId)}/post`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deletePost(postId: string): Promise<{ deleted: boolean; id: string }> {
    return this.request(`/post/${encodeURIComponent(postId)}`, {
      method: 'DELETE',
    });
  }

  async createPhotoPost(pageId: string, data: CreatePhotoPostRequest): Promise<CreatePostResponse> {
    return this.request(`/page/${encodeURIComponent(pageId)}/photo`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Comments
  async getComments(postId: string, limit = 25, after?: string): Promise<FacebookCommentsResponse> {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (after) params.set('after', after);
    return this.request(`/post/${encodeURIComponent(postId)}/comments?${params.toString()}`);
  }

  async createComment(postId: string, message: string): Promise<{ id: string }> {
    return this.request(`/post/${encodeURIComponent(postId)}/comment`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  // Reactions
  async getReactions(postId: string, limit = 25, type?: string): Promise<FacebookReactionsResponse> {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (type) params.set('type', type);
    return this.request(`/post/${encodeURIComponent(postId)}/reactions?${params.toString()}`);
  }

  // Insights
  async getPageInsights(
    pageId: string,
    period = 'day',
    since?: string,
    until?: string
  ): Promise<FacebookPageInsightsResponse> {
    const params = new URLSearchParams();
    params.set('period', period);
    if (since) params.set('since', since);
    if (until) params.set('until', until);
    return this.request(`/page/${encodeURIComponent(pageId)}/insights?${params.toString()}`);
  }

  async getPostInsights(postId: string): Promise<FacebookPostInsightsResponse> {
    return this.request(`/post/${encodeURIComponent(postId)}/insights`);
  }
}

export const facebookApi = new FacebookApiClient();

// React Query Hooks

export function useFacebookMe() {
  return useQuery<FacebookUser>({
    queryKey: ['facebook-me'],
    queryFn: () => facebookApi.getMe(),
  });
}

export function useFacebookPages() {
  return useQuery<FacebookPagesResponse>({
    queryKey: ['facebook-pages'],
    queryFn: () => facebookApi.getPages(),
  });
}

export function useFacebookPage(pageId?: string) {
  return useQuery<FacebookPage>({
    queryKey: ['facebook-page', pageId],
    queryFn: () => facebookApi.getPage(pageId!),
    enabled: !!pageId,
  });
}

export function useFacebookPagePosts(pageId?: string, limit = 25) {
  return useQuery<FacebookPostsResponse>({
    queryKey: ['facebook-page-posts', pageId, limit],
    queryFn: () => facebookApi.getPagePosts(pageId!, limit),
    enabled: !!pageId,
  });
}

export function useFacebookPost(postId?: string) {
  return useQuery<FacebookPost>({
    queryKey: ['facebook-post', postId],
    queryFn: () => facebookApi.getPost(postId!),
    enabled: !!postId,
  });
}

export function useFacebookComments(postId?: string, limit = 25) {
  return useQuery<FacebookCommentsResponse>({
    queryKey: ['facebook-comments', postId, limit],
    queryFn: () => facebookApi.getComments(postId!, limit),
    enabled: !!postId,
  });
}

export function useFacebookReactions(postId?: string) {
  return useQuery<FacebookReactionsResponse>({
    queryKey: ['facebook-reactions', postId],
    queryFn: () => facebookApi.getReactions(postId!),
    enabled: !!postId,
  });
}

export function useFacebookPageInsights(pageId?: string, period = 'day') {
  return useQuery<FacebookPageInsightsResponse>({
    queryKey: ['facebook-page-insights', pageId, period],
    queryFn: () => facebookApi.getPageInsights(pageId!, period),
    enabled: !!pageId,
  });
}

export function useFacebookPostInsights(postId?: string) {
  return useQuery<FacebookPostInsightsResponse>({
    queryKey: ['facebook-post-insights', postId],
    queryFn: () => facebookApi.getPostInsights(postId!),
    enabled: !!postId,
  });
}

export function useCreateFacebookPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pageId, data }: { pageId: string; data: CreateFacebookPostRequest }) =>
      facebookApi.createPost(pageId, data),
    onSuccess: (_, { pageId }) => {
      queryClient.invalidateQueries({ queryKey: ['facebook-page-posts', pageId] });
    },
  });
}

export function useDeleteFacebookPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => facebookApi.deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facebook-page-posts'] });
    },
  });
}

export function useCreateFacebookPhotoPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pageId, data }: { pageId: string; data: CreatePhotoPostRequest }) =>
      facebookApi.createPhotoPost(pageId, data),
    onSuccess: (_, { pageId }) => {
      queryClient.invalidateQueries({ queryKey: ['facebook-page-posts', pageId] });
    },
  });
}

export function useCreateFacebookComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, message }: { postId: string; message: string }) =>
      facebookApi.createComment(postId, message),
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['facebook-comments', postId] });
    },
  });
}

// Facebook limitations
export const FACEBOOK_LIMITATIONS = {
  maxTextLength: 63206,
  maxMediaItems: 10, // For carousel
  maxImageSize: 10 * 1024 * 1024, // 10MB
  maxVideoSize: 10 * 1024 * 1024 * 1024, // 10GB
  maxVideoDuration: 240 * 60, // 4 hours
  supportedImageFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff'],
  supportedVideoFormats: ['video/mp4', 'video/mov', 'video/avi', 'video/wmv'],
  reactionTypes: ['LIKE', 'LOVE', 'WOW', 'HAHA', 'SAD', 'ANGRY', 'CARE'],
  schedulingMinMinutes: 10, // Must be at least 10 minutes in future
  schedulingMaxDays: 75, // Must be within 75 days
};
