/**
 * TikTok Client
 * OAuth 2.0 authenticated TikTok API for Developers
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
export interface TikTokUser {
  open_id: string;
  union_id?: string;
  display_name: string;
  avatar_url?: string;
  avatar_large_url?: string;
  bio?: string;
  profile_url?: string;
  is_verified?: boolean;
  follower_count?: number;
  following_count?: number;
  likes_count?: number;
  video_count?: number;
}

export interface TikTokVideo {
  id: string;
  title?: string;
  description?: string;
  duration?: number;
  cover_image_url?: string;
  embed_link?: string;
  share_url?: string;
  width?: number;
  height?: number;
  create_time?: number;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
}

export interface TikTokComment {
  id: string;
  text: string;
  create_time?: number;
  like_count?: number;
  reply_count?: number;
  parent_comment_id?: string;
}

export interface TikTokCreatorInfo {
  creator_avatar_url?: string;
  creator_username?: string;
  creator_nickname?: string;
  privacy_level_options: string[];
  comment_disabled?: boolean;
  duet_disabled?: boolean;
  stitch_disabled?: boolean;
  max_video_post_duration_sec?: number;
}

export interface InitVideoUploadData {
  title?: string;
  privacy_level?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY';
  disable_duet?: boolean;
  disable_comment?: boolean;
  disable_stitch?: boolean;
  video_url?: string;
  video_size?: number;
  chunk_size?: number;
  total_chunk_count?: number;
}

export interface TikTokHashtag {
  id: string;
  name: string;
  video_count?: number;
}

export interface TikTokEmbed {
  title?: string;
  author_name?: string;
  author_url?: string;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
  html?: string;
}

export interface TikTokCredentials {
  client_key: string;
  client_secret: string;
  access_token: string;
  refresh_token: string;
  expires_at?: number;
}

// API Client
class TikTokApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`/api/v1/tiktok${endpoint}`, {
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
  async getMe(): Promise<TikTokUser> {
    return this.request('/me');
  }

  // Videos
  async getMyVideos(options?: {
    max_count?: number;
    cursor?: string;
  }): Promise<{ videos: TikTokVideo[]; cursor?: string; has_more: boolean }> {
    const params = new URLSearchParams();
    if (options?.max_count) params.set('max_count', String(options.max_count));
    if (options?.cursor) params.set('cursor', options.cursor);
    return this.request(`/videos?${params.toString()}`);
  }

  async getVideo(videoId: string): Promise<TikTokVideo> {
    return this.request(`/video/${encodeURIComponent(videoId)}`);
  }

  // Video Publishing
  async initVideoUpload(
    data: InitVideoUploadData
  ): Promise<{ publish_id: string; upload_url?: string }> {
    return this.request('/video/init', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getVideoStatus(
    publishId: string
  ): Promise<{ status: string; fail_reason?: string; published_video_id?: string }> {
    return this.request(`/video/status?publish_id=${encodeURIComponent(publishId)}`);
  }

  // Creator Info
  async getCreatorInfo(): Promise<TikTokCreatorInfo> {
    return this.request('/creator/info');
  }

  // Comments
  async getVideoComments(
    videoId: string,
    options?: { max_count?: number; cursor?: string }
  ): Promise<{ comments: TikTokComment[]; cursor?: string; has_more: boolean }> {
    const params = new URLSearchParams();
    if (options?.max_count) params.set('max_count', String(options.max_count));
    if (options?.cursor) params.set('cursor', options.cursor);
    return this.request(`/video/${encodeURIComponent(videoId)}/comments?${params.toString()}`);
  }

  async postComment(
    videoId: string,
    text: string,
    parentCommentId?: string
  ): Promise<{ id: string; text: string }> {
    return this.request(`/video/${encodeURIComponent(videoId)}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text, parent_comment_id: parentCommentId }),
    });
  }

  // Research (requires research API access)
  async queryVideos(options: {
    query?: Record<string, unknown>;
    max_count?: number;
    cursor?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<{ videos: TikTokVideo[]; cursor?: string; has_more: boolean }> {
    return this.request('/research/videos', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  async queryUsers(usernames: string[]): Promise<{ users: TikTokUser[] }> {
    return this.request('/research/users', {
      method: 'POST',
      body: JSON.stringify({ usernames }),
    });
  }

  // Hashtags
  async searchHashtags(keyword: string): Promise<{ hashtags: TikTokHashtag[] }> {
    return this.request(`/hashtag/search?keyword=${encodeURIComponent(keyword)}`);
  }

  // Embed (no auth required)
  async getEmbed(url: string): Promise<TikTokEmbed> {
    return this.request(`/embed?url=${encodeURIComponent(url)}`);
  }
}

export const tiktokClient = new TikTokApiClient();

// React Query Hooks

// User
export function useTikTokMe() {
  return useQuery({
    queryKey: ['tiktok', 'me'],
    queryFn: () => tiktokClient.getMe(),
  });
}

// Videos
export function useTikTokVideos(options?: { max_count?: number; cursor?: string }) {
  return useQuery({
    queryKey: ['tiktok', 'videos', options],
    queryFn: () => tiktokClient.getMyVideos(options),
  });
}

export function useTikTokVideo(videoId: string) {
  return useQuery({
    queryKey: ['tiktok', 'video', videoId],
    queryFn: () => tiktokClient.getVideo(videoId),
    enabled: !!videoId,
  });
}

// Video Publishing
export function useInitTikTokVideoUpload() {
  return useMutation({
    mutationFn: (data: InitVideoUploadData) => tiktokClient.initVideoUpload(data),
  });
}

export function useTikTokVideoStatus(publishId: string) {
  return useQuery({
    queryKey: ['tiktok', 'video', 'status', publishId],
    queryFn: () => tiktokClient.getVideoStatus(publishId),
    enabled: !!publishId,
    refetchInterval: (query) => {
      // Poll while processing
      const data = query.state.data;
      if (data?.status === 'PROCESSING_UPLOAD' || data?.status === 'PROCESSING_DOWNLOAD') {
        return 5000; // 5 seconds
      }
      return false;
    },
  });
}

// Creator Info
export function useTikTokCreatorInfo() {
  return useQuery({
    queryKey: ['tiktok', 'creator', 'info'],
    queryFn: () => tiktokClient.getCreatorInfo(),
  });
}

// Comments
export function useTikTokVideoComments(
  videoId: string,
  options?: { max_count?: number; cursor?: string }
) {
  return useQuery({
    queryKey: ['tiktok', 'video', videoId, 'comments', options],
    queryFn: () => tiktokClient.getVideoComments(videoId, options),
    enabled: !!videoId,
  });
}

export function usePostTikTokComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      videoId,
      text,
      parentCommentId,
    }: {
      videoId: string;
      text: string;
      parentCommentId?: string;
    }) => tiktokClient.postComment(videoId, text, parentCommentId),
    onSuccess: (_, { videoId }) => {
      queryClient.invalidateQueries({ queryKey: ['tiktok', 'video', videoId, 'comments'] });
    },
  });
}

// Research
export function useTikTokQueryVideos(options: {
  query?: Record<string, unknown>;
  max_count?: number;
  cursor?: string;
  start_date?: string;
  end_date?: string;
}) {
  return useQuery({
    queryKey: ['tiktok', 'research', 'videos', options],
    queryFn: () => tiktokClient.queryVideos(options),
    enabled: !!(options.start_date && options.end_date),
  });
}

export function useTikTokQueryUsers(usernames: string[]) {
  return useQuery({
    queryKey: ['tiktok', 'research', 'users', usernames],
    queryFn: () => tiktokClient.queryUsers(usernames),
    enabled: usernames.length > 0,
  });
}

// Hashtags
export function useTikTokHashtagSearch(keyword: string) {
  return useQuery({
    queryKey: ['tiktok', 'hashtag', 'search', keyword],
    queryFn: () => tiktokClient.searchHashtags(keyword),
    enabled: !!keyword,
  });
}

// Embed
export function useTikTokEmbed(url: string) {
  return useQuery({
    queryKey: ['tiktok', 'embed', url],
    queryFn: () => tiktokClient.getEmbed(url),
    enabled: !!url,
  });
}

// Utility: Format count
export function formatTikTokCount(count: number | undefined): string {
  if (!count) return '0';
  if (count >= 1000000000) {
    return `${(count / 1000000000).toFixed(1)}B`;
  }
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return String(count);
}

// Utility: Format duration
export function formatTikTokDuration(seconds: number | undefined): string {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Utility: Get video share URL
export function getTikTokShareUrl(username: string, videoId: string): string {
  return `https://www.tiktok.com/@${username}/video/${videoId}`;
}

// Utility: Get profile URL
export function getTikTokProfileUrl(username: string): string {
  return `https://www.tiktok.com/@${username}`;
}

// Utility: Parse TikTok URL to extract video ID
export function parseTikTokUrl(url: string): { username?: string; videoId?: string } | null {
  const match = url.match(/tiktok\.com\/@([^/]+)\/video\/(\d+)/);
  if (match) {
    return { username: match[1], videoId: match[2] };
  }
  return null;
}

export default tiktokClient;
