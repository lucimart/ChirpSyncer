/**
 * Pinterest Client
 * OAuth 2.0 authenticated Pinterest API v5
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
export interface PinterestUser {
  username: string;
  account_type: string;
  profile_image?: string;
  website_url?: string;
  business_name?: string;
}

export interface PinterestBoard {
  id: string;
  name: string;
  description?: string;
  pin_count?: number;
  follower_count?: number;
  privacy: 'PUBLIC' | 'PROTECTED' | 'SECRET';
  owner?: {
    username: string;
  };
}

export interface PinterestPin {
  id: string;
  title?: string;
  description?: string;
  link?: string;
  board_id?: string;
  created_at?: string;
  media?: {
    media_type: string;
    images?: Record<string, { url: string; width: number; height: number }>;
  };
  dominant_color?: string;
  alt_text?: string;
}

export interface CreateBoardData {
  name: string;
  description?: string;
  privacy?: 'PUBLIC' | 'PROTECTED' | 'SECRET';
}

export interface CreatePinData {
  board_id: string;
  media_source: {
    source_type: 'image_url' | 'image_base64' | 'video_id';
    url?: string;
    data?: string;
    content_type?: string;
    video_id?: string;
  };
  title?: string;
  description?: string;
  link?: string;
  alt_text?: string;
}

export interface PinterestCredentials {
  client_id: string;
  client_secret: string;
  access_token: string;
  refresh_token: string;
  expires_at?: number;
}

// API Client
class PinterestApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`/api/v1/pinterest${endpoint}`, {
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
  async getMe(): Promise<PinterestUser> {
    return this.request('/me');
  }

  // Boards
  async getBoards(options?: {
    page_size?: number;
    bookmark?: string;
  }): Promise<{ boards: PinterestBoard[]; bookmark?: string }> {
    const params = new URLSearchParams();
    if (options?.page_size) params.set('page_size', String(options.page_size));
    if (options?.bookmark) params.set('bookmark', options.bookmark);
    return this.request(`/boards?${params.toString()}`);
  }

  async createBoard(data: CreateBoardData): Promise<PinterestBoard> {
    return this.request('/boards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getBoard(boardId: string): Promise<PinterestBoard> {
    return this.request(`/boards/${encodeURIComponent(boardId)}`);
  }

  async deleteBoard(boardId: string): Promise<{ deleted: boolean }> {
    return this.request(`/boards/${encodeURIComponent(boardId)}`, {
      method: 'DELETE',
    });
  }

  async getBoardPins(
    boardId: string,
    options?: { page_size?: number; bookmark?: string }
  ): Promise<{ pins: PinterestPin[]; bookmark?: string }> {
    const params = new URLSearchParams();
    if (options?.page_size) params.set('page_size', String(options.page_size));
    if (options?.bookmark) params.set('bookmark', options.bookmark);
    return this.request(`/boards/${encodeURIComponent(boardId)}/pins?${params.toString()}`);
  }

  // Pins
  async getPins(options?: {
    page_size?: number;
    bookmark?: string;
  }): Promise<{ pins: PinterestPin[]; bookmark?: string }> {
    const params = new URLSearchParams();
    if (options?.page_size) params.set('page_size', String(options.page_size));
    if (options?.bookmark) params.set('bookmark', options.bookmark);
    return this.request(`/pins?${params.toString()}`);
  }

  async createPin(data: CreatePinData): Promise<PinterestPin> {
    return this.request('/pins', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPin(pinId: string): Promise<PinterestPin> {
    return this.request(`/pins/${encodeURIComponent(pinId)}`);
  }

  async updatePin(
    pinId: string,
    data: Partial<Omit<CreatePinData, 'media_source' | 'board_id'> & { board_id?: string }>
  ): Promise<PinterestPin> {
    return this.request(`/pins/${encodeURIComponent(pinId)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deletePin(pinId: string): Promise<{ deleted: boolean }> {
    return this.request(`/pins/${encodeURIComponent(pinId)}`, {
      method: 'DELETE',
    });
  }

  async savePin(pinId: string, boardId: string): Promise<PinterestPin> {
    return this.request(`/pins/${encodeURIComponent(pinId)}/save`, {
      method: 'POST',
      body: JSON.stringify({ board_id: boardId }),
    });
  }

  // Search
  async searchPins(
    query: string,
    options?: { page_size?: number; bookmark?: string }
  ): Promise<{ pins: PinterestPin[]; bookmark?: string }> {
    const params = new URLSearchParams();
    params.set('query', query);
    if (options?.page_size) params.set('page_size', String(options.page_size));
    if (options?.bookmark) params.set('bookmark', options.bookmark);
    return this.request(`/search/pins?${params.toString()}`);
  }

  // Analytics
  async getPinAnalytics(options: {
    start_date: string;
    end_date: string;
    pin_ids: string;
  }): Promise<unknown> {
    const params = new URLSearchParams();
    params.set('start_date', options.start_date);
    params.set('end_date', options.end_date);
    params.set('pin_ids', options.pin_ids);
    return this.request(`/analytics/pins?${params.toString()}`);
  }

  async getAccountAnalytics(options: {
    start_date: string;
    end_date: string;
    granularity?: string;
  }): Promise<unknown> {
    const params = new URLSearchParams();
    params.set('start_date', options.start_date);
    params.set('end_date', options.end_date);
    if (options.granularity) params.set('granularity', options.granularity);
    return this.request(`/analytics/account?${params.toString()}`);
  }
}

export const pinterestClient = new PinterestApiClient();

// React Query Hooks

// User
export function usePinterestMe() {
  return useQuery({
    queryKey: ['pinterest', 'me'],
    queryFn: () => pinterestClient.getMe(),
  });
}

// Boards
export function usePinterestBoards(options?: { page_size?: number; bookmark?: string }) {
  return useQuery({
    queryKey: ['pinterest', 'boards', options],
    queryFn: () => pinterestClient.getBoards(options),
  });
}

export function usePinterestBoard(boardId: string) {
  return useQuery({
    queryKey: ['pinterest', 'board', boardId],
    queryFn: () => pinterestClient.getBoard(boardId),
    enabled: !!boardId,
  });
}

export function useCreatePinterestBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBoardData) => pinterestClient.createBoard(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pinterest', 'boards'] });
    },
  });
}

export function useDeletePinterestBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (boardId: string) => pinterestClient.deleteBoard(boardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pinterest', 'boards'] });
    },
  });
}

export function usePinterestBoardPins(
  boardId: string,
  options?: { page_size?: number; bookmark?: string }
) {
  return useQuery({
    queryKey: ['pinterest', 'board', boardId, 'pins', options],
    queryFn: () => pinterestClient.getBoardPins(boardId, options),
    enabled: !!boardId,
  });
}

// Pins
export function usePinterestPins(options?: { page_size?: number; bookmark?: string }) {
  return useQuery({
    queryKey: ['pinterest', 'pins', options],
    queryFn: () => pinterestClient.getPins(options),
  });
}

export function usePinterestPin(pinId: string) {
  return useQuery({
    queryKey: ['pinterest', 'pin', pinId],
    queryFn: () => pinterestClient.getPin(pinId),
    enabled: !!pinId,
  });
}

export function useCreatePinterestPin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePinData) => pinterestClient.createPin(data),
    onSuccess: (_, { board_id }) => {
      queryClient.invalidateQueries({ queryKey: ['pinterest', 'pins'] });
      queryClient.invalidateQueries({ queryKey: ['pinterest', 'board', board_id, 'pins'] });
    },
  });
}

export function useUpdatePinterestPin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      pinId,
      data,
    }: {
      pinId: string;
      data: Partial<Omit<CreatePinData, 'media_source' | 'board_id'> & { board_id?: string }>;
    }) => pinterestClient.updatePin(pinId, data),
    onSuccess: (_, { pinId }) => {
      queryClient.invalidateQueries({ queryKey: ['pinterest', 'pin', pinId] });
      queryClient.invalidateQueries({ queryKey: ['pinterest', 'pins'] });
    },
  });
}

export function useDeletePinterestPin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pinId: string) => pinterestClient.deletePin(pinId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pinterest', 'pins'] });
      queryClient.invalidateQueries({ queryKey: ['pinterest', 'boards'] });
    },
  });
}

export function useSavePinterestPin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pinId, boardId }: { pinId: string; boardId: string }) =>
      pinterestClient.savePin(pinId, boardId),
    onSuccess: (_, { boardId }) => {
      queryClient.invalidateQueries({ queryKey: ['pinterest', 'board', boardId, 'pins'] });
    },
  });
}

// Search
export function usePinterestSearchPins(
  query: string,
  options?: { page_size?: number; bookmark?: string }
) {
  return useQuery({
    queryKey: ['pinterest', 'search', 'pins', query, options],
    queryFn: () => pinterestClient.searchPins(query, options),
    enabled: !!query,
  });
}

// Analytics
export function usePinterestPinAnalytics(options: {
  start_date: string;
  end_date: string;
  pin_ids: string;
}) {
  return useQuery({
    queryKey: ['pinterest', 'analytics', 'pins', options],
    queryFn: () => pinterestClient.getPinAnalytics(options),
    enabled: !!(options.start_date && options.end_date && options.pin_ids),
  });
}

export function usePinterestAccountAnalytics(options: {
  start_date: string;
  end_date: string;
  granularity?: string;
}) {
  return useQuery({
    queryKey: ['pinterest', 'analytics', 'account', options],
    queryFn: () => pinterestClient.getAccountAnalytics(options),
    enabled: !!(options.start_date && options.end_date),
  });
}

// Utility: Get pin image URL
export function getPinImageUrl(pin: PinterestPin, size: 'small' | 'medium' | 'large' = 'medium'): string | undefined {
  const sizeMap = {
    small: '150x150',
    medium: '400x300',
    large: '600x',
  };
  const images = pin.media?.images;
  if (!images) return undefined;
  return images[sizeMap[size]]?.url || Object.values(images)[0]?.url;
}

// Utility: Format pin count
export function formatPinCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M pins`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K pins`;
  }
  return `${count} ${count === 1 ? 'pin' : 'pins'}`;
}

export default pinterestClient;
