import type { ApiResponse, User, Session, DashboardStats, Credential } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage =
          typeof data?.error === 'string'
            ? data.error
            : data?.error?.message || `HTTP ${response.status}`;
        return {
          success: false,
          error: errorMessage,
          correlation_id: data?.correlation_id,
        };
      }

      return {
        success: true,
        data: data.data ?? data,
        correlation_id: data.correlation_id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Auth endpoints
  async login(username: string, password: string): Promise<ApiResponse<Session>> {
    return this.request<Session>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  async logout(): Promise<ApiResponse<void>> {
    return this.request<void>('/auth/logout', { method: 'POST' });
  }

  async register(
    username: string,
    email: string,
    password: string
  ): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/me');
  }

  // Dashboard
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return this.request<DashboardStats>('/dashboard/stats');
  }

  // Credentials
  async getCredentials(): Promise<ApiResponse<Credential[]>> {
    return this.request<Credential[]>('/credentials');
  }

  async addCredential(data: {
    platform: string;
    credential_type: string;
    credentials: Record<string, string>;
  }): Promise<ApiResponse<Credential>> {
    return this.request<Credential>('/credentials', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteCredential(id: number): Promise<ApiResponse<void>> {
    return this.request<void>(`/credentials/${id}`, { method: 'DELETE' });
  }

  async testCredential(id: number): Promise<ApiResponse<{ valid: boolean; message: string }>> {
    return this.request<{ valid: boolean; message: string }>(`/credentials/${id}/test`, {
      method: 'POST',
    });
  }

  // Sync
  async getSyncStats(): Promise<ApiResponse<{ today: number; week: number; total: number; last_sync: string | null }>> {
    return this.request('/sync/stats');
  }

  async getSyncHistory(page = 1, limit = 20): Promise<ApiResponse<{ items: unknown[]; total: number; page: number }>> {
    return this.request(`/sync/history?page=${page}&limit=${limit}`);
  }

  async startSync(): Promise<ApiResponse<{ job_id: string }>> {
    return this.request('/sync/start', { method: 'POST' });
  }

  // Cleanup
  async getCleanupRules(): Promise<ApiResponse<unknown[]>> {
    return this.request('/cleanup/rules');
  }

  async createCleanupRule(payload: {
    name: string;
    type: string;
    config: Record<string, unknown>;
    enabled: boolean;
  }): Promise<ApiResponse<unknown>> {
    return this.request('/cleanup/rules', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async deleteCleanupRule(ruleId: number): Promise<ApiResponse<void>> {
    return this.request(`/cleanup/rules/${ruleId}`, { method: 'DELETE' });
  }

  async updateCleanupRule(
    ruleId: number,
    payload: Record<string, unknown>
  ): Promise<ApiResponse<unknown>> {
    return this.request(`/cleanup/rules/${ruleId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async previewCleanupRule(ruleId: number): Promise<ApiResponse<unknown>> {
    return this.request(`/cleanup/rules/${ruleId}/preview`, { method: 'POST' });
  }

  async executeCleanupRule(ruleId: number, dangerToken: string): Promise<ApiResponse<unknown>> {
    return this.request(`/cleanup/rules/${ruleId}/execute`, {
      method: 'POST',
      headers: { 'X-Danger-Token': dangerToken },
    });
  }

  // Bookmarks
  async getBookmarks(collectionId?: number): Promise<ApiResponse<unknown[]>> {
    const param = collectionId ? `?collection_id=${collectionId}` : '';
    return this.request(`/bookmarks${param}`);
  }

  async createBookmark(payload: {
    tweet_id: string;
    collection_id?: number | null;
    notes?: string | null;
  }): Promise<ApiResponse<unknown>> {
    return this.request('/bookmarks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async deleteBookmark(bookmarkId: number): Promise<ApiResponse<void>> {
    return this.request(`/bookmarks/${bookmarkId}`, { method: 'DELETE' });
  }

  async moveBookmark(bookmarkId: number, collectionId: number | null): Promise<ApiResponse<void>> {
    return this.request(`/bookmarks/${bookmarkId}/collection`, {
      method: 'PUT',
      body: JSON.stringify({ collection_id: collectionId }),
    });
  }

  async getCollections(): Promise<ApiResponse<unknown[]>> {
    return this.request('/collections');
  }

  async createCollection(payload: {
    name: string;
    description?: string | null;
  }): Promise<ApiResponse<unknown>> {
    return this.request('/collections', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Analytics
  async getAnalyticsOverview(period: string): Promise<ApiResponse<unknown>> {
    return this.request(`/analytics/overview?period=${period}`);
  }

  async getAnalyticsTopTweets(period: string): Promise<ApiResponse<unknown>> {
    return this.request(`/analytics/top-tweets?period=${period}`);
  }
}

export const api = new ApiClient();
