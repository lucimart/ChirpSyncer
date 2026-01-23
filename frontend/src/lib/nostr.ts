import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CanonicalPost } from './connectors';

// Nostr Types

export interface NostrProfile {
  pubkey: string;
  npub: string;
  name?: string;
  display_name?: string;
  about?: string;
  picture?: string;
  banner?: string;
  nip05?: string;
  lud16?: string; // Lightning address
  website?: string;
}

export interface NostrNote {
  id: string;
  pubkey: string;
  content: string;
  created_at: number;
  tags: string[][];
  reply_to?: string;
  mentions: string[];
}

export interface NostrNotesResponse {
  notes: NostrNote[];
}

export interface NostrReaction {
  id: string;
  pubkey: string;
  content: string; // "+" or emoji
  created_at: number;
}

export interface NostrReactionsResponse {
  reactions: NostrReaction[];
  counts: Record<string, number>;
  total: number;
}

export interface NostrContact {
  pubkey: string;
  relay?: string;
  petname?: string;
}

export interface NostrFollowingResponse {
  following: NostrContact[];
  count: number;
}

export interface NostrRelaysResponse {
  relays: string[];
  default_relays: string[];
}

export interface RelayResult {
  status: 'published' | 'rejected' | 'timeout' | 'error';
  accepted?: boolean;
  message?: string;
}

export interface PublishResponse {
  event_id: string;
  relay_results: Record<string, RelayResult>;
}

// Utility Functions

export function getProfileUrl(npub: string): string {
  return `https://njump.me/${npub}`;
}

export function getNoteUrl(noteId: string): string {
  return `https://njump.me/${noteId}`;
}

export function nostrToCanonical(note: NostrNote, profile?: NostrProfile): CanonicalPost {
  return {
    id: note.id,
    content: note.content,
    created_at: new Date(note.created_at * 1000).toISOString(),
    author: {
      id: note.pubkey,
      handle: profile?.nip05 || `${note.pubkey.slice(0, 8)}...`,
      displayName: profile?.display_name || profile?.name || 'Nostr User',
      avatar: profile?.picture,
    },
    reply_to: note.reply_to,
    metrics: { likes: 0, reposts: 0, replies: 0, quotes: 0 },
  };
}

// API Client

class NostrApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`/api/v1/nostr${endpoint}`, {
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

  // Profile
  async getProfile(): Promise<NostrProfile> {
    return this.request('/profile');
  }

  async updateProfile(profile: Partial<NostrProfile>): Promise<PublishResponse> {
    return this.request('/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
  }

  // Notes
  async getNotes(options?: {
    limit?: number;
    since?: number;
    until?: number;
    authors?: string[];
  }): Promise<NostrNotesResponse> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.since) params.set('since', String(options.since));
    if (options?.until) params.set('until', String(options.until));
    if (options?.authors) params.set('authors', options.authors.join(','));
    return this.request(`/notes?${params.toString()}`);
  }

  async getNote(eventId: string): Promise<NostrNote> {
    return this.request(`/note/${encodeURIComponent(eventId)}`);
  }

  async createNote(content: string, options?: {
    reply_to?: string;
    mentions?: string[];
  }): Promise<PublishResponse> {
    return this.request('/note', {
      method: 'POST',
      body: JSON.stringify({
        content,
        ...options,
      }),
    });
  }

  async deleteNote(eventId: string): Promise<PublishResponse> {
    return this.request(`/note/${encodeURIComponent(eventId)}`, {
      method: 'DELETE',
    });
  }

  // Reactions
  async getReactions(eventId: string): Promise<NostrReactionsResponse> {
    return this.request(`/note/${encodeURIComponent(eventId)}/reactions`);
  }

  async react(eventId: string, content = '+', authorPubkey?: string): Promise<PublishResponse> {
    return this.request(`/note/${encodeURIComponent(eventId)}/react`, {
      method: 'POST',
      body: JSON.stringify({ content, author_pubkey: authorPubkey }),
    });
  }

  async repost(eventId: string, options?: {
    relay_url?: string;
    author_pubkey?: string;
  }): Promise<PublishResponse> {
    return this.request(`/note/${encodeURIComponent(eventId)}/repost`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  // Following
  async getFollowing(): Promise<NostrFollowingResponse> {
    return this.request('/following');
  }

  async follow(pubkey: string, options?: {
    relay?: string;
    petname?: string;
  }): Promise<PublishResponse> {
    return this.request('/follow', {
      method: 'POST',
      body: JSON.stringify({ pubkey, ...options }),
    });
  }

  // Relays
  async getRelays(): Promise<NostrRelaysResponse> {
    return this.request('/relays');
  }

  async getRelayInfo(relayUrl?: string): Promise<Record<string, unknown>> {
    const params = relayUrl ? `?relay=${encodeURIComponent(relayUrl)}` : '';
    return this.request(`/relays/info${params}`);
  }
}

export const nostrApi = new NostrApiClient();

// React Query Hooks

export function useNostrProfile() {
  return useQuery<NostrProfile>({
    queryKey: ['nostr-profile'],
    queryFn: () => nostrApi.getProfile(),
  });
}

export function useNostrNotes(options?: {
  limit?: number;
  since?: number;
  until?: number;
  authors?: string[];
}) {
  return useQuery<NostrNotesResponse>({
    queryKey: ['nostr-notes', options],
    queryFn: () => nostrApi.getNotes(options),
  });
}

export function useNostrNote(eventId?: string) {
  return useQuery<NostrNote>({
    queryKey: ['nostr-note', eventId],
    queryFn: () => nostrApi.getNote(eventId!),
    enabled: !!eventId,
  });
}

export function useNostrReactions(eventId?: string) {
  return useQuery<NostrReactionsResponse>({
    queryKey: ['nostr-reactions', eventId],
    queryFn: () => nostrApi.getReactions(eventId!),
    enabled: !!eventId,
  });
}

export function useNostrFollowing() {
  return useQuery<NostrFollowingResponse>({
    queryKey: ['nostr-following'],
    queryFn: () => nostrApi.getFollowing(),
  });
}

export function useNostrRelays() {
  return useQuery<NostrRelaysResponse>({
    queryKey: ['nostr-relays'],
    queryFn: () => nostrApi.getRelays(),
  });
}

export function useUpdateNostrProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profile: Partial<NostrProfile>) => nostrApi.updateProfile(profile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nostr-profile'] });
    },
  });
}

export function useCreateNostrNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ content, options }: {
      content: string;
      options?: { reply_to?: string; mentions?: string[] };
    }) => nostrApi.createNote(content, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nostr-notes'] });
    },
  });
}

export function useDeleteNostrNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => nostrApi.deleteNote(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nostr-notes'] });
    },
  });
}

export function useNostrReact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, content, authorPubkey }: {
      eventId: string;
      content?: string;
      authorPubkey?: string;
    }) => nostrApi.react(eventId, content, authorPubkey),
    onSuccess: (_, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: ['nostr-reactions', eventId] });
    },
  });
}

export function useNostrRepost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, options }: {
      eventId: string;
      options?: { relay_url?: string; author_pubkey?: string };
    }) => nostrApi.repost(eventId, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nostr-notes'] });
    },
  });
}

export function useNostrFollow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pubkey, options }: {
      pubkey: string;
      options?: { relay?: string; petname?: string };
    }) => nostrApi.follow(pubkey, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nostr-following'] });
    },
  });
}

// Nostr limitations and info
export const NOSTR_INFO = {
  // No character limit on protocol level, but clients may impose limits
  recommendedMaxLength: 1000,
  supportedMediaTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  reactionTypes: ['+', '-', '❤️', '🤙', '😂', '🔥', '👀'],
  eventKinds: {
    metadata: 0,
    textNote: 1,
    recommendRelay: 2,
    contacts: 3,
    encryptedDm: 4,
    eventDeletion: 5,
    repost: 6,
    reaction: 7,
  },
  defaultRelays: [
    'wss://relay.damus.io',
    'wss://relay.nostr.band',
    'wss://nos.lol',
    'wss://relay.snort.social',
    'wss://nostr.wine',
  ],
};
