/**
 * Auth Store Unit Tests
 * Tests for useAuth zustand store
 */

import { act, renderHook } from '@testing-library/react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

// Mock the API module
jest.mock('@/lib/api', () => ({
  api: {
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    getCurrentUser: jest.fn(),
    setToken: jest.fn(),
    setRefreshToken: jest.fn(),
    refreshAccessToken: jest.fn(),
  },
}));

const mockApi = api as jest.Mocked<typeof api>;

describe('Auth Store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the store state before each test
    const { result } = renderHook(() => useAuth());
    act(() => {
      result.current.setUser(null);
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com', is_admin: false, created_at: '2024-01-01T00:00:00Z' };
      const mockToken = 'mock-jwt-token';

      mockApi.login.mockResolvedValue({
        success: true,
        data: { user: mockUser, token: mockToken },
      });

      const { result } = renderHook(() => useAuth());

      let loginResult: { success: boolean; error?: string };
      await act(async () => {
        loginResult = await result.current.login('testuser', 'password123');
      });

      expect(loginResult!.success).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe(mockToken);
      expect(result.current.isAuthenticated).toBe(true);
      expect(mockApi.setToken).toHaveBeenCalledWith(mockToken);
    });

    it('should handle login failure', async () => {
      mockApi.login.mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      });

      const { result } = renderHook(() => useAuth());

      let loginResult: { success: boolean; error?: string };
      await act(async () => {
        loginResult = await result.current.login('wronguser', 'wrongpass');
      });

      expect(loginResult!.success).toBe(false);
      expect(loginResult!.error).toBe('Invalid credentials');
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle login with missing data', async () => {
      mockApi.login.mockResolvedValue({
        success: true,
        data: undefined,
      });

      const { result } = renderHook(() => useAuth());

      let loginResult: { success: boolean; error?: string };
      await act(async () => {
        loginResult = await result.current.login('user', 'pass');
      });

      expect(loginResult!.success).toBe(false);
    });
  });

  describe('logout', () => {
    it('should logout and clear state', async () => {
      // First login
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com', is_admin: false, created_at: '2024-01-01T00:00:00Z' };
      mockApi.login.mockResolvedValue({
        success: true,
        data: { user: mockUser, token: 'token' },
      });
      mockApi.logout.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login('testuser', 'password');
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Then logout
      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockApi.setToken).toHaveBeenCalledWith(null);
    });
  });

  describe('register', () => {
    it('should register and auto-login on success', async () => {
      const mockUser = { id: 1, username: 'newuser', email: 'new@example.com', is_admin: false, created_at: '2024-01-01T00:00:00Z' };
      const mockToken = 'new-token';

      mockApi.register.mockResolvedValue({ success: true });
      mockApi.login.mockResolvedValue({
        success: true,
        data: { user: mockUser, token: mockToken },
      });

      const { result } = renderHook(() => useAuth());

      let registerResult: { success: boolean; error?: string };
      await act(async () => {
        registerResult = await result.current.register('newuser', 'new@example.com', 'password123');
      });

      expect(registerResult!.success).toBe(true);
      expect(mockApi.register).toHaveBeenCalledWith('newuser', 'new@example.com', 'password123');
      expect(mockApi.login).toHaveBeenCalledWith('newuser', 'password123');
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle registration failure', async () => {
      mockApi.register.mockResolvedValue({
        success: false,
        error: 'Username already exists',
      });

      const { result } = renderHook(() => useAuth());

      let registerResult: { success: boolean; error?: string };
      await act(async () => {
        registerResult = await result.current.register('existinguser', 'test@example.com', 'password');
      });

      expect(registerResult!.success).toBe(false);
      expect(registerResult!.error).toBe('Username already exists');
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('checkAuth', () => {
    it('should validate token and set user on success', async () => {
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com', is_admin: false, created_at: '2024-01-01T00:00:00Z' };

      // Set up initial state with token
      const { result } = renderHook(() => useAuth());

      // Manually set token to simulate persisted state
      mockApi.login.mockResolvedValue({
        success: true,
        data: { user: mockUser, token: 'existing-token' },
      });

      await act(async () => {
        await result.current.login('testuser', 'password');
      });

      // Now test checkAuth
      mockApi.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      await act(async () => {
        await result.current.checkAuth();
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('should clear state when token is invalid', async () => {
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com', is_admin: false, created_at: '2024-01-01T00:00:00Z' };

      const { result } = renderHook(() => useAuth());

      // Set state with token but no user (simulates persisted token without user data)
      // This forces checkAuth to verify with the API instead of early-returning
      act(() => {
        useAuth.setState({ token: 'expired-token', user: null, isAuthenticated: false, isLoading: true });
      });

      // checkAuth fails (token expired)
      mockApi.getCurrentUser.mockResolvedValue({
        success: false,
        error: 'Token expired',
      });

      await act(async () => {
        await result.current.checkAuth();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(mockApi.setToken).toHaveBeenCalledWith(null);
    });

    it('should handle no token case', async () => {
      const { result } = renderHook(() => useAuth());

      // Ensure no token
      await act(async () => {
        result.current.setUser(null);
      });

      // Reset the store completely
      act(() => {
        useAuth.setState({ token: null, user: null, isAuthenticated: false, isLoading: true });
      });

      await act(async () => {
        await result.current.checkAuth();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('setUser', () => {
    it('should set user and update isAuthenticated', () => {
      const { result } = renderHook(() => useAuth());
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com', is_admin: false, created_at: '2024-01-01T00:00:00Z' };

      act(() => {
        result.current.setUser(mockUser);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should clear user and set isAuthenticated to false', () => {
      const { result } = renderHook(() => useAuth());
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com', is_admin: false, created_at: '2024-01-01T00:00:00Z' };

      // Set user first
      act(() => {
        result.current.setUser(mockUser);
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Clear user
      act(() => {
        result.current.setUser(null);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Refresh Token', () => {
    it('should store refresh token on login', async () => {
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com', is_admin: false, created_at: '2024-01-01T00:00:00Z' };
      const mockToken = 'mock-jwt-token';
      const mockRefreshToken = 'mock-refresh-token';

      mockApi.login.mockResolvedValue({
        success: true,
        data: { user: mockUser, token: mockToken, refresh_token: mockRefreshToken },
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login('testuser', 'password123');
      });

      expect(result.current.refreshToken).toBe(mockRefreshToken);
      expect(mockApi.setRefreshToken).toHaveBeenCalledWith(mockRefreshToken);
    });

    it('should clear refresh token on logout', async () => {
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com', is_admin: false, created_at: '2024-01-01T00:00:00Z' };

      mockApi.login.mockResolvedValue({
        success: true,
        data: { user: mockUser, token: 'token', refresh_token: 'refresh' },
      });
      mockApi.logout.mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login('testuser', 'password');
      });

      expect(result.current.refreshToken).toBe('refresh');

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.refreshToken).toBeNull();
      expect(mockApi.setRefreshToken).toHaveBeenCalledWith(null);
    });

    it('should refresh access token successfully', async () => {
      const mockUser = { id: 1, username: 'testuser', email: 'test@example.com', is_admin: false, created_at: '2024-01-01T00:00:00Z' };
      const newToken = 'new-access-token';
      const newRefreshToken = 'new-refresh-token';

      // Set initial state with refresh token
      act(() => {
        useAuth.setState({
          token: 'old-token',
          refreshToken: 'old-refresh-token',
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      });

      mockApi.refreshAccessToken.mockResolvedValue({
        success: true,
        data: { token: newToken, refresh_token: newRefreshToken },
      });
      mockApi.getCurrentUser.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const { result } = renderHook(() => useAuth());

      let refreshResult: boolean;
      await act(async () => {
        refreshResult = await result.current.refreshAccessToken();
      });

      expect(refreshResult!).toBe(true);
      expect(result.current.token).toBe(newToken);
      expect(result.current.refreshToken).toBe(newRefreshToken);
      expect(mockApi.setToken).toHaveBeenCalledWith(newToken);
      expect(mockApi.setRefreshToken).toHaveBeenCalledWith(newRefreshToken);
    });

    it('should return false when refresh fails', async () => {
      act(() => {
        useAuth.setState({
          token: 'old-token',
          refreshToken: 'old-refresh-token',
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      });

      mockApi.refreshAccessToken.mockResolvedValue({
        success: false,
        error: 'Token expired',
      });

      const { result } = renderHook(() => useAuth());

      let refreshResult: boolean;
      await act(async () => {
        refreshResult = await result.current.refreshAccessToken();
      });

      expect(refreshResult!).toBe(false);
      expect(result.current.token).toBeNull();
      expect(result.current.refreshToken).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should return false when no refresh token available', async () => {
      act(() => {
        useAuth.setState({
          token: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      });

      const { result } = renderHook(() => useAuth());

      let refreshResult: boolean;
      await act(async () => {
        refreshResult = await result.current.refreshAccessToken();
      });

      expect(refreshResult!).toBe(false);
      expect(mockApi.refreshAccessToken).not.toHaveBeenCalled();
    });

    it('should set token with refresh token via setToken', () => {
      const { result } = renderHook(() => useAuth());

      // Mock checkAuth to avoid API calls
      mockApi.getCurrentUser.mockResolvedValue({ success: true, data: { id: 1, username: 'test', email: 'test@test.com', is_admin: false, created_at: '2024-01-01' } });

      act(() => {
        result.current.setToken('access-token', 'refresh-token');
      });

      expect(result.current.token).toBe('access-token');
      expect(result.current.refreshToken).toBe('refresh-token');
      expect(mockApi.setToken).toHaveBeenCalledWith('access-token');
      expect(mockApi.setRefreshToken).toHaveBeenCalledWith('refresh-token');
    });
  });
});
