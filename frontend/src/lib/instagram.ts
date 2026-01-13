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
  username: string;
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

// Hooks (Read-only)

export function useInstagramProfile(username?: string) {
  return useQuery<InstagramUser>({
    queryKey: ['instagram-profile', username],
    queryFn: async () => ({
      id: 'ig-user-123',
      username: username || 'user',
      name: 'Instagram User',
      biography: 'Sharing moments',
      followers_count: 5000,
      follows_count: 500,
      media_count: 150,
      account_type: 'PERSONAL',
    }),
    enabled: !!username,
  });
}

export function useInstagramMedia(userId?: string) {
  return useQuery<InstagramMedia[]>({
    queryKey: ['instagram-media', userId],
    queryFn: async () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: `media-${i}`,
        caption: `Photo ${i + 1} #photography`,
        media_type: i % 5 === 0 ? 'VIDEO' as const : 'IMAGE' as const,
        media_url: `https://picsum.photos/600/600?random=${i}`,
        permalink: `https://instagram.com/p/abc${i}`,
        timestamp: new Date(Date.now() - i * 86400000).toISOString(),
        username: 'user',
        like_count: Math.floor(Math.random() * 500),
        comments_count: Math.floor(Math.random() * 50),
      })),
    enabled: !!userId,
  });
}

export function useInstagramInsights(mediaId?: string) {
  return useQuery<InstagramInsights>({
    queryKey: ['instagram-insights', mediaId],
    queryFn: async () => ({
      media_id: mediaId!,
      impressions: Math.floor(Math.random() * 10000),
      reach: Math.floor(Math.random() * 8000),
      engagement: Math.floor(Math.random() * 1000),
      saved: Math.floor(Math.random() * 100),
    }),
    enabled: !!mediaId,
  });
}

export function useInstagramStories(userId?: string) {
  return useQuery<InstagramStory[]>({
    queryKey: ['instagram-stories', userId],
    queryFn: async () =>
      Array.from({ length: 3 }, (_, i) => ({
        id: `story-${i}`,
        media_type: i % 2 === 0 ? 'IMAGE' as const : 'VIDEO' as const,
        media_url: `https://picsum.photos/400/700?random=${i}`,
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      })),
    enabled: !!userId,
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
  publishSupported: false, // Without Business account
};
