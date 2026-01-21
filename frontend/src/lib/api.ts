import type { ApiResponse, User, Session, DashboardStats, Credential } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

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
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
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
}

export const api = new ApiClient();
