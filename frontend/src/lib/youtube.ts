/**
 * YouTube Client
 * OAuth 2.0 authenticated YouTube Data API v3
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
export interface YouTubeChannel {
  id: string;
  title: string;
  description?: string;
  custom_url?: string;
  thumbnail?: string;
  subscriber_count: number;
  video_count: number;
  view_count: number;
  uploads_playlist?: string;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description?: string;
  channel_id?: string;
  channel_title?: string;
  thumbnail?: string;
  published_at?: string;
  tags?: string[];
  category_id?: string;
  duration?: string;
  definition?: string;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  privacy_status?: 'public' | 'private' | 'unlisted';
  upload_status?: string;
}

export interface YouTubePlaylist {
  id: string;
  title: string;
  description?: string;
  channel_id?: string;
  thumbnail?: string;
  published_at?: string;
  item_count: number;
  privacy_status?: 'public' | 'private' | 'unlisted';
}

export interface YouTubePlaylistItem {
  id: string;
  video_id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  position: number;
  channel_title?: string;
}

export interface YouTubeComment {
  id: string;
  thread_id: string;
  text: string;
  author: string;
  author_channel_id?: string;
  author_profile_image?: string;
  like_count: number;
  published_at: string;
  reply_count: number;
}

export interface YouTubeSearchResult {
  kind: string;
  video_id?: string;
  channel_id?: string;
  playlist_id?: string;
  title: string;
  description?: string;
  thumbnail?: string;
  channel_title?: string;
  published_at?: string;
}

export interface YouTubeSubscription {
  id: string;
  channel_id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  published_at?: string;
}

export interface CreatePlaylistData {
  title: string;
  description?: string;
  privacy_status?: 'public' | 'private' | 'unlisted';
}

export interface UpdateVideoData {
  title?: string;
  description?: string;
  tags?: string[];
  category_id?: string;
  privacy_status?: 'public' | 'private' | 'unlisted';
}

export interface YouTubeCredentials {
  client_id: string;
  client_secret: string;
  access_token: string;
  refresh_token: string;
  expires_at?: number;
}

// API Client
class YouTubeApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`/api/v1/youtube${endpoint}`, {
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

  // Channel
  async getMe(): Promise<YouTubeChannel> {
    return this.request('/me');
  }

  async getChannel(channelId: string): Promise<YouTubeChannel> {
    return this.request(`/channel/${encodeURIComponent(channelId)}`);
  }

  // Videos
  async getMyVideos(options?: {
    max_results?: number;
    page_token?: string;
  }): Promise<{ videos: YouTubeVideo[]; next_page_token?: string }> {
    const params = new URLSearchParams();
    if (options?.max_results) params.set('max_results', String(options.max_results));
    if (options?.page_token) params.set('page_token', options.page_token);
    return this.request(`/videos?${params.toString()}`);
  }

  async getVideo(videoId: string): Promise<YouTubeVideo> {
    return this.request(`/video/${encodeURIComponent(videoId)}`);
  }

  async updateVideo(videoId: string, data: UpdateVideoData): Promise<YouTubeVideo> {
    return this.request(`/video/${encodeURIComponent(videoId)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteVideo(videoId: string): Promise<{ deleted: boolean }> {
    return this.request(`/video/${encodeURIComponent(videoId)}`, {
      method: 'DELETE',
    });
  }

  // Playlists
  async getPlaylists(options?: {
    max_results?: number;
    page_token?: string;
  }): Promise<{ playlists: YouTubePlaylist[]; next_page_token?: string }> {
    const params = new URLSearchParams();
    if (options?.max_results) params.set('max_results', String(options.max_results));
    if (options?.page_token) params.set('page_token', options.page_token);
    return this.request(`/playlists?${params.toString()}`);
  }

  async createPlaylist(data: CreatePlaylistData): Promise<YouTubePlaylist> {
    return this.request('/playlists', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deletePlaylist(playlistId: string): Promise<{ deleted: boolean }> {
    return this.request(`/playlist/${encodeURIComponent(playlistId)}`, {
      method: 'DELETE',
    });
  }

  async getPlaylistItems(
    playlistId: string,
    options?: { max_results?: number; page_token?: string }
  ): Promise<{ items: YouTubePlaylistItem[]; next_page_token?: string }> {
    const params = new URLSearchParams();
    if (options?.max_results) params.set('max_results', String(options.max_results));
    if (options?.page_token) params.set('page_token', options.page_token);
    return this.request(`/playlist/${encodeURIComponent(playlistId)}/items?${params.toString()}`);
  }

  async addToPlaylist(
    playlistId: string,
    videoId: string,
    position?: number
  ): Promise<{ id: string; video_id: string; playlist_id: string }> {
    return this.request(`/playlist/${encodeURIComponent(playlistId)}/items`, {
      method: 'POST',
      body: JSON.stringify({ video_id: videoId, position }),
    });
  }

  async removeFromPlaylist(playlistId: string, itemId: string): Promise<{ deleted: boolean }> {
    return this.request(`/playlist/${encodeURIComponent(playlistId)}/items/${encodeURIComponent(itemId)}`, {
      method: 'DELETE',
    });
  }

  // Comments
  async getVideoComments(
    videoId: string,
    options?: { max_results?: number; page_token?: string; order?: string }
  ): Promise<{ comments: YouTubeComment[]; next_page_token?: string }> {
    const params = new URLSearchParams();
    if (options?.max_results) params.set('max_results', String(options.max_results));
    if (options?.page_token) params.set('page_token', options.page_token);
    if (options?.order) params.set('order', options.order);
    return this.request(`/video/${encodeURIComponent(videoId)}/comments?${params.toString()}`);
  }

  async postComment(
    videoId: string,
    text: string
  ): Promise<{ id: string; thread_id: string; text: string }> {
    return this.request(`/video/${encodeURIComponent(videoId)}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  }

  // Search
  async search(
    query: string,
    options?: {
      type?: string;
      max_results?: number;
      page_token?: string;
      order?: string;
      channel_id?: string;
    }
  ): Promise<{ items: YouTubeSearchResult[]; next_page_token?: string; total_results?: number }> {
    const params = new URLSearchParams();
    params.set('q', query);
    if (options?.type) params.set('type', options.type);
    if (options?.max_results) params.set('max_results', String(options.max_results));
    if (options?.page_token) params.set('page_token', options.page_token);
    if (options?.order) params.set('order', options.order);
    if (options?.channel_id) params.set('channel_id', options.channel_id);
    return this.request(`/search?${params.toString()}`);
  }

  // Subscriptions
  async getSubscriptions(options?: {
    max_results?: number;
    page_token?: string;
  }): Promise<{ subscriptions: YouTubeSubscription[]; next_page_token?: string }> {
    const params = new URLSearchParams();
    if (options?.max_results) params.set('max_results', String(options.max_results));
    if (options?.page_token) params.set('page_token', options.page_token);
    return this.request(`/subscriptions?${params.toString()}`);
  }

  async subscribe(channelId: string): Promise<{ id: string; channel_id: string; subscribed: boolean }> {
    return this.request('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ channel_id: channelId }),
    });
  }

  async unsubscribe(subscriptionId: string): Promise<{ unsubscribed: boolean }> {
    return this.request(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      method: 'DELETE',
    });
  }
}

export const youtubeClient = new YouTubeApiClient();

// React Query Hooks

// Channel
export function useYouTubeMe() {
  return useQuery({
    queryKey: ['youtube', 'me'],
    queryFn: () => youtubeClient.getMe(),
  });
}

export function useYouTubeChannel(channelId: string) {
  return useQuery({
    queryKey: ['youtube', 'channel', channelId],
    queryFn: () => youtubeClient.getChannel(channelId),
    enabled: !!channelId,
  });
}

// Videos
export function useYouTubeVideos(options?: { max_results?: number; page_token?: string }) {
  return useQuery({
    queryKey: ['youtube', 'videos', options],
    queryFn: () => youtubeClient.getMyVideos(options),
  });
}

export function useYouTubeVideo(videoId: string) {
  return useQuery({
    queryKey: ['youtube', 'video', videoId],
    queryFn: () => youtubeClient.getVideo(videoId),
    enabled: !!videoId,
  });
}

export function useUpdateYouTubeVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ videoId, data }: { videoId: string; data: UpdateVideoData }) =>
      youtubeClient.updateVideo(videoId, data),
    onSuccess: (_, { videoId }) => {
      queryClient.invalidateQueries({ queryKey: ['youtube', 'video', videoId] });
      queryClient.invalidateQueries({ queryKey: ['youtube', 'videos'] });
    },
  });
}

export function useDeleteYouTubeVideo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (videoId: string) => youtubeClient.deleteVideo(videoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['youtube', 'videos'] });
    },
  });
}

// Playlists
export function useYouTubePlaylists(options?: { max_results?: number; page_token?: string }) {
  return useQuery({
    queryKey: ['youtube', 'playlists', options],
    queryFn: () => youtubeClient.getPlaylists(options),
  });
}

export function useCreateYouTubePlaylist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePlaylistData) => youtubeClient.createPlaylist(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['youtube', 'playlists'] });
    },
  });
}

export function useDeleteYouTubePlaylist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (playlistId: string) => youtubeClient.deletePlaylist(playlistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['youtube', 'playlists'] });
    },
  });
}

export function useYouTubePlaylistItems(
  playlistId: string,
  options?: { max_results?: number; page_token?: string }
) {
  return useQuery({
    queryKey: ['youtube', 'playlist', playlistId, 'items', options],
    queryFn: () => youtubeClient.getPlaylistItems(playlistId, options),
    enabled: !!playlistId,
  });
}

export function useAddToYouTubePlaylist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      playlistId,
      videoId,
      position,
    }: {
      playlistId: string;
      videoId: string;
      position?: number;
    }) => youtubeClient.addToPlaylist(playlistId, videoId, position),
    onSuccess: (_, { playlistId }) => {
      queryClient.invalidateQueries({ queryKey: ['youtube', 'playlist', playlistId, 'items'] });
    },
  });
}

export function useRemoveFromYouTubePlaylist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ playlistId, itemId }: { playlistId: string; itemId: string }) =>
      youtubeClient.removeFromPlaylist(playlistId, itemId),
    onSuccess: (_, { playlistId }) => {
      queryClient.invalidateQueries({ queryKey: ['youtube', 'playlist', playlistId, 'items'] });
    },
  });
}

// Comments
export function useYouTubeVideoComments(
  videoId: string,
  options?: { max_results?: number; page_token?: string; order?: string }
) {
  return useQuery({
    queryKey: ['youtube', 'video', videoId, 'comments', options],
    queryFn: () => youtubeClient.getVideoComments(videoId, options),
    enabled: !!videoId,
  });
}

export function usePostYouTubeComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ videoId, text }: { videoId: string; text: string }) =>
      youtubeClient.postComment(videoId, text),
    onSuccess: (_, { videoId }) => {
      queryClient.invalidateQueries({ queryKey: ['youtube', 'video', videoId, 'comments'] });
    },
  });
}

// Search
export function useYouTubeSearch(
  query: string,
  options?: {
    type?: string;
    max_results?: number;
    page_token?: string;
    order?: string;
    channel_id?: string;
  }
) {
  return useQuery({
    queryKey: ['youtube', 'search', query, options],
    queryFn: () => youtubeClient.search(query, options),
    enabled: !!query,
  });
}

// Subscriptions
export function useYouTubeSubscriptions(options?: { max_results?: number; page_token?: string }) {
  return useQuery({
    queryKey: ['youtube', 'subscriptions', options],
    queryFn: () => youtubeClient.getSubscriptions(options),
  });
}

export function useYouTubeSubscribe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (channelId: string) => youtubeClient.subscribe(channelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['youtube', 'subscriptions'] });
    },
  });
}

export function useYouTubeUnsubscribe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subscriptionId: string) => youtubeClient.unsubscribe(subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['youtube', 'subscriptions'] });
    },
  });
}

// Utility: Parse ISO 8601 duration
export function parseDuration(isoDuration: string | undefined): number {
  if (!isoDuration) return 0;
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const [, hours, minutes, seconds] = match;
  return (
    (parseInt(hours || '0', 10) * 3600) +
    (parseInt(minutes || '0', 10) * 60) +
    parseInt(seconds || '0', 10)
  );
}

// Utility: Format duration
export function formatDuration(isoDuration: string | undefined): string {
  const totalSeconds = parseDuration(isoDuration);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Utility: Format view count
export function formatViewCount(count: number | undefined): string {
  if (!count) return '0 views';
  if (count >= 1000000000) {
    return `${(count / 1000000000).toFixed(1)}B views`;
  }
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M views`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K views`;
  }
  return `${count} ${count === 1 ? 'view' : 'views'}`;
}

// Utility: Get video URL
export function getVideoUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

// Utility: Get channel URL
export function getChannelUrl(channelId: string): string {
  return `https://www.youtube.com/channel/${channelId}`;
}

export default youtubeClient;
