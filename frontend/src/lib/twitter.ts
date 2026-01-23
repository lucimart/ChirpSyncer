import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CanonicalPost } from './connectors';

// Twitter API Types

export type TwitterConnectionMode = 'api' | 'scraper';

export interface TwitterCapabilities {
  read_profile: boolean;
  read_tweets: boolean;
  read_timeline: boolean;
  search: boolean;
  post_tweet: boolean;
  delete_tweet: boolean;
  like: boolean;
  retweet: boolean;
  reply: boolean;
}

export interface TwitterModeResponse {
  mode: TwitterConnectionMode;
  capabilities: TwitterCapabilities;
}

export interface TwitterUser {
  id: string;
  username: string;
  name: string;
  description?: string;
  profile_image_url?: string;
  verified?: boolean;
  created_at?: string;
  public_metrics?: {
    followers_count?: number;
    following_count?: number;
    tweet_count?: number;
    listed_count?: number;
  };
}

export interface TwitterTweet {
  id: string;
  text: string;
  created_at?: string;
  author_id?: string;
  public_metrics?: {
    like_count?: number;
    retweet_count?: number;
    reply_count?: number;
    quote_count?: number;
  };
  attachments?: {
    media_keys?: string[];
  };
  entities?: {
    hashtags?: Array<{ tag: string }>;
    mentions?: Array<{ username: string }>;
    urls?: Array<{ url: string; expanded_url: string }>;
  };
  conversation_id?: string;
  in_reply_to_user_id?: string;
}

export interface TwitterTweetsResponse {
  data: TwitterTweet[];
  next_token?: string;
  includes?: {
    users?: TwitterUser[];
  };
}

export interface CreateTweetRequest {
  text: string;
  reply_to?: string;
  quote_tweet_id?: string;
  media_ids?: string[];
}

export interface CreateTweetResponse {
  id: string;
  text: string;
  status: 'CREATED';
}

export interface DeleteTweetResponse {
  id: string;
  deleted: boolean;
}

export interface LikeResponse {
  tweet_id: string;
  liked: boolean;
}

export interface RetweetResponse {
  tweet_id: string;
  retweeted: boolean;
}

// Utility Functions

export function getProfileUrl(username: string): string {
  return `https://twitter.com/${username}`;
}

export function getTweetUrl(username: string, tweetId: string): string {
  return `https://twitter.com/${username}/status/${tweetId}`;
}

export function extractHashtags(text: string): string[] {
  const hashtagRegex = /#[a-zA-Z0-9_]+/g;
  return (text.match(hashtagRegex) || []).map((h) => h.slice(1));
}

export function extractMentions(text: string): string[] {
  const mentionRegex = /@[a-zA-Z0-9_]+/g;
  return (text.match(mentionRegex) || []).map((m) => m.slice(1));
}

export function twitterToCanonical(tweet: TwitterTweet, author?: TwitterUser): CanonicalPost {
  return {
    id: tweet.id,
    content: tweet.text,
    created_at: tweet.created_at || new Date().toISOString(),
    author: {
      id: author?.id || tweet.author_id || 'unknown',
      handle: author?.username || 'unknown',
      displayName: author?.name || author?.username || 'Unknown',
      avatar: author?.profile_image_url,
    },
    metrics: {
      likes: tweet.public_metrics?.like_count || 0,
      reposts: tweet.public_metrics?.retweet_count || 0,
      replies: tweet.public_metrics?.reply_count || 0,
      quotes: tweet.public_metrics?.quote_count || 0,
    },
  };
}

// API Client

class TwitterApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`/api/v1/twitter${endpoint}`, {
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

  // Connection Mode

  async getMode(): Promise<TwitterModeResponse> {
    return this.request('/mode');
  }

  // Read Operations (both modes)

  async getProfile(username: string): Promise<TwitterUser> {
    return this.request(`/profile/${encodeURIComponent(username)}`);
  }

  async getUserTweets(username: string, limit = 20, paginationToken?: string): Promise<TwitterTweetsResponse> {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (paginationToken) params.set('pagination_token', paginationToken);
    return this.request(`/profile/${encodeURIComponent(username)}/tweets?${params.toString()}`);
  }

  async getTweet(tweetId: string): Promise<TwitterTweet> {
    return this.request(`/tweet/${encodeURIComponent(tweetId)}`);
  }

  async search(query: string, limit = 20, nextToken?: string): Promise<TwitterTweetsResponse> {
    const params = new URLSearchParams();
    params.set('q', query);
    params.set('limit', String(limit));
    if (nextToken) params.set('next_token', nextToken);
    return this.request(`/search?${params.toString()}`);
  }

  // API Mode Only Operations

  async getHomeTimeline(limit = 20, paginationToken?: string): Promise<TwitterTweetsResponse> {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (paginationToken) params.set('pagination_token', paginationToken);
    return this.request(`/timeline/home?${params.toString()}`);
  }

  async createTweet(data: CreateTweetRequest): Promise<CreateTweetResponse> {
    return this.request('/tweet', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteTweet(tweetId: string): Promise<DeleteTweetResponse> {
    return this.request(`/tweet/${encodeURIComponent(tweetId)}`, {
      method: 'DELETE',
    });
  }

  async likeTweet(tweetId: string): Promise<LikeResponse> {
    return this.request(`/tweet/${encodeURIComponent(tweetId)}/like`, {
      method: 'POST',
    });
  }

  async unlikeTweet(tweetId: string): Promise<LikeResponse> {
    return this.request(`/tweet/${encodeURIComponent(tweetId)}/unlike`, {
      method: 'POST',
    });
  }

  async retweet(tweetId: string): Promise<RetweetResponse> {
    return this.request(`/tweet/${encodeURIComponent(tweetId)}/retweet`, {
      method: 'POST',
    });
  }

  async unretweet(tweetId: string): Promise<RetweetResponse> {
    return this.request(`/tweet/${encodeURIComponent(tweetId)}/unretweet`, {
      method: 'POST',
    });
  }
}

export const twitterApi = new TwitterApiClient();

// React Query Hooks

export function useTwitterMode() {
  return useQuery<TwitterModeResponse>({
    queryKey: ['twitter-mode'],
    queryFn: () => twitterApi.getMode(),
  });
}

export function useTwitterProfile(username?: string) {
  return useQuery<TwitterUser>({
    queryKey: ['twitter-profile', username],
    queryFn: () => twitterApi.getProfile(username!),
    enabled: !!username,
  });
}

export function useTwitterUserTweets(username?: string, paginationToken?: string) {
  return useQuery<TwitterTweetsResponse>({
    queryKey: ['twitter-user-tweets', username, paginationToken],
    queryFn: () => twitterApi.getUserTweets(username!, 20, paginationToken),
    enabled: !!username,
  });
}

export function useTwitterTweet(tweetId?: string) {
  return useQuery<TwitterTweet>({
    queryKey: ['twitter-tweet', tweetId],
    queryFn: () => twitterApi.getTweet(tweetId!),
    enabled: !!tweetId,
  });
}

export function useTwitterSearch(query?: string, nextToken?: string) {
  return useQuery<TwitterTweetsResponse>({
    queryKey: ['twitter-search', query, nextToken],
    queryFn: () => twitterApi.search(query!, 20, nextToken),
    enabled: !!query,
  });
}

export function useTwitterHomeTimeline(paginationToken?: string) {
  return useQuery<TwitterTweetsResponse>({
    queryKey: ['twitter-home-timeline', paginationToken],
    queryFn: () => twitterApi.getHomeTimeline(20, paginationToken),
  });
}

export function useCreateTweet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTweetRequest) => twitterApi.createTweet(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['twitter-home-timeline'] });
      queryClient.invalidateQueries({ queryKey: ['twitter-user-tweets'] });
    },
  });
}

export function useDeleteTweet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tweetId: string) => twitterApi.deleteTweet(tweetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['twitter-home-timeline'] });
      queryClient.invalidateQueries({ queryKey: ['twitter-user-tweets'] });
    },
  });
}

export function useLikeTweet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tweetId: string) => twitterApi.likeTweet(tweetId),
    onSuccess: (_, tweetId) => {
      queryClient.invalidateQueries({ queryKey: ['twitter-tweet', tweetId] });
    },
  });
}

export function useUnlikeTweet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tweetId: string) => twitterApi.unlikeTweet(tweetId),
    onSuccess: (_, tweetId) => {
      queryClient.invalidateQueries({ queryKey: ['twitter-tweet', tweetId] });
    },
  });
}

export function useRetweet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tweetId: string) => twitterApi.retweet(tweetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['twitter-home-timeline'] });
    },
  });
}

export function useUnretweet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tweetId: string) => twitterApi.unretweet(tweetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['twitter-home-timeline'] });
    },
  });
}

// Twitter API/Scraper limitations
export const TWITTER_LIMITATIONS = {
  maxTweetLength: 280,
  maxMediaItems: 4,
  maxHashtags: 30, // Soft limit
  supportedImageFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  supportedVideoFormats: ['video/mp4'],
  maxImageSize: 5 * 1024 * 1024, // 5MB
  maxVideoSize: 512 * 1024 * 1024, // 512MB
  maxVideoDuration: 140, // 2:20 for most users
  apiRequiresPayment: true, // Twitter API is now paid ($100+/month)
  scraperLimitations: {
    readOnly: true,
    noHomeTimeline: true,
    rateLimited: true,
  },
};
