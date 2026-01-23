/**
 * SSB (Secure Scuttlebutt) Client
 * P2P, offline-first social protocol
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
export interface SSBIdentity {
  id: string;  // @<base64-pubkey>.ed25519
  public_key: string;
}

export interface SSBProfile {
  id: string;
  name?: string;
  description?: string;
  image?: string | { link: string };
  following_count?: number;
  followers_count?: number;
}

export interface SSBPost {
  key: string;  // %<hash>.sha256
  author: string;
  sequence: number;
  timestamp: number;
  content: {
    type: 'post';
    text: string;
    root?: string;
    branch?: string;
    mentions?: SSBMention[];
    channel?: string;
  };
  vote_count?: number;
}

export interface SSBMention {
  link: string;
  name?: string;
}

export interface SSBVote {
  link: string;
  value: number;  // 1 = like, -1 = unlike
  expression?: string;
}

export interface SSBThread {
  root: SSBPost;
  replies: SSBPost[];
}

export interface SSBPub {
  host: string;
  port: number;
  key: string;
  invite?: string;
}

export interface SSBBlob {
  id: string;  // &<hash>.sha256
  size: number;
  type?: string;
}

export interface SSBCredentials {
  ssb_server_url: string;
  secret?: string;
}

// API Client
class SSBApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`/api/v1/ssb${endpoint}`, {
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
  async whoami(): Promise<SSBIdentity> {
    return this.request('/whoami');
  }

  // Profile
  async getProfile(feedId?: string): Promise<SSBProfile> {
    const url = feedId
      ? `/profile/${encodeURIComponent(feedId)}`
      : '/profile';
    return this.request(url);
  }

  async updateProfile(profile: {
    name?: string;
    description?: string;
    image?: string;
  }): Promise<SSBProfile> {
    return this.request('/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
  }

  // Posts (Messages)
  async getPosts(params?: {
    feed_id?: string;
    limit?: number;
    reverse?: boolean;
    channel?: string;
  }): Promise<{ posts: SSBPost[]; has_more: boolean }> {
    const searchParams = new URLSearchParams();
    if (params?.feed_id) searchParams.set('feed_id', params.feed_id);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.reverse) searchParams.set('reverse', String(params.reverse));
    if (params?.channel) searchParams.set('channel', params.channel);
    return this.request(`/posts?${searchParams.toString()}`);
  }

  async createPost(data: {
    text: string;
    mentions?: SSBMention[];
    channel?: string;
  }): Promise<SSBPost> {
    return this.request('/post', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPost(key: string): Promise<SSBPost> {
    return this.request(`/post/${encodeURIComponent(key)}`);
  }

  // Threads
  async getThread(rootKey: string): Promise<SSBThread> {
    return this.request(`/thread/${encodeURIComponent(rootKey)}`);
  }

  async reply(data: {
    root: string;
    branch?: string;
    text: string;
    mentions?: SSBMention[];
  }): Promise<SSBPost> {
    return this.request('/reply', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Votes (Likes)
  async getVotes(postKey: string): Promise<{ votes: SSBVote[]; count: number }> {
    return this.request(`/post/${encodeURIComponent(postKey)}/votes`);
  }

  async vote(postKey: string, value: number = 1, expression?: string): Promise<void> {
    return this.request('/vote', {
      method: 'POST',
      body: JSON.stringify({
        link: postKey,
        value,
        expression,
      }),
    });
  }

  async like(postKey: string): Promise<void> {
    return this.vote(postKey, 1, 'Like');
  }

  async unlike(postKey: string): Promise<void> {
    return this.vote(postKey, 0);
  }

  // Social Graph
  async getFollowing(feedId?: string): Promise<{ following: string[] }> {
    const url = feedId
      ? `/following/${encodeURIComponent(feedId)}`
      : '/following';
    return this.request(url);
  }

  async getFollowers(feedId?: string): Promise<{ followers: string[] }> {
    const url = feedId
      ? `/followers/${encodeURIComponent(feedId)}`
      : '/followers';
    return this.request(url);
  }

  async follow(feedId: string): Promise<void> {
    return this.request('/follow', {
      method: 'POST',
      body: JSON.stringify({ feed_id: feedId }),
    });
  }

  async unfollow(feedId: string): Promise<void> {
    return this.request('/unfollow', {
      method: 'POST',
      body: JSON.stringify({ feed_id: feedId }),
    });
  }

  async block(feedId: string): Promise<void> {
    return this.request('/block', {
      method: 'POST',
      body: JSON.stringify({ feed_id: feedId }),
    });
  }

  async unblock(feedId: string): Promise<void> {
    return this.request('/unblock', {
      method: 'POST',
      body: JSON.stringify({ feed_id: feedId }),
    });
  }

  async getBlocked(): Promise<{ blocked: string[] }> {
    return this.request('/blocked');
  }

  // Pubs (Relay servers)
  async getPubs(): Promise<{ pubs: SSBPub[] }> {
    return this.request('/pubs');
  }

  async joinPub(invite: string): Promise<SSBPub> {
    return this.request('/pub/join', {
      method: 'POST',
      body: JSON.stringify({ invite }),
    });
  }

  // Blobs (Media)
  async uploadBlob(file: File): Promise<SSBBlob> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/v1/ssb/blob', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return data.data;
  }

  async getBlob(blobId: string): Promise<Blob> {
    const response = await fetch(`/api/v1/ssb/blob/${encodeURIComponent(blobId)}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.blob();
  }

  // Channels
  async getChannels(): Promise<{ channels: string[] }> {
    return this.request('/channels');
  }

  async subscribeChannel(channel: string): Promise<void> {
    return this.request('/channel/subscribe', {
      method: 'POST',
      body: JSON.stringify({ channel }),
    });
  }

  async unsubscribeChannel(channel: string): Promise<void> {
    return this.request('/channel/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ channel }),
    });
  }

  // Sync status
  async getSyncStatus(): Promise<{
    peers: number;
    sync_progress: number;
    last_sync: string;
  }> {
    return this.request('/sync/status');
  }
}

export const ssbClient = new SSBApiClient();

// React Query Hooks

// Identity
export function useSSBIdentity() {
  return useQuery({
    queryKey: ['ssb', 'whoami'],
    queryFn: () => ssbClient.whoami(),
  });
}

// Profile
export function useSSBProfile(feedId?: string) {
  return useQuery({
    queryKey: ['ssb', 'profile', feedId],
    queryFn: () => ssbClient.getProfile(feedId),
  });
}

export function useUpdateSSBProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profile: Parameters<typeof ssbClient.updateProfile>[0]) =>
      ssbClient.updateProfile(profile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ssb', 'profile'] });
    },
  });
}

// Posts
export function useSSBPosts(params?: Parameters<typeof ssbClient.getPosts>[0]) {
  return useQuery({
    queryKey: ['ssb', 'posts', params],
    queryFn: () => ssbClient.getPosts(params),
  });
}

export function useSSBPost(key: string) {
  return useQuery({
    queryKey: ['ssb', 'post', key],
    queryFn: () => ssbClient.getPost(key),
    enabled: !!key,
  });
}

export function useCreateSSBPost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof ssbClient.createPost>[0]) =>
      ssbClient.createPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ssb', 'posts'] });
    },
  });
}

// Threads
export function useSSBThread(rootKey: string) {
  return useQuery({
    queryKey: ['ssb', 'thread', rootKey],
    queryFn: () => ssbClient.getThread(rootKey),
    enabled: !!rootKey,
  });
}

export function useSSBReply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof ssbClient.reply>[0]) =>
      ssbClient.reply(data),
    onSuccess: (_, { root }) => {
      queryClient.invalidateQueries({ queryKey: ['ssb', 'thread', root] });
    },
  });
}

// Votes
export function useSSBVotes(postKey: string) {
  return useQuery({
    queryKey: ['ssb', 'votes', postKey],
    queryFn: () => ssbClient.getVotes(postKey),
    enabled: !!postKey,
  });
}

export function useSSBLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postKey: string) => ssbClient.like(postKey),
    onSuccess: (_, postKey) => {
      queryClient.invalidateQueries({ queryKey: ['ssb', 'votes', postKey] });
      queryClient.invalidateQueries({ queryKey: ['ssb', 'post', postKey] });
    },
  });
}

export function useSSBUnlike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postKey: string) => ssbClient.unlike(postKey),
    onSuccess: (_, postKey) => {
      queryClient.invalidateQueries({ queryKey: ['ssb', 'votes', postKey] });
      queryClient.invalidateQueries({ queryKey: ['ssb', 'post', postKey] });
    },
  });
}

// Social Graph
export function useSSBFollowing(feedId?: string) {
  return useQuery({
    queryKey: ['ssb', 'following', feedId],
    queryFn: () => ssbClient.getFollowing(feedId),
  });
}

export function useSSBFollowers(feedId?: string) {
  return useQuery({
    queryKey: ['ssb', 'followers', feedId],
    queryFn: () => ssbClient.getFollowers(feedId),
  });
}

export function useSSBFollow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (feedId: string) => ssbClient.follow(feedId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ssb', 'following'] });
    },
  });
}

export function useSSBUnfollow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (feedId: string) => ssbClient.unfollow(feedId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ssb', 'following'] });
    },
  });
}

export function useSSBBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (feedId: string) => ssbClient.block(feedId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ssb', 'blocked'] });
    },
  });
}

export function useSSBBlocked() {
  return useQuery({
    queryKey: ['ssb', 'blocked'],
    queryFn: () => ssbClient.getBlocked(),
  });
}

// Pubs
export function useSSBPubs() {
  return useQuery({
    queryKey: ['ssb', 'pubs'],
    queryFn: () => ssbClient.getPubs(),
  });
}

export function useJoinSSBPub() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invite: string) => ssbClient.joinPub(invite),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ssb', 'pubs'] });
    },
  });
}

// Blobs
export function useUploadSSBBlob() {
  return useMutation({
    mutationFn: (file: File) => ssbClient.uploadBlob(file),
  });
}

// Channels
export function useSSBChannels() {
  return useQuery({
    queryKey: ['ssb', 'channels'],
    queryFn: () => ssbClient.getChannels(),
  });
}

export function useSubscribeSSBChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (channel: string) => ssbClient.subscribeChannel(channel),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ssb', 'channels'] });
    },
  });
}

// Sync
export function useSSBSyncStatus() {
  return useQuery({
    queryKey: ['ssb', 'sync', 'status'],
    queryFn: () => ssbClient.getSyncStatus(),
    refetchInterval: 10000, // Refresh every 10s
  });
}

export default ssbClient;
