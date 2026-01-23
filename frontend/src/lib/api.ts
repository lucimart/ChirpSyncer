import type { ApiResponse, User, Session, DashboardStats, Credential, AdminUser } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

// Sync Preview types
export interface SyncPreviewItemData {
  id: string;
  content: string;
  sourcePlatform: 'twitter' | 'bluesky';
  targetPlatform: 'twitter' | 'bluesky';
  timestamp: string;
  hasMedia: boolean;
  mediaCount?: number;
  selected: boolean;
}

export interface SyncPreviewData {
  items: SyncPreviewItemData[];
  totalCount: number;
  estimatedTime: number;
}

class ApiClient {
  private token: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  setRefreshToken(token: string | null) {
    this.refreshToken = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retry = true
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
        const errorCode = data?.error?.code || '';
        const errorMessage =
          typeof data?.error === 'string'
            ? data.error
            : data?.error?.message || `HTTP ${response.status}`;

        // Auto-refresh on token expiration (skip for refresh endpoint itself)
        if (
          retry &&
          response.status === 401 &&
          (errorCode === 'TOKEN_EXPIRED' || errorMessage.includes('expired')) &&
          endpoint !== '/auth/refresh' &&
          this.refreshToken
        ) {
          const refreshed = await this.tryRefresh();
          if (refreshed) {
            // Retry original request with new token
            return this.request<T>(endpoint, options, false);
          }
        }

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

  private async tryRefresh(): Promise<boolean> {
    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.doRefresh();

    try {
      return await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async doRefresh(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      if (data.data?.token) {
        this.token = data.data.token;
        this.refreshToken = data.data.refresh_token;

        // Notify auth store of new tokens
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('auth:tokens-refreshed', {
              detail: { token: this.token, refreshToken: this.refreshToken },
            })
          );
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // Generic HTTP methods for external integrations
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint);
  }

  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
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

  async updateProfile(data: { email?: string; settings?: Record<string, unknown> }): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  }

  // SSO / OAuth endpoints
  async getSsoProviders(): Promise<ApiResponse<SsoProvidersResponse>> {
    return this.request('/auth/sso/providers');
  }

  async getLinkedAccounts(): Promise<ApiResponse<LinkedAccountsResponse>> {
    return this.request('/auth/sso/accounts');
  }

  async linkSsoAccount(provider: string): Promise<ApiResponse<{ auth_url: string }>> {
    return this.request(`/auth/sso/link/${provider}`, { method: 'POST' });
  }

  async unlinkSsoAccount(provider: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/auth/sso/unlink/${provider}`, { method: 'DELETE' });
  }

  // Session management
  async getSessions(): Promise<ApiResponse<SessionsResponse>> {
    return this.request('/auth/sessions');
  }

  async revokeSession(sessionId: number): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/auth/sessions/${sessionId}`, { method: 'DELETE' });
  }

  async revokeOtherSessions(refreshToken?: string): Promise<ApiResponse<{ success: boolean; revoked_count: number }>> {
    const body = refreshToken ? JSON.stringify({ refresh_token: refreshToken }) : undefined;
    return this.request('/auth/sessions/revoke-others', { method: 'POST', body });
  }

  async refreshAccessToken(tokenToRefresh?: string): Promise<ApiResponse<{ token: string; refresh_token: string }>> {
    // If refresh token provided, send it in body; otherwise rely on cookies
    const body = tokenToRefresh ? JSON.stringify({ refresh_token: tokenToRefresh }) : undefined;
    return this.request('/auth/refresh', { method: 'POST', body });
  }

  async forgotPassword(email: string): Promise<ApiResponse<{ success: boolean; message: string; dev_token?: string; dev_reset_url?: string }>> {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async validateResetToken(token: string): Promise<ApiResponse<{ valid: boolean; email: string }>> {
    return this.request('/auth/validate-reset-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<{ success: boolean; message: string }>> {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
    });
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

  async getSyncPreview(): Promise<ApiResponse<SyncPreviewData>> {
    return this.request('/sync/preview');
  }

  async executeSyncWithItems(itemIds: string[]): Promise<ApiResponse<{ job_id: string }>> {
    return this.request('/sync/execute', {
      method: 'POST',
      body: JSON.stringify({ item_ids: itemIds }),
    });
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

  // Feed Lab
  async getFeedRules(): Promise<ApiResponse<unknown[]>> {
    return this.request('/feed-rules');
  }

  async createFeedRule(payload: {
    name: string;
    type: string;
    conditions: Array<{ field: string; operator: string; value: string | number | boolean }>;
    weight?: number;
    enabled?: boolean;
  }): Promise<ApiResponse<unknown>> {
    return this.request('/feed-rules', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateFeedRule(
    ruleId: number,
    payload: Record<string, unknown>
  ): Promise<ApiResponse<unknown>> {
    return this.request(`/feed-rules/${ruleId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteFeedRule(ruleId: number): Promise<ApiResponse<void>> {
    return this.request(`/feed-rules/${ruleId}`, { method: 'DELETE' });
  }

  async toggleFeedRule(ruleId: number): Promise<ApiResponse<unknown>> {
    return this.request(`/feed-rules/${ruleId}/toggle`, { method: 'PATCH' });
  }

  async reorderFeedRules(order: number[]): Promise<ApiResponse<unknown[]>> {
    return this.request('/feed-rules/reorder', {
      method: 'POST',
      body: JSON.stringify({ order }),
    });
  }

  async previewFeed(rules: Array<Record<string, unknown>>): Promise<ApiResponse<unknown>> {
    return this.request('/feed/preview', {
      method: 'POST',
      body: JSON.stringify({ rules }),
    });
  }

  async explainFeed(postId: string): Promise<ApiResponse<unknown>> {
    return this.request(`/feed/explain/${postId}`);
  }

  // Notifications
  async getNotifications(): Promise<ApiResponse<unknown[]>> {
    return this.request('/notifications');
  }

  async markNotificationRead(notificationId: string): Promise<ApiResponse<unknown>> {
    return this.request(`/notifications/${notificationId}/read`, { method: 'PATCH' });
  }

  async markAllNotificationsRead(): Promise<ApiResponse<{ success: boolean }>> {
    return this.request('/notifications/read-all', { method: 'PATCH' });
  }

  async deleteNotification(notificationId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.request(`/notifications/${notificationId}`, { method: 'DELETE' });
  }

  // Scheduling
  async getScheduledPosts(status?: string): Promise<ApiResponse<ScheduledPost[]>> {
    const param = status ? `?status=${status}` : '';
    return this.request(`/scheduling/posts${param}`);
  }

  async createScheduledPost(payload: {
    content: string;
    scheduled_at: string;
    platform: 'twitter' | 'bluesky' | 'both';
    media?: string[];
  }): Promise<ApiResponse<ScheduledPost>> {
    return this.request('/scheduling/posts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getScheduledPost(id: string): Promise<ApiResponse<ScheduledPost>> {
    return this.request(`/scheduling/posts/${id}`);
  }

  async updateScheduledPost(
    id: string,
    payload: { content?: string; scheduled_at?: string }
  ): Promise<ApiResponse<ScheduledPost>> {
    return this.request(`/scheduling/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteScheduledPost(id: string): Promise<ApiResponse<void>> {
    return this.request(`/scheduling/posts/${id}`, { method: 'DELETE' });
  }

  async getOptimalTimes(): Promise<ApiResponse<OptimalTimeResult>> {
    return this.request('/scheduling/optimal-times');
  }

  async predictEngagement(payload: {
    content: string;
    scheduled_at?: string;
    has_media?: boolean;
  }): Promise<ApiResponse<EngagementPrediction>> {
    return this.request('/scheduling/predict', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Admin endpoints
  async getAdminUsers(params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<AdminUser[]>> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    const suffix = query ? `?${query}` : '';
    return this.request(`/admin/users${suffix}`);
  }

  async getAdminUser(id: string): Promise<ApiResponse<AdminUser>> {
    return this.request(`/admin/users/${id}`);
  }

  async updateAdminUser(
    id: string,
    payload: { email?: string; password?: string; is_active?: boolean; is_admin?: boolean }
  ): Promise<ApiResponse<AdminUser>> {
    return this.request(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteAdminUser(id: string): Promise<ApiResponse<void>> {
    return this.request(`/admin/users/${id}`, { method: 'DELETE' });
  }

  async toggleUserActive(id: string): Promise<ApiResponse<AdminUser>> {
    return this.request(`/admin/users/${id}/toggle-active`, { method: 'POST' });
  }

  async toggleUserAdmin(id: string): Promise<ApiResponse<AdminUser>> {
    return this.request(`/admin/users/${id}/toggle-admin`, { method: 'POST' });
  }

  // Search
  async searchPosts(params: {
    q?: string;
    limit?: number;
    has_media?: boolean;
    min_likes?: number;
    min_retweets?: number;
    date_from?: string;
    date_to?: string;
    platform?: 'twitter' | 'bluesky';
  }): Promise<ApiResponse<SearchApiResult>> {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.set('q', params.q);
    if (params.limit) searchParams.set('limit', String(params.limit));
    if (params.has_media !== undefined) searchParams.set('has_media', String(params.has_media));
    if (params.min_likes) searchParams.set('min_likes', String(params.min_likes));
    if (params.min_retweets) searchParams.set('min_retweets', String(params.min_retweets));
    if (params.date_from) searchParams.set('date_from', params.date_from);
    if (params.date_to) searchParams.set('date_to', params.date_to);
    if (params.platform) searchParams.set('platform', params.platform);
    const query = searchParams.toString();
    const suffix = query ? `?${query}` : '';
    return this.request(`/search${suffix}`);
  }

  async searchSuggestions(q: string, limit = 10): Promise<ApiResponse<{ suggestions: string[] }>> {
    const searchParams = new URLSearchParams();
    searchParams.set('q', q);
    searchParams.set('limit', String(limit));
    return this.request(`/search/suggestions?${searchParams.toString()}`);
  }

  // Export
  async exportData(params: {
    format: 'json' | 'csv' | 'txt';
    date_range: string;
    platform: string;
    include_media: boolean;
    include_metrics: boolean;
    include_deleted: boolean;
  }): Promise<Response> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }
    return fetch(`${API_BASE}/export`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(params),
    });
  }

  async exportPreview(params: {
    date_range: string;
    platform: string;
    include_deleted: boolean;
  }): Promise<ApiResponse<ExportPreview>> {
    return this.request('/export/preview', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Sync Config
  async getSyncConfig(): Promise<ApiResponse<{ configs: SyncConfig[] }>> {
    return this.request('/sync/config');
  }

  async saveSyncConfig(config: SyncConfig): Promise<ApiResponse<SyncConfig>> {
    return this.request('/sync/config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  // Webhooks
  async getWebhooks(): Promise<ApiResponse<{ webhooks: Webhook[]; count: number }>> {
    return this.request('/webhooks');
  }

  async getWebhook(id: number): Promise<ApiResponse<Webhook>> {
    return this.request(`/webhooks/${id}`);
  }

  async createWebhook(payload: {
    url: string;
    events: string[];
    name?: string;
  }): Promise<ApiResponse<Webhook>> {
    return this.request('/webhooks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateWebhook(
    id: number,
    payload: { url?: string; events?: string[]; name?: string; enabled?: boolean }
  ): Promise<ApiResponse<Webhook>> {
    return this.request(`/webhooks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteWebhook(id: number): Promise<ApiResponse<void>> {
    return this.request(`/webhooks/${id}`, { method: 'DELETE' });
  }

  async regenerateWebhookSecret(id: number): Promise<ApiResponse<Webhook>> {
    return this.request(`/webhooks/${id}/regenerate-secret`, { method: 'POST' });
  }

  async getWebhookDeliveries(
    id: number,
    limit = 50
  ): Promise<ApiResponse<{ deliveries: WebhookDelivery[]; count: number }>> {
    return this.request(`/webhooks/${id}/deliveries?limit=${limit}`);
  }

  async testWebhook(id: number): Promise<ApiResponse<WebhookTestResult>> {
    return this.request(`/webhooks/${id}/test`, { method: 'POST' });
  }

  async getWebhookEventTypes(): Promise<ApiResponse<{ events: string[] }>> {
    return this.request('/webhooks/events');
  }
}

// SSO types
export interface LinkedAccount {
  provider: string;
  provider_username: string | null;
  provider_email: string | null;
  linked_at: string;
}

export interface SsoProvidersResponse {
  providers: string[];
  enabled: Record<string, boolean>;
}

export interface LinkedAccountsResponse {
  accounts: LinkedAccount[];
  available_providers: string[];
}

// Active session types (user device sessions, not auth Session)
export interface ActiveSession {
  id: number;
  created_at: string | null;
  last_used_at: string | null;
  user_agent: string | null;
  ip_address: string | null;
  expires_at: string | null;
  is_current: boolean;
}

export interface SessionsResponse {
  sessions: ActiveSession[];
  count: number;
}

// Scheduling types
export interface ScheduledPost {
  id: string;
  content: string;
  scheduled_at: string;
  platform: 'twitter' | 'bluesky' | 'both';
  status: 'pending' | 'published' | 'failed' | 'cancelled';
  predicted_engagement: number;
  created_at: string;
  posted_at?: string | null;
  tweet_id?: string | null;
  error?: string | null;
}

export interface TimeSlot {
  hour: number;
  day: number;
  score: number;
  label: string;
  estimated?: boolean; // True if using default values instead of historical data
}

export interface OptimalTimeResult {
  best_times: TimeSlot[];
  timezone: string;
  based_on_posts: number;
  data_quality?: 'high' | 'medium' | 'low'; // Quality indicator based on data volume
}

export interface EngagementPrediction {
  score: number;
  confidence: number;
  based_on_posts?: number; // Number of historical posts used for prediction
  factors: {
    time_of_day: number;
    day_of_week: number;
    content_length: number;
    has_media: number;
    hashtags?: number;
    historical_performance: number;
  };
  suggested_improvements: string[];
}

// Search types
export interface SearchResultItem {
  id: string;
  content: string;
  created_at: string;
  platform: 'twitter' | 'bluesky';
  author: string;
  hashtags: string[];
  rank: number;
}

export interface SearchApiResult {
  results: SearchResultItem[];
  total: number;
  query: string;
}

// Export types
export interface ExportPreview {
  total_posts: number;
  estimated_sizes: {
    json: string;
    csv: string;
    txt: string;
  };
  sample: Array<{
    id: number;
    content: string;
    source: string;
  }>;
}

// Sync Config types
export interface SyncConfig {
  id?: number;
  platform: string;
  enabled: boolean;
  direction: 'bidirectional' | 'import_only' | 'export_only';
  sync_replies: boolean;
  sync_reposts: boolean;
  truncation_strategy: 'smart' | 'truncate' | 'skip';
  auto_hashtag: boolean;
}

// Webhook types
export interface Webhook {
  id: number;
  url: string;
  events: string[];
  name: string | null;
  enabled: boolean;
  secret?: string; // Only returned on create/regenerate
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: number;
  event_type: string;
  payload: Record<string, unknown>;
  status_code: number | null;
  success: boolean;
  error: string | null;
  attempt: number;
  created_at: string;
}

export interface WebhookTestResult {
  success: boolean;
  status_code: number | null;
  error: string | null;
  skipped: boolean;
  reason: string | null;
}

// Sync Preview types
export interface SyncPreviewItemData {
  id: string;
  content: string;
  sourcePlatform: 'twitter' | 'bluesky';
  targetPlatform: 'twitter' | 'bluesky';
  timestamp: string;
  hasMedia: boolean;
  mediaCount?: number;
  selected: boolean;
}

export interface SyncPreviewData {
  items: SyncPreviewItemData[];
  totalCount: number;
  estimatedTime: number;
}

export const api = new ApiClient();
