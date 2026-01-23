/**
 * Tumblr Client
 * OAuth 1.0a authenticated Tumblr API v2
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
export interface TumblrUser {
  name: string;
  likes: number;
  following: number;
  blogs: TumblrBlog[];
}

export interface TumblrBlog {
  name: string;
  title: string;
  url: string;
  uuid: string;
  primary: boolean;
  followers?: number;
  posts?: number;
  avatar?: string;
  description?: string;
  is_nsfw?: boolean;
}

export interface TumblrPost {
  id: number;
  id_string: string;
  blog_name: string;
  type: 'text' | 'photo' | 'quote' | 'link' | 'chat' | 'audio' | 'video' | 'answer';
  timestamp: number;
  date: string;
  format: string;
  reblog_key: string;
  tags: string[];
  note_count: number;
  post_url: string;
  slug: string;
  state: string;
  // Type-specific
  title?: string;
  body?: string;
  caption?: string;
  text?: string;
  source?: string;
  source_url?: string;
  photos?: TumblrPhoto[];
  video_url?: string;
  audio_url?: string;
  link_url?: string;
  asking_name?: string;
  question?: string;
  answer?: string;
}

export interface TumblrPhoto {
  url: string;
  width: number;
  height: number;
  caption?: string;
}

export interface CreateTextPostData {
  type: 'text';
  title?: string;
  body: string;
  state?: 'published' | 'draft' | 'queue' | 'private';
  tags?: string;
}

export interface CreatePhotoPostData {
  type: 'photo';
  source: string;
  caption?: string;
  state?: 'published' | 'draft' | 'queue' | 'private';
  tags?: string;
}

export interface CreateQuotePostData {
  type: 'quote';
  quote: string;
  source?: string;
  state?: 'published' | 'draft' | 'queue' | 'private';
  tags?: string;
}

export interface CreateLinkPostData {
  type: 'link';
  url: string;
  title?: string;
  description?: string;
  state?: 'published' | 'draft' | 'queue' | 'private';
  tags?: string;
}

export interface CreateChatPostData {
  type: 'chat';
  conversation: string;
  title?: string;
  state?: 'published' | 'draft' | 'queue' | 'private';
  tags?: string;
}

export type CreatePostData =
  | CreateTextPostData
  | CreatePhotoPostData
  | CreateQuotePostData
  | CreateLinkPostData
  | CreateChatPostData;

export interface ReblogData {
  id: string | number;
  reblog_key: string;
  comment?: string;
  tags?: string;
}

export interface TumblrCredentials {
  consumer_key: string;
  consumer_secret: string;
  oauth_token: string;
  oauth_token_secret: string;
}

// API Client
class TumblrApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`/api/v1/tumblr${endpoint}`, {
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
  async getMe(): Promise<TumblrUser> {
    return this.request('/me');
  }

  async getDashboard(options?: {
    limit?: number;
    offset?: number;
    type?: string;
  }): Promise<{ posts: TumblrPost[]; count: number }> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    if (options?.type) params.set('type', options.type);
    return this.request(`/dashboard?${params.toString()}`);
  }

  async getFollowing(options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ blogs: TumblrBlog[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    return this.request(`/following?${params.toString()}`);
  }

  async follow(url: string): Promise<{ followed: boolean }> {
    return this.request('/follow', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  async unfollow(url: string): Promise<{ unfollowed: boolean }> {
    return this.request('/unfollow', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  // Blog
  async getBlog(blogIdentifier: string): Promise<TumblrBlog> {
    return this.request(`/blog/${encodeURIComponent(blogIdentifier)}`);
  }

  async getBlogPosts(
    blogIdentifier: string,
    options?: { limit?: number; offset?: number; type?: string; tag?: string }
  ): Promise<{ posts: TumblrPost[]; total_posts: number }> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    if (options?.type) params.set('type', options.type);
    if (options?.tag) params.set('tag', options.tag);
    return this.request(`/blog/${encodeURIComponent(blogIdentifier)}/posts?${params.toString()}`);
  }

  // Posts
  async createPost(
    blogIdentifier: string,
    data: CreatePostData
  ): Promise<{ id: number; id_string: string }> {
    return this.request(`/blog/${encodeURIComponent(blogIdentifier)}/post`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async editPost(
    blogIdentifier: string,
    postId: string,
    data: Partial<CreatePostData>
  ): Promise<{ id: number; id_string: string }> {
    return this.request(`/blog/${encodeURIComponent(blogIdentifier)}/post/${postId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePost(blogIdentifier: string, postId: string): Promise<{ deleted: boolean }> {
    return this.request(`/blog/${encodeURIComponent(blogIdentifier)}/post/${postId}`, {
      method: 'DELETE',
    });
  }

  async reblog(blogIdentifier: string, data: ReblogData): Promise<{ id: number; id_string: string }> {
    return this.request(`/blog/${encodeURIComponent(blogIdentifier)}/reblog`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Likes
  async getLikes(options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ posts: TumblrPost[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));
    return this.request(`/likes?${params.toString()}`);
  }

  async like(id: string | number, reblogKey: string): Promise<{ liked: boolean }> {
    return this.request('/like', {
      method: 'POST',
      body: JSON.stringify({ id, reblog_key: reblogKey }),
    });
  }

  async unlike(id: string | number, reblogKey: string): Promise<{ unliked: boolean }> {
    return this.request('/unlike', {
      method: 'POST',
      body: JSON.stringify({ id, reblog_key: reblogKey }),
    });
  }

  // Tagged (Explore)
  async getTaggedPosts(
    tag: string,
    options?: { limit?: number; before?: number }
  ): Promise<{ posts: TumblrPost[]; count: number }> {
    const params = new URLSearchParams();
    params.set('tag', tag);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.before) params.set('before', String(options.before));
    return this.request(`/tagged?${params.toString()}`);
  }

  // Notes
  async getPostNotes(
    blogIdentifier: string,
    postId: string,
    mode?: string
  ): Promise<{ notes: unknown[]; total_notes: number }> {
    const params = new URLSearchParams();
    if (mode) params.set('mode', mode);
    return this.request(
      `/blog/${encodeURIComponent(blogIdentifier)}/post/${postId}/notes?${params.toString()}`
    );
  }
}

export const tumblrClient = new TumblrApiClient();

// React Query Hooks

// User
export function useTumblrMe() {
  return useQuery({
    queryKey: ['tumblr', 'me'],
    queryFn: () => tumblrClient.getMe(),
  });
}

export function useTumblrDashboard(options?: { limit?: number; offset?: number; type?: string }) {
  return useQuery({
    queryKey: ['tumblr', 'dashboard', options],
    queryFn: () => tumblrClient.getDashboard(options),
  });
}

export function useTumblrFollowing(options?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['tumblr', 'following', options],
    queryFn: () => tumblrClient.getFollowing(options),
  });
}

export function useTumblrFollow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (url: string) => tumblrClient.follow(url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tumblr', 'following'] });
    },
  });
}

export function useTumblrUnfollow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (url: string) => tumblrClient.unfollow(url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tumblr', 'following'] });
    },
  });
}

// Blog
export function useTumblrBlog(blogIdentifier: string) {
  return useQuery({
    queryKey: ['tumblr', 'blog', blogIdentifier],
    queryFn: () => tumblrClient.getBlog(blogIdentifier),
    enabled: !!blogIdentifier,
  });
}

export function useTumblrBlogPosts(
  blogIdentifier: string,
  options?: { limit?: number; offset?: number; type?: string; tag?: string }
) {
  return useQuery({
    queryKey: ['tumblr', 'blog', blogIdentifier, 'posts', options],
    queryFn: () => tumblrClient.getBlogPosts(blogIdentifier, options),
    enabled: !!blogIdentifier,
  });
}

// Posts
export function useCreateTumblrPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ blogIdentifier, data }: { blogIdentifier: string; data: CreatePostData }) =>
      tumblrClient.createPost(blogIdentifier, data),
    onSuccess: (_, { blogIdentifier }) => {
      queryClient.invalidateQueries({ queryKey: ['tumblr', 'blog', blogIdentifier, 'posts'] });
      queryClient.invalidateQueries({ queryKey: ['tumblr', 'dashboard'] });
    },
  });
}

export function useEditTumblrPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      blogIdentifier,
      postId,
      data,
    }: {
      blogIdentifier: string;
      postId: string;
      data: Partial<CreatePostData>;
    }) => tumblrClient.editPost(blogIdentifier, postId, data),
    onSuccess: (_, { blogIdentifier }) => {
      queryClient.invalidateQueries({ queryKey: ['tumblr', 'blog', blogIdentifier, 'posts'] });
    },
  });
}

export function useDeleteTumblrPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ blogIdentifier, postId }: { blogIdentifier: string; postId: string }) =>
      tumblrClient.deletePost(blogIdentifier, postId),
    onSuccess: (_, { blogIdentifier }) => {
      queryClient.invalidateQueries({ queryKey: ['tumblr', 'blog', blogIdentifier, 'posts'] });
      queryClient.invalidateQueries({ queryKey: ['tumblr', 'dashboard'] });
    },
  });
}

export function useTumblrReblog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ blogIdentifier, data }: { blogIdentifier: string; data: ReblogData }) =>
      tumblrClient.reblog(blogIdentifier, data),
    onSuccess: (_, { blogIdentifier }) => {
      queryClient.invalidateQueries({ queryKey: ['tumblr', 'blog', blogIdentifier, 'posts'] });
      queryClient.invalidateQueries({ queryKey: ['tumblr', 'dashboard'] });
    },
  });
}

// Likes
export function useTumblrLikes(options?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['tumblr', 'likes', options],
    queryFn: () => tumblrClient.getLikes(options),
  });
}

export function useTumblrLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reblogKey }: { id: string | number; reblogKey: string }) =>
      tumblrClient.like(id, reblogKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tumblr', 'likes'] });
    },
  });
}

export function useTumblrUnlike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reblogKey }: { id: string | number; reblogKey: string }) =>
      tumblrClient.unlike(id, reblogKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tumblr', 'likes'] });
    },
  });
}

// Tagged
export function useTumblrTaggedPosts(tag: string, options?: { limit?: number; before?: number }) {
  return useQuery({
    queryKey: ['tumblr', 'tagged', tag, options],
    queryFn: () => tumblrClient.getTaggedPosts(tag, options),
    enabled: !!tag,
  });
}

// Notes
export function useTumblrPostNotes(blogIdentifier: string, postId: string, mode?: string) {
  return useQuery({
    queryKey: ['tumblr', 'blog', blogIdentifier, 'post', postId, 'notes', mode],
    queryFn: () => tumblrClient.getPostNotes(blogIdentifier, postId, mode),
    enabled: !!blogIdentifier && !!postId,
  });
}

// Utility: Get post embed URL
export function getTumblrEmbedUrl(blogName: string, postId: string | number): string {
  return `https://${blogName}.tumblr.com/post/${postId}`;
}

// Utility: Format note count
export function formatNoteCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M notes`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K notes`;
  }
  return `${count} ${count === 1 ? 'note' : 'notes'}`;
}

export default tumblrClient;
