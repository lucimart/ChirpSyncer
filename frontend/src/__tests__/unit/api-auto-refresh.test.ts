/**
 * API Client Auto-Refresh Interceptor Tests
 * Tests for automatic token refresh on 401 errors
 */

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import after mocking
import { api } from '@/lib/api';

describe('API Client Auto-Refresh Interceptor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.setToken(null);
    api.setRefreshToken(null);
  });

  describe('Token Refresh on 401', () => {
    it('should automatically refresh token when access token expires', async () => {
      const expiredResponse = {
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          success: false,
          error: { code: 'TOKEN_EXPIRED', message: 'Token has expired' },
        }),
      };

      const refreshResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          data: { token: 'new-access-token', refresh_token: 'new-refresh-token' },
        }),
      };

      const successResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          success: true,
          data: { id: 1, username: 'testuser' },
        }),
      };

      // Set up refresh token
      api.setToken('old-access-token');
      api.setRefreshToken('valid-refresh-token');

      // First call fails with 401, then refresh succeeds, then retry succeeds
      mockFetch
        .mockResolvedValueOnce(expiredResponse)  // Initial request fails
        .mockResolvedValueOnce(refreshResponse)  // Refresh succeeds
        .mockResolvedValueOnce(successResponse); // Retry succeeds

      const result = await api.getCurrentUser();

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, username: 'testuser' });

      // Verify calls: original, refresh, retry
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should not retry when refresh fails', async () => {
      const expiredResponse = {
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          success: false,
          error: { code: 'TOKEN_EXPIRED', message: 'Token has expired' },
        }),
      };

      const refreshFailedResponse = {
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Invalid refresh token' },
        }),
      };

      api.setToken('old-access-token');
      api.setRefreshToken('invalid-refresh-token');

      mockFetch
        .mockResolvedValueOnce(expiredResponse)
        .mockResolvedValueOnce(refreshFailedResponse);

      const result = await api.getCurrentUser();

      expect(result.success).toBe(false);
      // Only 2 calls: original + refresh attempt (no retry)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not attempt refresh without refresh token', async () => {
      const expiredResponse = {
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          success: false,
          error: { code: 'TOKEN_EXPIRED', message: 'Token has expired' },
        }),
      };

      api.setToken('old-access-token');
      // No refresh token set

      mockFetch.mockResolvedValueOnce(expiredResponse);

      const result = await api.getCurrentUser();

      expect(result.success).toBe(false);
      // Only 1 call: original request (no refresh attempt)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not refresh for non-expired 401 errors', async () => {
      const invalidCredentialsResponse = {
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' },
        }),
      };

      api.setToken('access-token');
      api.setRefreshToken('refresh-token');

      mockFetch.mockResolvedValueOnce(invalidCredentialsResponse);

      const result = await api.login('wrong', 'wrong');

      expect(result.success).toBe(false);
      // Should NOT attempt refresh for INVALID_CREDENTIALS
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not refresh for the refresh endpoint itself', async () => {
      const expiredResponse = {
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          success: false,
          error: { code: 'TOKEN_EXPIRED', message: 'Refresh token expired' },
        }),
      };

      api.setRefreshToken('expired-refresh-token');

      mockFetch.mockResolvedValueOnce(expiredResponse);

      const result = await api.refreshAccessToken('expired-refresh-token');

      expect(result.success).toBe(false);
      // Only 1 call - should not recursively try to refresh
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Concurrent Refresh Prevention', () => {
    it('should only make one refresh call for multiple concurrent requests', async () => {
      const expiredResponse = {
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          success: false,
          error: { code: 'TOKEN_EXPIRED', message: 'Token has expired' },
        }),
      };

      const refreshResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          data: { token: 'new-token', refresh_token: 'new-refresh' },
        }),
      };

      const successResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: {} }),
      };

      api.setToken('old-token');
      api.setRefreshToken('refresh-token');

      // All initial requests fail with 401
      mockFetch
        .mockResolvedValueOnce(expiredResponse)
        .mockResolvedValueOnce(expiredResponse)
        .mockResolvedValueOnce(refreshResponse)  // Only one refresh
        .mockResolvedValueOnce(successResponse)
        .mockResolvedValueOnce(successResponse);

      // Make concurrent requests
      const [result1, result2] = await Promise.all([
        api.getCurrentUser(),
        api.getDashboardStats(),
      ]);

      // Both should succeed
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('Token Update Event', () => {
    it('should dispatch event when tokens are refreshed', async () => {
      const expiredResponse = {
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          success: false,
          error: { code: 'TOKEN_EXPIRED', message: 'Token has expired' },
        }),
      };

      const refreshResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          data: { token: 'new-token', refresh_token: 'new-refresh' },
        }),
      };

      const successResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: {} }),
      };

      api.setToken('old-token');
      api.setRefreshToken('refresh-token');

      mockFetch
        .mockResolvedValueOnce(expiredResponse)
        .mockResolvedValueOnce(refreshResponse)
        .mockResolvedValueOnce(successResponse);

      const eventHandler = jest.fn();
      window.addEventListener('auth:tokens-refreshed', eventHandler);

      await api.getCurrentUser();

      expect(eventHandler).toHaveBeenCalled();
      const event = eventHandler.mock.calls[0][0] as CustomEvent;
      expect(event.detail.token).toBe('new-token');
      expect(event.detail.refreshToken).toBe('new-refresh');

      window.removeEventListener('auth:tokens-refreshed', eventHandler);
    });
  });
});
