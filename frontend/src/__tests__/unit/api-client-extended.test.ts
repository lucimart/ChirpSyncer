/**
 * Extended API Client Tests
 * Tests for all uncovered API methods to reach 85% coverage
 */

describe('ApiClient - Extended Coverage', () => {
  beforeEach(() => {
    jest.resetModules();
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  // Sync endpoints
  describe('Sync endpoints', () => {
    it('calls getSyncStats endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { today: 5, week: 20, total: 100, last_sync: '2024-01-01' } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      const result = await api.getSyncStats();

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/sync/stats', expect.any(Object));
      expect(result.success).toBe(true);
    });

    it('calls getSyncHistory endpoint with pagination', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { items: [], total: 0, page: 1 } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.getSyncHistory(2, 50);

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/sync/history?page=2&limit=50', expect.any(Object));
    });

    it('calls startSync endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { job_id: 'job-123' } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.startSync();

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/sync/start', expect.objectContaining({ method: 'POST' }));
    });
  });

  // Cleanup endpoints
  describe('Cleanup endpoints', () => {
    it('calls getCleanupRules endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.getCleanupRules();

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/cleanup/rules', expect.any(Object));
    });

    it('calls createCleanupRule endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.createCleanupRule({
        name: 'Test Rule',
        type: 'age',
        config: { days_old: 30 },
        enabled: true,
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/cleanup/rules', expect.objectContaining({ method: 'POST' }));
    });

    it('calls deleteCleanupRule endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.deleteCleanupRule(1);

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/cleanup/rules/1', expect.objectContaining({ method: 'DELETE' }));
    });

    it('calls updateCleanupRule endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.updateCleanupRule(1, { enabled: false });

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/cleanup/rules/1', expect.objectContaining({ method: 'PUT' }));
    });

    it('calls previewCleanupRule endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { count: 10 } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.previewCleanupRule(1);

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/cleanup/rules/1/preview', expect.objectContaining({ method: 'POST' }));
    });

    it('calls executeCleanupRule endpoint with danger token', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { deleted: 5 } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.executeCleanupRule(1, 'danger-token-123');

      const [, options] = fetchMock.mock.calls[0];
      expect(fetchMock).toHaveBeenCalledWith('/api/v1/cleanup/rules/1/execute', expect.objectContaining({ method: 'POST' }));
      expect(options.headers).toMatchObject({ 'X-Danger-Token': 'danger-token-123' });
    });
  });

  // Bookmarks endpoints
  describe('Bookmarks endpoints', () => {
    it('calls getBookmarks endpoint without collection', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.getBookmarks();

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/bookmarks', expect.any(Object));
    });

    it('calls getBookmarks endpoint with collection', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.getBookmarks(5);

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/bookmarks?collection_id=5', expect.any(Object));
    });

    it('calls createBookmark endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.createBookmark({ tweet_id: 'tweet-123', collection_id: 1, notes: 'Test note' });

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/bookmarks', expect.objectContaining({ method: 'POST' }));
    });

    it('calls deleteBookmark endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.deleteBookmark(1);

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/bookmarks/1', expect.objectContaining({ method: 'DELETE' }));
    });

    it('calls moveBookmark endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.moveBookmark(1, 2);

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/bookmarks/1/collection', expect.objectContaining({ method: 'PUT' }));
    });

    it('calls getCollections endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.getCollections();

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/collections', expect.any(Object));
    });

    it('calls createCollection endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.createCollection({ name: 'Test Collection', description: 'A test' });

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/collections', expect.objectContaining({ method: 'POST' }));
    });
  });

  // Analytics endpoints
  describe('Analytics endpoints', () => {
    it('calls getAnalyticsOverview endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: {} }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.getAnalyticsOverview('7d');

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/analytics/overview?period=7d', expect.any(Object));
    });

    it('calls getAnalyticsTopTweets endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.getAnalyticsTopTweets('30d');

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/analytics/top-tweets?period=30d', expect.any(Object));
    });
  });

  // Feed Lab endpoints
  describe('Feed Lab endpoints', () => {
    it('calls getFeedRules endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.getFeedRules();

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/feed-rules', expect.any(Object));
    });

    it('calls createFeedRule endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.createFeedRule({
        name: 'Test Rule',
        type: 'boost',
        conditions: [{ field: 'likes', operator: 'gt', value: 100 }],
        weight: 1.5,
        enabled: true,
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/feed-rules', expect.objectContaining({ method: 'POST' }));
    });

    it('calls updateFeedRule endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.updateFeedRule(1, { enabled: false });

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/feed-rules/1', expect.objectContaining({ method: 'PUT' }));
    });

    it('calls deleteFeedRule endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.deleteFeedRule(1);

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/feed-rules/1', expect.objectContaining({ method: 'DELETE' }));
    });

    it('calls toggleFeedRule endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 1, enabled: true } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.toggleFeedRule(1);

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/feed-rules/1/toggle', expect.objectContaining({ method: 'PATCH' }));
    });

    it('calls previewFeed endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.previewFeed([{ id: 1, enabled: true }]);

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/feed/preview', expect.objectContaining({ method: 'POST' }));
    });

    it('calls explainFeed endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { explanation: 'test' } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.explainFeed('post-123');

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/feed/explain/post-123', expect.any(Object));
    });
  });

  // Scheduling endpoints
  describe('Scheduling endpoints', () => {
    it('calls getScheduledPosts endpoint without status', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.getScheduledPosts();

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/scheduling/posts', expect.any(Object));
    });

    it('calls getScheduledPosts endpoint with status', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.getScheduledPosts('pending');

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/scheduling/posts?status=pending', expect.any(Object));
    });

    it('calls createScheduledPost endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: '1' } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.createScheduledPost({
        content: 'Test post',
        scheduled_at: '2024-01-01T12:00:00Z',
        platform: 'twitter',
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/scheduling/posts', expect.objectContaining({ method: 'POST' }));
    });

    it('calls getScheduledPost endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: '1' } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.getScheduledPost('1');

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/scheduling/posts/1', expect.any(Object));
    });

    it('calls updateScheduledPost endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: '1' } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.updateScheduledPost('1', { content: 'Updated content' });

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/scheduling/posts/1', expect.objectContaining({ method: 'PUT' }));
    });

    it('calls deleteScheduledPost endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.deleteScheduledPost('1');

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/scheduling/posts/1', expect.objectContaining({ method: 'DELETE' }));
    });

    it('calls getOptimalTimes endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { best_times: [], timezone: 'UTC', based_on_posts: 0 } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.getOptimalTimes();

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/scheduling/optimal-times', expect.any(Object));
    });

    it('calls predictEngagement endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { score: 0.8, confidence: 0.7, factors: {} } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.predictEngagement({ content: 'Test', has_media: true });

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/scheduling/predict', expect.objectContaining({ method: 'POST' }));
    });
  });

  // Admin endpoints
  describe('Admin endpoints', () => {
    it('calls getAdminUsers endpoint without params', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.getAdminUsers();

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/admin/users', expect.any(Object));
    });

    it('calls getAdminUsers endpoint with params', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.getAdminUsers({ search: 'test', page: 2, limit: 10 });

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/admin/users?search=test&page=2&limit=10', expect.any(Object));
    });

    it('calls getAdminUser endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: '1' } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.getAdminUser('1');

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/admin/users/1', expect.any(Object));
    });

    it('calls updateAdminUser endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: '1' } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.updateAdminUser('1', { is_active: false });

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/admin/users/1', expect.objectContaining({ method: 'PUT' }));
    });

    it('calls deleteAdminUser endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.deleteAdminUser('1');

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/admin/users/1', expect.objectContaining({ method: 'DELETE' }));
    });

    it('calls toggleUserActive endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: '1', is_active: true } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.toggleUserActive('1');

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/admin/users/1/toggle-active', expect.objectContaining({ method: 'POST' }));
    });

    it('calls toggleUserAdmin endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: '1', is_admin: true } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.toggleUserAdmin('1');

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/admin/users/1/toggle-admin', expect.objectContaining({ method: 'POST' }));
    });
  });

  // Search endpoints
  describe('Search endpoints', () => {
    it('calls searchPosts endpoint with all params', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { results: [], total: 0, query: 'test' } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.searchPosts({
        q: 'test',
        limit: 20,
        has_media: true,
        min_likes: 10,
        min_retweets: 5,
        date_from: '2024-01-01',
        date_to: '2024-12-31',
        platform: 'twitter',
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/search?'),
        expect.any(Object)
      );
    });

    it('calls searchSuggestions endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { suggestions: ['test1', 'test2'] } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.searchSuggestions('test', 5);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/search/suggestions?'),
        expect.any(Object)
      );
    });
  });

  // Export endpoints
  describe('Export endpoints', () => {
    it('calls exportData endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['data']),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.exportData({
        format: 'json',
        date_range: '7d',
        platform: 'all',
        include_media: true,
        include_metrics: true,
        include_deleted: false,
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/export', expect.objectContaining({ method: 'POST' }));
    });

    it('calls exportData endpoint with token', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['data']),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      api.setToken('test-token');
      await api.exportData({
        format: 'csv',
        date_range: '30d',
        platform: 'twitter',
        include_media: false,
        include_metrics: false,
        include_deleted: true,
      });

      const [, options] = fetchMock.mock.calls[0];
      expect(options.headers).toMatchObject({ Authorization: 'Bearer test-token' });
    });

    it('calls exportPreview endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { total_posts: 100, estimated_sizes: {}, sample: [] } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.exportPreview({
        date_range: '7d',
        platform: 'all',
        include_deleted: false,
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/export/preview', expect.objectContaining({ method: 'POST' }));
    });
  });

  // Sync Config endpoints
  describe('Sync Config endpoints', () => {
    it('calls getSyncConfig endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { configs: [] } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.getSyncConfig();

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/sync/config', expect.any(Object));
    });

    it('calls saveSyncConfig endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.saveSyncConfig({
        platform: 'twitter',
        enabled: true,
        direction: 'bidirectional',
        sync_replies: true,
        sync_reposts: false,
        truncation_strategy: 'smart',
        auto_hashtag: true,
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/sync/config', expect.objectContaining({ method: 'POST' }));
    });
  });

  // Webhook endpoints
  describe('Webhook endpoints', () => {
    it('calls getWebhooks endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { webhooks: [], count: 0 } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.getWebhooks();

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/webhooks', expect.any(Object));
    });

    it('calls getWebhook endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.getWebhook(1);

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/webhooks/1', expect.any(Object));
    });

    it('calls createWebhook endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 1, secret: 'secret-123' } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.createWebhook({
        url: 'https://example.com/webhook',
        events: ['sync.complete'],
        name: 'Test Webhook',
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/webhooks', expect.objectContaining({ method: 'POST' }));
    });

    it('calls updateWebhook endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 1 } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.updateWebhook(1, { enabled: false });

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/webhooks/1', expect.objectContaining({ method: 'PUT' }));
    });

    it('calls deleteWebhook endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.deleteWebhook(1);

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/webhooks/1', expect.objectContaining({ method: 'DELETE' }));
    });

    it('calls regenerateWebhookSecret endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { id: 1, secret: 'new-secret' } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.regenerateWebhookSecret(1);

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/webhooks/1/regenerate-secret', expect.objectContaining({ method: 'POST' }));
    });

    it('calls getWebhookDeliveries endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { deliveries: [], count: 0 } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.getWebhookDeliveries(1, 100);

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/webhooks/1/deliveries?limit=100', expect.any(Object));
    });

    it('calls testWebhook endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { success: true, status_code: 200 } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.testWebhook(1);

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/webhooks/1/test', expect.objectContaining({ method: 'POST' }));
    });

    it('calls getWebhookEventTypes endpoint', async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { events: ['sync.complete', 'cleanup.complete'] } }),
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      const { api } = await import('@/lib/api');
      await api.getWebhookEventTypes();

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/webhooks/events', expect.any(Object));
    });
  });
});
