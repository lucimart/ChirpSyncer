describe('ApiClient', () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it('calls /api/v1/auth/login', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { token: 'abc', user: {} } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { api } = await import('@/lib/api');
    await api.login('user', 'pass');

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/login', expect.any(Object));
  });

  it('uses custom API base URL and sets auth header when token present', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://example.com/api';
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { ok: true }, correlation_id: 'corr-1' }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { api } = await import('@/lib/api');
    api.setToken('token-123');
    await api.getDashboardStats();

    const [, options] = fetchMock.mock.calls[0];
    expect(fetchMock).toHaveBeenCalledWith('https://example.com/api/dashboard/stats', expect.any(Object));
    expect(options.headers).toMatchObject({
      Authorization: 'Bearer token-123',
    });
  });

  it('returns data payload when response is ok', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { value: 123 } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { api } = await import('@/lib/api');
    const response = await api.getDashboardStats();

    expect(response.success).toBe(true);
    expect(response.data).toEqual({ value: 123 });
  });

  it('returns error message from string response when response is not ok', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Bad request', correlation_id: 'corr-2' }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { api } = await import('@/lib/api');
    const response = await api.getDashboardStats();

    expect(response.success).toBe(false);
    expect(response.error).toBe('Bad request');
    expect(response.correlation_id).toBe('corr-2');
  });

  it('returns error message from response object when response is not ok', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'Unauthorized' } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { api } = await import('@/lib/api');
    const response = await api.getDashboardStats();

    expect(response.success).toBe(false);
    expect(response.error).toBe('Unauthorized');
  });

  it('returns HTTP status when error payload is missing', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { api } = await import('@/lib/api');
    const response = await api.getDashboardStats();

    expect(response.success).toBe(false);
    expect(response.error).toBe('HTTP 500');
  });

  it('returns network error when fetch throws', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error('Network down'));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { api } = await import('@/lib/api');
    const response = await api.getDashboardStats();

    expect(response.success).toBe(false);
    expect(response.error).toBe('Network down');
  });

  it('calls logout endpoint', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { api } = await import('@/lib/api');
    await api.logout();

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/logout', expect.objectContaining({ method: 'POST' }));
  });

  it('calls register endpoint', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 1, username: 'newuser' } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { api } = await import('@/lib/api');
    await api.register('newuser', 'test@example.com', 'password123');

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/register', expect.any(Object));
  });

  it('calls getCurrentUser endpoint', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 1, username: 'user' } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { api } = await import('@/lib/api');
    await api.getCurrentUser();

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/me', expect.any(Object));
  });

  it('calls getCredentials endpoint', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { api } = await import('@/lib/api');
    await api.getCredentials();

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/credentials', expect.any(Object));
  });

  it('calls addCredential endpoint', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 1 } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { api } = await import('@/lib/api');
    await api.addCredential({ platform: 'twitter', credential_type: 'api', credentials: { key: 'value' } });

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/credentials', expect.objectContaining({ method: 'POST' }));
  });

  it('calls deleteCredential endpoint', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { api } = await import('@/lib/api');
    await api.deleteCredential(1);

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/credentials/1', expect.objectContaining({ method: 'DELETE' }));
  });

  it('calls testCredential endpoint', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { valid: true, message: 'OK' } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { api } = await import('@/lib/api');
    await api.testCredential(1);

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/credentials/1/test', expect.objectContaining({ method: 'POST' }));
  });

  it('calls updateProfile endpoint', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 1 } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { api } = await import('@/lib/api');
    await api.updateProfile({ email: 'new@example.com' });

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/me', expect.objectContaining({ method: 'PUT' }));
  });

  it('calls changePassword endpoint', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { success: true } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { api } = await import('@/lib/api');
    await api.changePassword('oldpass', 'newpass');

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/change-password', expect.objectContaining({ method: 'POST' }));
  });
});
