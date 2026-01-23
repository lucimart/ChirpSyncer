/**
 * DSNP (Decentralized Social Networking Protocol) Client
 * Built on Frequency blockchain
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
export interface DSNPIdentity {
  msa_id: string;
  handle?: string;
  public_key: string;
  created_block: number;
}

export interface DSNPProfile {
  msa_id: string;
  display_name?: string;
  summary?: string;
  icon?: string;
  published?: string;
  updated?: string;
}

export interface DSNPBroadcast {
  announcement_id: string;
  msa_id: string;
  content: string;
  published: string;
  url?: string;
  tag?: string[];
  attachment?: DSNPAttachment[];
  reply_count?: number;
  reaction_count?: number;
}

export interface DSNPAttachment {
  type: 'Image' | 'Video' | 'Audio' | 'Link';
  url: string;
  mediaType?: string;
  name?: string;
  hash?: string;
}

export interface DSNPReply {
  announcement_id: string;
  msa_id: string;
  in_reply_to: string;
  content: string;
  published: string;
}

export interface DSNPReaction {
  msa_id: string;
  announcement_id: string;
  emoji: string;
  apply: number;
}

export interface DSNPGraphConnection {
  msa_id: string;
  handle?: string;
  connection_type: 'follow' | 'friend';
}

export interface DSNPCredentials {
  provider_url: string;
  msa_id?: string;
  seed_phrase?: string;
}

// API Client
class DSNPApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`/api/v1/dsnp${endpoint}`, {
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
  async getIdentity(): Promise<DSNPIdentity> {
    return this.request('/identity');
  }

  async createIdentity(handle?: string): Promise<DSNPIdentity> {
    return this.request('/identity', {
      method: 'POST',
      body: JSON.stringify({ handle }),
    });
  }

  async resolveHandle(handle: string): Promise<DSNPIdentity> {
    return this.request(`/identity/resolve/${encodeURIComponent(handle)}`);
  }

  // Profile
  async getProfile(msaId?: string): Promise<DSNPProfile> {
    const url = msaId ? `/profile/${msaId}` : '/profile';
    return this.request(url);
  }

  async updateProfile(profile: Partial<Omit<DSNPProfile, 'msa_id'>>): Promise<DSNPProfile> {
    return this.request('/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
  }

  // Broadcasts (Posts)
  async getBroadcasts(params?: {
    msa_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ broadcasts: DSNPBroadcast[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params?.msa_id) searchParams.set('msa_id', params.msa_id);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    return this.request(`/broadcasts?${searchParams.toString()}`);
  }

  async createBroadcast(data: {
    content: string;
    url?: string;
    tag?: string[];
    attachment?: DSNPAttachment[];
  }): Promise<DSNPBroadcast> {
    return this.request('/broadcast', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getBroadcast(announcementId: string): Promise<DSNPBroadcast> {
    return this.request(`/broadcast/${encodeURIComponent(announcementId)}`);
  }

  async deleteBroadcast(announcementId: string): Promise<void> {
    return this.request(`/broadcast/${encodeURIComponent(announcementId)}`, {
      method: 'DELETE',
    });
  }

  // Replies
  async getReplies(announcementId: string): Promise<{ replies: DSNPReply[] }> {
    return this.request(`/broadcast/${encodeURIComponent(announcementId)}/replies`);
  }

  async createReply(announcementId: string, content: string): Promise<DSNPReply> {
    return this.request('/reply', {
      method: 'POST',
      body: JSON.stringify({
        in_reply_to: announcementId,
        content,
      }),
    });
  }

  // Reactions
  async getReactions(announcementId: string): Promise<{ reactions: DSNPReaction[] }> {
    return this.request(`/broadcast/${encodeURIComponent(announcementId)}/reactions`);
  }

  async react(announcementId: string, emoji: string): Promise<DSNPReaction> {
    return this.request('/reaction', {
      method: 'POST',
      body: JSON.stringify({
        announcement_id: announcementId,
        emoji,
        apply: 1,
      }),
    });
  }

  async unreact(announcementId: string, emoji: string): Promise<void> {
    return this.request('/reaction', {
      method: 'POST',
      body: JSON.stringify({
        announcement_id: announcementId,
        emoji,
        apply: 0,
      }),
    });
  }

  // Graph (Social Connections)
  async getFollowing(msaId?: string): Promise<{ following: DSNPGraphConnection[] }> {
    const url = msaId ? `/graph/following/${msaId}` : '/graph/following';
    return this.request(url);
  }

  async getFollowers(msaId?: string): Promise<{ followers: DSNPGraphConnection[] }> {
    const url = msaId ? `/graph/followers/${msaId}` : '/graph/followers';
    return this.request(url);
  }

  async follow(msaId: string): Promise<void> {
    return this.request('/graph/follow', {
      method: 'POST',
      body: JSON.stringify({ msa_id: msaId }),
    });
  }

  async unfollow(msaId: string): Promise<void> {
    return this.request('/graph/unfollow', {
      method: 'POST',
      body: JSON.stringify({ msa_id: msaId }),
    });
  }

  // Delegation
  async getDelegations(): Promise<{ delegations: { provider: string; permissions: string[] }[] }> {
    return this.request('/delegations');
  }

  async revokeDelegation(providerId: string): Promise<void> {
    return this.request(`/delegation/${encodeURIComponent(providerId)}`, {
      method: 'DELETE',
    });
  }
}

export const dsnpClient = new DSNPApiClient();

// React Query Hooks

// Identity
export function useDSNPIdentity() {
  return useQuery({
    queryKey: ['dsnp', 'identity'],
    queryFn: () => dsnpClient.getIdentity(),
  });
}

export function useCreateDSNPIdentity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (handle?: string) => dsnpClient.createIdentity(handle),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dsnp', 'identity'] });
    },
  });
}

export function useResolveHandle(handle: string) {
  return useQuery({
    queryKey: ['dsnp', 'resolve', handle],
    queryFn: () => dsnpClient.resolveHandle(handle),
    enabled: !!handle,
  });
}

// Profile
export function useDSNPProfile(msaId?: string) {
  return useQuery({
    queryKey: ['dsnp', 'profile', msaId],
    queryFn: () => dsnpClient.getProfile(msaId),
  });
}

export function useUpdateDSNPProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profile: Partial<Omit<DSNPProfile, 'msa_id'>>) =>
      dsnpClient.updateProfile(profile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dsnp', 'profile'] });
    },
  });
}

// Broadcasts
export function useDSNPBroadcasts(params?: { msa_id?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['dsnp', 'broadcasts', params],
    queryFn: () => dsnpClient.getBroadcasts(params),
  });
}

export function useDSNPBroadcast(announcementId: string) {
  return useQuery({
    queryKey: ['dsnp', 'broadcast', announcementId],
    queryFn: () => dsnpClient.getBroadcast(announcementId),
    enabled: !!announcementId,
  });
}

export function useCreateDSNPBroadcast() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof dsnpClient.createBroadcast>[0]) =>
      dsnpClient.createBroadcast(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dsnp', 'broadcasts'] });
    },
  });
}

export function useDeleteDSNPBroadcast() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (announcementId: string) => dsnpClient.deleteBroadcast(announcementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dsnp', 'broadcasts'] });
    },
  });
}

// Replies
export function useDSNPReplies(announcementId: string) {
  return useQuery({
    queryKey: ['dsnp', 'replies', announcementId],
    queryFn: () => dsnpClient.getReplies(announcementId),
    enabled: !!announcementId,
  });
}

export function useCreateDSNPReply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ announcementId, content }: { announcementId: string; content: string }) =>
      dsnpClient.createReply(announcementId, content),
    onSuccess: (_, { announcementId }) => {
      queryClient.invalidateQueries({ queryKey: ['dsnp', 'replies', announcementId] });
      queryClient.invalidateQueries({ queryKey: ['dsnp', 'broadcast', announcementId] });
    },
  });
}

// Reactions
export function useDSNPReactions(announcementId: string) {
  return useQuery({
    queryKey: ['dsnp', 'reactions', announcementId],
    queryFn: () => dsnpClient.getReactions(announcementId),
    enabled: !!announcementId,
  });
}

export function useDSNPReact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ announcementId, emoji }: { announcementId: string; emoji: string }) =>
      dsnpClient.react(announcementId, emoji),
    onSuccess: (_, { announcementId }) => {
      queryClient.invalidateQueries({ queryKey: ['dsnp', 'reactions', announcementId] });
    },
  });
}

export function useDSNPUnreact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ announcementId, emoji }: { announcementId: string; emoji: string }) =>
      dsnpClient.unreact(announcementId, emoji),
    onSuccess: (_, { announcementId }) => {
      queryClient.invalidateQueries({ queryKey: ['dsnp', 'reactions', announcementId] });
    },
  });
}

// Graph
export function useDSNPFollowing(msaId?: string) {
  return useQuery({
    queryKey: ['dsnp', 'following', msaId],
    queryFn: () => dsnpClient.getFollowing(msaId),
  });
}

export function useDSNPFollowers(msaId?: string) {
  return useQuery({
    queryKey: ['dsnp', 'followers', msaId],
    queryFn: () => dsnpClient.getFollowers(msaId),
  });
}

export function useDSNPFollow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (msaId: string) => dsnpClient.follow(msaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dsnp', 'following'] });
    },
  });
}

export function useDSNPUnfollow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (msaId: string) => dsnpClient.unfollow(msaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dsnp', 'following'] });
    },
  });
}

// Delegations
export function useDSNPDelegations() {
  return useQuery({
    queryKey: ['dsnp', 'delegations'],
    queryFn: () => dsnpClient.getDelegations(),
  });
}

export function useRevokeDSNPDelegation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (providerId: string) => dsnpClient.revokeDelegation(providerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dsnp', 'delegations'] });
    },
  });
}

export default dsnpClient;
