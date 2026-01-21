// User types
export interface User {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  created_at: string;
}

// Extended user type for admin management
export interface AdminUser {
  id: string;
  username: string;
  email: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  last_login: string | null;
}

export interface Session {
  token: string;
  user: User;
}

// Credential types
export interface Credential {
  id: number;
  platform: 'twitter' | 'bluesky';
  credential_type: 'scraping' | 'api' | 'oauth';
  is_active: boolean;
  created_at: string;
  last_used: string | null;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  correlation_id?: string;
}

// Dashboard stats
export interface DashboardStats {
  synced_today: number;
  synced_week: number;
  total_synced: number;
  platforms_connected: number;
  last_sync_at: string | null;
  next_sync_at: string | null;
  storage_used_mb: number;
  tweets_archived: number;
}

// Cleanup types
export interface CleanupRule {
  id: number;
  user_id: number;
  rule_type: 'age' | 'engagement' | 'pattern';
  name: string;
  config: Record<string, unknown>;
  is_enabled: boolean;
  created_at: string;
  last_run: string | null;
  total_deleted: number;
}

// Search types
export interface SearchResult {
  id: string;
  content: string;
  created_at: string;
  platform: string;
  likes: number;
  retweets: number;
  has_media: boolean;
  highlight?: string;
}

export interface SearchFilters {
  has_media?: boolean;
  min_likes?: number;
  min_retweets?: number;
  date_from?: string;
  date_to?: string;
  platform?: string;
}
