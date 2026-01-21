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
});
