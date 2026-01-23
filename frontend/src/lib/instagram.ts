import { useQuery } from '@tanstack/react-query';
import { CanonicalPost } from './connectors';

// Instagram Graph API Types (Read-only without Business account)

export interface InstagramUser {
  id: string;
  username: string;
  name?: string;
  biography?: string;
  profile_picture_url?: string;
  website?: string;
  followers_count: number;
  follows_count: number;
  media_count: number;
  account_type: 'BUSINESS' | 'MEDIA_CREATOR' | 'PERSONAL';
}

export interface InstagramMedia {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  permalink: string;
  thumbnail_url?: string;
  timestamp: string;
  username?: string;
  like_count?: number;
  comments_count?: number;
  children?: InstagramMediaChild[];
}

export interface InstagramMediaChild {
  id: string;
  media_type: 'IMAGE' | 'VIDEO';
  media_url: string;
}

export interface InstagramInsights {
  media_id: string;
  impressions: number;
  reach: number;
  engagement: number;
  saved: number;
  video_views?: number;
}

export interface InstagramComment {
  id: string;
  text: string;
  timestamp: string;
  username: string;
  like_count: number;
}

export interface InstagramStory {
  id: string;
  media_type: 'IMAGE' | 'VIDEO';
  media_url: string;
  timestamp: string;
}

export interface InstagramMediaResponse {
  data: InstagramMedia[];
  next_cursor?: string;
}

export interface InstagramStoriesResponse {
  data: InstagramStory[];
}

// Utility Functions

export function getProfileUrl(username: string): string {
  return `https://instagram.com/${username}`;
}

export function extractHashtags(caption: string): string[] {
  const hashtagRegex = /#[a-zA-Z0-9_]+/g;
  return (caption.match(hashtagRegex) || []).map((h) => h.slice(1));
}

export function instagramToCanonical(media: InstagramMedia, user: InstagramUser): CanonicalPost {
  const mediaItems = media.media_type === 'CAROUSEL_ALBUM' && media.children
    ? media.children.map((child) => ({
        type: child.media_type === 'VIDEO' ? 'video' as const : 'image' as const,
        url: child.media_url,
      }))
    : media.media_url
      ? [{ type: media.media_type === 'VIDEO' ? 'video' as const : 'image' as const, url: media.media_url }]
      : undefined;

  return {
    id: media.id,
    content: media.caption || '',
    created_at: media.timestamp,
    author: {
      id: user.id,
      handle: user.username,
      displayName: user.name || user.username,
      avatar: user.profile_picture_url,
    },
    media: mediaItems,
    metrics: { likes: media.like_count || 0, reposts: 0, replies: media.comments_count || 0, quotes: 0 },
  };
}

// API Client

class InstagramApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`/api/v1/instagram${endpoint}`, {
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

  async getOwnProfile(): Promise<InstagramUser> {
    return this.request('/profile');
  }

  async getProfileByUsername(username: string): Promise<InstagramUser> {
    return this.request(`/profile/${encodeURIComponent(username)}`);
  }

  async getMedia(limit = 25, cursor?: string): Promise<InstagramMediaResponse> {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (cursor) params.set('after', cursor);
    return this.request(`/media?${params.toString()}`);
  }

  async getSingleMedia(mediaId: string): Promise<InstagramMedia> {
    return this.request(`/media/${encodeURIComponent(mediaId)}`);
  }

  async getMediaInsights(mediaId: string, mediaType?: string): Promise<InstagramInsights> {
    const params = new URLSearchParams();
    if (mediaType) params.set('media_type', mediaType);
    const query = params.toString();
    return this.request(`/media/${encodeURIComponent(mediaId)}/insights${query ? `?${query}` : ''}`);
  }

  async getStories(): Promise<InstagramStoriesResponse> {
    return this.request('/stories');
  }

  async getAccountInsights(period = 'day'): Promise<{ period: string; insights: Record<string, number> }> {
    return this.request(`/account/insights?period=${period}`);
  }
}

export const instagramApi = new InstagramApiClient();

// Hooks

export function useInstagramOwnProfile() {
  return useQuery<InstagramUser>({
    queryKey: ['instagram-own-profile'],
    queryFn: () => instagramApi.getOwnProfile(),
  });
}

export function useInstagramProfile(username?: string) {
  return useQuery<InstagramUser>({
    queryKey: ['instagram-profile', username],
    queryFn: () => instagramApi.getProfileByUsername(username!),
    enabled: !!username,
  });
}

export function useInstagramMedia(userId?: string, cursor?: string) {
  return useQuery<InstagramMediaResponse>({
    queryKey: ['instagram-media', userId, cursor],
    queryFn: () => instagramApi.getMedia(25, cursor),
    enabled: !!userId,
  });
}

export function useInstagramSingleMedia(mediaId?: string) {
  return useQuery<InstagramMedia>({
    queryKey: ['instagram-single-media', mediaId],
    queryFn: () => instagramApi.getSingleMedia(mediaId!),
    enabled: !!mediaId,
  });
}

export function useInstagramInsights(mediaId?: string, mediaType?: string) {
  return useQuery<InstagramInsights>({
    queryKey: ['instagram-insights', mediaId, mediaType],
    queryFn: () => instagramApi.getMediaInsights(mediaId!, mediaType),
    enabled: !!mediaId,
  });
}

export function useInstagramStories(userId?: string) {
  return useQuery<InstagramStoriesResponse>({
    queryKey: ['instagram-stories', userId],
    queryFn: () => instagramApi.getStories(),
    enabled: !!userId,
  });
}

export function useInstagramAccountInsights(period = 'day') {
  return useQuery({
    queryKey: ['instagram-account-insights', period],
    queryFn: () => instagramApi.getAccountInsights(period),
  });
}

// Instagram limitations
export const INSTAGRAM_LIMITATIONS = {
  maxCaptionLength: 2200,
  maxHashtags: 30,
  maxCarouselItems: 10,
  supportedImageFormats: ['image/jpeg', 'image/png'],
  supportedVideoFormats: ['video/mp4'],
  maxImageSize: 8 * 1024 * 1024,
  maxVideoSize: 100 * 1024 * 1024,
  requiresBusinessAccount: true,
  publishSupported: false, // Without Content Publishing API approval
};
