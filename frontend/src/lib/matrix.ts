import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Matrix Types

export interface MatrixUser {
  user_id: string;
  device_id?: string;
  homeserver: string;
}

export interface MatrixProfile {
  user_id: string;
  displayname?: string;
  avatar_url?: string;
}

export interface MatrixRoom {
  room_id: string;
  name?: string;
  topic?: string;
  member_count?: number;
}

export interface MatrixRoomsResponse {
  rooms: MatrixRoom[];
  count: number;
}

export interface MatrixMessage {
  event_id: string;
  sender: string;
  timestamp: number;
  msgtype: string;
  body: string;
  formatted_body?: string;
}

export interface MatrixMessagesResponse {
  messages: MatrixMessage[];
  start?: string;
  end?: string;
}

export interface MatrixSyncResponse {
  next_batch: string;
  rooms: {
    join: string[];
    invite: string[];
    leave: string[];
  };
}

export interface BroadcastResult {
  status: 'sent' | 'failed';
  event_id?: string;
  error?: string;
}

export interface BroadcastResponse {
  results: Record<string, BroadcastResult>;
  sent: number;
  failed: number;
}

// Utility Functions

export function getRoomUrl(roomId: string, homeserver?: string): string {
  // Matrix.to universal link
  return `https://matrix.to/#/${roomId}`;
}

export function getUserUrl(userId: string): string {
  return `https://matrix.to/#/${userId}`;
}

export function formatMxcUrl(mxcUrl: string, homeserver: string): string {
  if (!mxcUrl || !mxcUrl.startsWith('mxc://')) return mxcUrl;
  const [, serverName, mediaId] = mxcUrl.match(/mxc:\/\/([^/]+)\/(.+)/) || [];
  if (!serverName || !mediaId) return mxcUrl;
  return `${homeserver}/_matrix/media/v3/download/${serverName}/${mediaId}`;
}

// API Client

class MatrixApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`/api/v1/matrix${endpoint}`, {
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
  async whoami(): Promise<MatrixUser> {
    return this.request('/whoami');
  }

  async getProfile(): Promise<MatrixProfile> {
    return this.request('/profile');
  }

  async updateProfile(data: { displayname?: string; avatar_url?: string }): Promise<{ updated: boolean }> {
    return this.request('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Rooms
  async getRooms(): Promise<MatrixRoomsResponse> {
    return this.request('/rooms');
  }

  async getRoom(roomId: string): Promise<MatrixRoom> {
    return this.request(`/room/${encodeURIComponent(roomId)}`);
  }

  async createRoom(data: {
    name?: string;
    topic?: string;
    is_public?: boolean;
    invite?: string[];
  }): Promise<{ room_id: string }> {
    return this.request('/room', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async joinRoom(roomId: string): Promise<{ room_id: string }> {
    return this.request(`/room/${encodeURIComponent(roomId)}/join`, {
      method: 'POST',
    });
  }

  async leaveRoom(roomId: string): Promise<{ left: boolean; room_id: string }> {
    return this.request(`/room/${encodeURIComponent(roomId)}/leave`, {
      method: 'POST',
    });
  }

  // Messages
  async getMessages(roomId: string, options?: {
    limit?: number;
    from?: string;
    dir?: 'b' | 'f';
  }): Promise<MatrixMessagesResponse> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.from) params.set('from', options.from);
    if (options?.dir) params.set('dir', options.dir);
    return this.request(`/room/${encodeURIComponent(roomId)}/messages?${params.toString()}`);
  }

  async sendMessage(roomId: string, data: {
    body: string;
    msgtype?: string;
    formatted_body?: string;
  }): Promise<{ event_id: string }> {
    return this.request(`/room/${encodeURIComponent(roomId)}/send`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendNotice(roomId: string, data: {
    body: string;
    formatted_body?: string;
  }): Promise<{ event_id: string }> {
    return this.request(`/room/${encodeURIComponent(roomId)}/send/notice`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async sendReaction(roomId: string, eventId: string, key: string): Promise<{ event_id: string }> {
    return this.request(`/room/${encodeURIComponent(roomId)}/react`, {
      method: 'POST',
      body: JSON.stringify({ event_id: eventId, key }),
    });
  }

  // Sync
  async sync(since?: string, timeout = 0): Promise<MatrixSyncResponse> {
    const params = new URLSearchParams();
    if (since) params.set('since', since);
    params.set('timeout', String(timeout));
    return this.request(`/sync?${params.toString()}`);
  }

  // ChirpSyncer Integration
  async broadcast(data: {
    room_ids: string[];
    body: string;
    formatted_body?: string;
    as_notice?: boolean;
  }): Promise<BroadcastResponse> {
    return this.request('/broadcast', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const matrixApi = new MatrixApiClient();

// React Query Hooks

export function useMatrixWhoami() {
  return useQuery<MatrixUser>({
    queryKey: ['matrix-whoami'],
    queryFn: () => matrixApi.whoami(),
  });
}

export function useMatrixProfile() {
  return useQuery<MatrixProfile>({
    queryKey: ['matrix-profile'],
    queryFn: () => matrixApi.getProfile(),
  });
}

export function useMatrixRooms() {
  return useQuery<MatrixRoomsResponse>({
    queryKey: ['matrix-rooms'],
    queryFn: () => matrixApi.getRooms(),
  });
}

export function useMatrixRoom(roomId?: string) {
  return useQuery<MatrixRoom>({
    queryKey: ['matrix-room', roomId],
    queryFn: () => matrixApi.getRoom(roomId!),
    enabled: !!roomId,
  });
}

export function useMatrixMessages(roomId?: string, limit = 50) {
  return useQuery<MatrixMessagesResponse>({
    queryKey: ['matrix-messages', roomId, limit],
    queryFn: () => matrixApi.getMessages(roomId!, { limit }),
    enabled: !!roomId,
  });
}

export function useUpdateMatrixProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { displayname?: string; avatar_url?: string }) =>
      matrixApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matrix-profile'] });
    },
  });
}

export function useCreateMatrixRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name?: string;
      topic?: string;
      is_public?: boolean;
      invite?: string[];
    }) => matrixApi.createRoom(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matrix-rooms'] });
    },
  });
}

export function useJoinMatrixRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roomId: string) => matrixApi.joinRoom(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matrix-rooms'] });
    },
  });
}

export function useLeaveMatrixRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roomId: string) => matrixApi.leaveRoom(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matrix-rooms'] });
    },
  });
}

export function useSendMatrixMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roomId, data }: {
      roomId: string;
      data: { body: string; msgtype?: string; formatted_body?: string };
    }) => matrixApi.sendMessage(roomId, data),
    onSuccess: (_, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: ['matrix-messages', roomId] });
    },
  });
}

export function useSendMatrixNotice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roomId, data }: {
      roomId: string;
      data: { body: string; formatted_body?: string };
    }) => matrixApi.sendNotice(roomId, data),
    onSuccess: (_, { roomId }) => {
      queryClient.invalidateQueries({ queryKey: ['matrix-messages', roomId] });
    },
  });
}

export function useSendMatrixReaction() {
  return useMutation({
    mutationFn: ({ roomId, eventId, key }: {
      roomId: string;
      eventId: string;
      key: string;
    }) => matrixApi.sendReaction(roomId, eventId, key),
  });
}

export function useMatrixBroadcast() {
  return useMutation({
    mutationFn: (data: {
      room_ids: string[];
      body: string;
      formatted_body?: string;
      as_notice?: boolean;
    }) => matrixApi.broadcast(data),
  });
}

// Matrix info
export const MATRIX_INFO = {
  maxMessageLength: 65535, // Protocol limit
  recommendedMaxLength: 4096,
  supportedMsgTypes: ['m.text', 'm.notice', 'm.image', 'm.video', 'm.audio', 'm.file'],
  // Popular public homeservers
  publicHomeservers: [
    'https://matrix.org',
    'https://matrix.im',
    'https://envs.net',
    'https://tchncs.de',
  ],
};
