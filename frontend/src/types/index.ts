// User types
export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
}

export interface Session {
  token: string;
  user: User;
  expires_at: string;
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
  total_synced: number;
  pending_sync: number;
  last_sync: string | null;
  credentials_count: number;
  scheduled_count: number;
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
