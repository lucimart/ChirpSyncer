/**
 * Reddit Client
 * OAuth 2.0 authenticated Reddit API
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
export interface RedditUser {
  id: string;
  name: string;
  icon_img?: string;
  total_karma: number;
  link_karma: number;
  comment_karma: number;
  created_utc: number;
  is_gold: boolean;
  is_mod: boolean;
}

export interface RedditSubreddit {
  id: string;
  name: string;
  title: string;
  description: string;
  subscribers: number;
  active_users?: number;
  icon_img?: string;
  banner_img?: string;
  nsfw: boolean;
  submission_type?: string;
  allow_images?: boolean;
  allow_videos?: boolean;
}

export interface RedditPost {
  id: string;
  name: string; // fullname (t3_xxx)
  title: string;
  selftext: string;
  author: string;
  subreddit: string;
  score: number;
  upvote_ratio: number;
  num_comments: number;
  created_utc: number;
  url: string;
  permalink: string;
  is_self: boolean;
  nsfw: boolean;
  thumbnail?: string;
}

export interface RedditComment {
  id: string;
  name: string;
  body: string;
  author: string;
  score: number;
  created_utc: number;
  parent_id: string;
  depth: number;
}

export interface CreatePostData {
  subreddit: string;
  title: string;
  kind: 'self' | 'link';
  text?: string;
  url?: string;
  nsfw?: boolean;
  spoiler?: boolean;
  flair_id?: string;
}

export interface RedditCredentials {
  client_id: string;
  client_secret: string;
  access_token: string;
  refresh_token: string;
  expires_at?: number;
}

// API Client
class RedditApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`/api/v1/reddit${endpoint}`, {
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

  // Identity
  async getMe(): Promise<RedditUser> {
    return this.request('/me');
  }

  async getUser(username: string): Promise<RedditUser> {
    return this.request(`/user/${encodeURIComponent(username)}`);
  }

  // Subreddits
  async getMySubreddits(limit?: number): Promise<{ subreddits: RedditSubreddit[]; count: number }> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    return this.request(`/subreddits/mine?${params.toString()}`);
  }

  async getSubreddit(subreddit: string): Promise<RedditSubreddit> {
    return this.request(`/r/${encodeURIComponent(subreddit)}`);
  }

  async getSubredditPosts(
    subreddit: string,
    options?: { sort?: string; limit?: number; t?: string }
  ): Promise<{ posts: RedditPost[]; count: number; after?: string }> {
    const params = new URLSearchParams();
    if (options?.sort) params.set('sort', options.sort);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.t) params.set('t', options.t);
    return this.request(`/r/${encodeURIComponent(subreddit)}/posts?${params.toString()}`);
  }

  // Posts
  async createPost(data: CreatePostData): Promise<{ id: string; name: string; url: string }> {
    return this.request('/post', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPost(postId: string): Promise<RedditPost> {
    return this.request(`/post/${encodeURIComponent(postId)}`);
  }

  async deletePost(postId: string): Promise<{ deleted: boolean }> {
    return this.request(`/post/${encodeURIComponent(postId)}`, {
      method: 'DELETE',
    });
  }

  // Comments
  async getComments(
    postId: string,
    options?: { sort?: string; limit?: number }
  ): Promise<{ comments: RedditComment[]; count: number }> {
    const params = new URLSearchParams();
    if (options?.sort) params.set('sort', options.sort);
    if (options?.limit) params.set('limit', String(options.limit));
    return this.request(`/post/${encodeURIComponent(postId)}/comments?${params.toString()}`);
  }

  async createComment(parent: string, text: string): Promise<{ id: string; name: string; body: string }> {
    return this.request('/comment', {
      method: 'POST',
      body: JSON.stringify({ parent, text }),
    });
  }

  // Voting
  async vote(id: string, direction: -1 | 0 | 1): Promise<{ voted: boolean; direction: number }> {
    return this.request('/vote', {
      method: 'POST',
      body: JSON.stringify({ id, dir: direction }),
    });
  }

  async upvote(id: string): Promise<{ voted: boolean; direction: number }> {
    return this.vote(id, 1);
  }

  async downvote(id: string): Promise<{ voted: boolean; direction: number }> {
    return this.vote(id, -1);
  }

  async removeVote(id: string): Promise<{ voted: boolean; direction: number }> {
    return this.vote(id, 0);
  }

  // Search
  async search(
    query: string,
    options?: { subreddit?: string; sort?: string; t?: string; limit?: number }
  ): Promise<{ posts: RedditPost[]; count: number }> {
    const params = new URLSearchParams();
    params.set('q', query);
    if (options?.subreddit) params.set('subreddit', options.subreddit);
    if (options?.sort) params.set('sort', options.sort);
    if (options?.t) params.set('t', options.t);
    if (options?.limit) params.set('limit', String(options.limit));
    return this.request(`/search?${params.toString()}`);
  }

  // Feed
  async getFeed(options?: { sort?: string; limit?: number }): Promise<{ posts: RedditPost[]; count: number; after?: string }> {
    const params = new URLSearchParams();
    if (options?.sort) params.set('sort', options.sort);
    if (options?.limit) params.set('limit', String(options.limit));
    return this.request(`/feed?${params.toString()}`);
  }
}

export const redditClient = new RedditApiClient();

// React Query Hooks

// Identity
export function useRedditMe() {
  return useQuery({
    queryKey: ['reddit', 'me'],
    queryFn: () => redditClient.getMe(),
  });
}

export function useRedditUser(username: string) {
  return useQuery({
    queryKey: ['reddit', 'user', username],
    queryFn: () => redditClient.getUser(username),
    enabled: !!username,
  });
}

// Subreddits
export function useMySubreddits(limit?: number) {
  return useQuery({
    queryKey: ['reddit', 'subreddits', 'mine', limit],
    queryFn: () => redditClient.getMySubreddits(limit),
  });
}

export function useSubreddit(subreddit: string) {
  return useQuery({
    queryKey: ['reddit', 'subreddit', subreddit],
    queryFn: () => redditClient.getSubreddit(subreddit),
    enabled: !!subreddit,
  });
}

export function useSubredditPosts(
  subreddit: string,
  options?: { sort?: string; limit?: number; t?: string }
) {
  return useQuery({
    queryKey: ['reddit', 'subreddit', subreddit, 'posts', options],
    queryFn: () => redditClient.getSubredditPosts(subreddit, options),
    enabled: !!subreddit,
  });
}

// Posts
export function useCreateRedditPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePostData) => redditClient.createPost(data),
    onSuccess: (_, { subreddit }) => {
      queryClient.invalidateQueries({ queryKey: ['reddit', 'subreddit', subreddit, 'posts'] });
    },
  });
}

export function useRedditPost(postId: string) {
  return useQuery({
    queryKey: ['reddit', 'post', postId],
    queryFn: () => redditClient.getPost(postId),
    enabled: !!postId,
  });
}

export function useDeleteRedditPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => redditClient.deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reddit'] });
    },
  });
}

// Comments
export function useRedditComments(postId: string, options?: { sort?: string; limit?: number }) {
  return useQuery({
    queryKey: ['reddit', 'post', postId, 'comments', options],
    queryFn: () => redditClient.getComments(postId, options),
    enabled: !!postId,
  });
}

export function useCreateRedditComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ parent, text }: { parent: string; text: string }) =>
      redditClient.createComment(parent, text),
    onSuccess: (_, { parent }) => {
      // Invalidate post comments
      const postId = parent.startsWith('t3_') ? parent.replace('t3_', '') : parent;
      queryClient.invalidateQueries({ queryKey: ['reddit', 'post', postId, 'comments'] });
    },
  });
}

// Voting
export function useRedditVote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: -1 | 0 | 1 }) =>
      redditClient.vote(id, direction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reddit'] });
    },
  });
}

export function useRedditUpvote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => redditClient.upvote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reddit'] });
    },
  });
}

export function useRedditDownvote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => redditClient.downvote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reddit'] });
    },
  });
}

// Search
export function useRedditSearch(
  query: string,
  options?: { subreddit?: string; sort?: string; t?: string; limit?: number }
) {
  return useQuery({
    queryKey: ['reddit', 'search', query, options],
    queryFn: () => redditClient.search(query, options),
    enabled: !!query,
  });
}

// Feed
export function useRedditFeed(options?: { sort?: string; limit?: number }) {
  return useQuery({
    queryKey: ['reddit', 'feed', options],
    queryFn: () => redditClient.getFeed(options),
  });
}

// Utility: Get post URL
export function getRedditPostUrl(post: RedditPost): string {
  return post.permalink || `https://reddit.com/r/${post.subreddit}/comments/${post.id}`;
}

// Utility: Format karma
export function formatKarma(karma: number): string {
  if (karma >= 1000000) {
    return `${(karma / 1000000).toFixed(1)}M`;
  }
  if (karma >= 1000) {
    return `${(karma / 1000).toFixed(1)}K`;
  }
  return String(karma);
}

export default redditClient;
