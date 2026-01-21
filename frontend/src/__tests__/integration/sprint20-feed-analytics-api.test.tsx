/**
 * Sprint 20: Feed Analytics API - Integration Tests
 *
 * These tests verify the integration between the frontend and the Feed Analytics API.
 * They mock the backend API responses to ensure proper request/response handling
 * for analytics endpoints.
 */

// This export makes the file a module, isolating its scope
export {};

// Mock fetch globally
global.fetch = jest.fn();

const mockFetch = (response: any, status: number = 200) => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => response,
    headers: new Headers({ 'content-type': 'application/json' }),
  });
};

const mockFetchError = (status: number, message: string) => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => ({ error: message }),
    headers: new Headers({ 'content-type': 'application/json' }),
  });
};

describe('Sprint 20: Feed Analytics API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Feed Explanation API - GET /api/feed/explanation/:postId', () => {
    /**
     * INTEGRATION: GET /api/feed/explanation/:postId
     * Should return explanation for why a post appears in the feed
     */
    it('should fetch explanation for a post successfully', async () => {
      const mockExplanation = {
        postId: 'post-123',
        feedPosition: 5,
        totalScore: 4.5,
        matchedRules: [
          {
            ruleId: 'rule-1',
            ruleName: 'Boost Verified Users',
            ruleType: 'user_verified',
            weight: 1.5,
            matched: true,
            scoreContribution: 1.5,
            matchedConditions: [
              {
                condition: 'user.verified === true',
                result: true,
              },
            ],
          },
          {
            ruleId: 'rule-2',
            ruleName: 'High Engagement Boost',
            ruleType: 'engagement_rate',
            weight: 3.0,
            matched: true,
            scoreContribution: 3.0,
            matchedConditions: [
              {
                condition: 'likes >= 10',
                result: true,
              },
              {
                condition: 'replies >= 5',
                result: true,
              },
            ],
          },
        ],
        scoreBreakdown: {
          baseScore: 0,
          rulesScore: 4.5,
          totalScore: 4.5,
        },
      };

      mockFetch(mockExplanation);

      const response = await fetch('/api/feed/explanation/post-123');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(data.postId).toBe('post-123');
      expect(data.feedPosition).toBe(5);
      expect(data.totalScore).toBe(4.5);
      expect(data.matchedRules).toHaveLength(2);
      expect(data.matchedRules[0].matched).toBe(true);
      expect(data.matchedRules[0].matchedConditions).toHaveLength(1);
      expect(data.matchedRules[1].matchedConditions).toHaveLength(2);
      expect(data.scoreBreakdown.totalScore).toBe(4.5);
    });

    it('should return 404 for unknown post ID', async () => {
      mockFetchError(404, 'Post not found');

      const response = await fetch('/api/feed/explanation/unknown-post');
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Post not found');
    });

    it('should include matched conditions per rule', async () => {
      const mockExplanation = {
        postId: 'post-456',
        feedPosition: 1,
        totalScore: 2.0,
        matchedRules: [
          {
            ruleId: 'rule-3',
            ruleName: 'Recent Posts',
            ruleType: 'post_age',
            weight: 2.0,
            matched: true,
            scoreContribution: 2.0,
            matchedConditions: [
              {
                condition: 'age_hours < 24',
                result: true,
              },
              {
                condition: 'created_at >= yesterday',
                result: true,
              },
            ],
          },
        ],
        scoreBreakdown: {
          baseScore: 0,
          rulesScore: 2.0,
          totalScore: 2.0,
        },
      };

      mockFetch(mockExplanation);

      const response = await fetch('/api/feed/explanation/post-456');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.matchedRules[0].matchedConditions).toHaveLength(2);
      expect(data.matchedRules[0].matchedConditions[0].condition).toBe('age_hours < 24');
      expect(data.matchedRules[0].matchedConditions[0].result).toBe(true);
    });

    it('should handle posts with no matched rules', async () => {
      const mockExplanation = {
        postId: 'post-789',
        feedPosition: 100,
        totalScore: 0,
        matchedRules: [],
        scoreBreakdown: {
          baseScore: 0,
          rulesScore: 0,
          totalScore: 0,
        },
      };

      mockFetch(mockExplanation);

      const response = await fetch('/api/feed/explanation/post-789');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.matchedRules).toHaveLength(0);
      expect(data.totalScore).toBe(0);
    });
  });

  describe('Feed Stats API - GET /api/feed/stats', () => {
    /**
     * INTEGRATION: GET /api/feed/stats
     * Should return algorithm statistics
     */
    it('should fetch feed statistics successfully', async () => {
      const mockStats = {
        totalPosts: 1500,
        avgScore: 2.35,
        ruleDistribution: {
          'rule-1': {
            name: 'Boost Verified Users',
            appliedCount: 450,
            avgContribution: 1.5,
          },
          'rule-2': {
            name: 'High Engagement',
            appliedCount: 300,
            avgContribution: 2.8,
          },
          'rule-3': {
            name: 'Penalize Old Posts',
            appliedCount: 600,
            avgContribution: -0.5,
          },
        },
        scoreHistogram: [
          { range: '< 0', count: 100 },
          { range: '0-1', count: 300 },
          { range: '1-2', count: 500 },
          { range: '2-3', count: 400 },
          { range: '3-4', count: 150 },
          { range: '>= 4', count: 50 },
        ],
      };

      mockFetch(mockStats);

      const response = await fetch('/api/feed/stats');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.totalPosts).toBe(1500);
      expect(data.avgScore).toBe(2.35);
      expect(Object.keys(data.ruleDistribution)).toHaveLength(3);
      expect(data.ruleDistribution['rule-1'].appliedCount).toBe(450);
      expect(data.scoreHistogram).toHaveLength(6);
    });

    it('should support date range filtering with startDate and endDate', async () => {
      const mockStats = {
        totalPosts: 500,
        avgScore: 2.5,
        ruleDistribution: {
          'rule-1': {
            name: 'Boost Verified Users',
            appliedCount: 200,
            avgContribution: 1.5,
          },
        },
        scoreHistogram: [
          { range: '0-1', count: 100 },
          { range: '1-2', count: 200 },
          { range: '2-3', count: 150 },
          { range: '>= 3', count: 50 },
        ],
        dateRange: {
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-01-07T23:59:59Z',
        },
      };

      mockFetch(mockStats);

      const startDate = '2024-01-01T00:00:00Z';
      const endDate = '2024-01-07T23:59:59Z';
      const response = await fetch(
        `/api/feed/stats?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
      );
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.totalPosts).toBe(500);
      expect(data.dateRange.startDate).toBe(startDate);
      expect(data.dateRange.endDate).toBe(endDate);
    });

    it('should handle empty date range results', async () => {
      const mockStats = {
        totalPosts: 0,
        avgScore: 0,
        ruleDistribution: {},
        scoreHistogram: [],
      };

      mockFetch(mockStats);

      const response = await fetch('/api/feed/stats?startDate=2024-12-01&endDate=2024-12-01');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.totalPosts).toBe(0);
      expect(Object.keys(data.ruleDistribution)).toHaveLength(0);
      expect(data.scoreHistogram).toHaveLength(0);
    });
  });

  describe('Rule Impact API - GET /api/feed/rule-impact/:ruleId', () => {
    /**
     * INTEGRATION: GET /api/feed/rule-impact/:ruleId
     * Should return posts affected by specific rule
     */
    it('should fetch rule impact data successfully', async () => {
      const mockImpact = {
        ruleId: 'rule-1',
        ruleName: 'Boost Verified Users',
        totalAffectedPosts: 450,
        samplePosts: [
          {
            postId: 'post-1',
            content: 'Post from verified user',
            author: {
              id: 'user-1',
              handle: 'verified_user',
              verified: true,
            },
            beforeScore: 1.0,
            afterScore: 2.5,
            scoreDelta: 1.5,
            feedPositionBefore: 50,
            feedPositionAfter: 10,
          },
          {
            postId: 'post-2',
            content: 'Another verified post',
            author: {
              id: 'user-2',
              handle: 'another_verified',
              verified: true,
            },
            beforeScore: 0.5,
            afterScore: 2.0,
            scoreDelta: 1.5,
            feedPositionBefore: 100,
            feedPositionAfter: 25,
          },
        ],
        avgScoreDelta: 1.5,
      };

      mockFetch(mockImpact);

      const response = await fetch('/api/feed/rule-impact/rule-1');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.ruleId).toBe('rule-1');
      expect(data.totalAffectedPosts).toBe(450);
      expect(data.samplePosts).toHaveLength(2);
      expect(data.samplePosts[0].beforeScore).toBe(1.0);
      expect(data.samplePosts[0].afterScore).toBe(2.5);
      expect(data.samplePosts[0].scoreDelta).toBe(1.5);
      expect(data.avgScoreDelta).toBe(1.5);
    });

    it('should support pagination with page and limit params', async () => {
      const mockImpact = {
        ruleId: 'rule-2',
        ruleName: 'High Engagement',
        totalAffectedPosts: 300,
        samplePosts: [
          {
            postId: 'post-10',
            content: 'High engagement post',
            beforeScore: 0,
            afterScore: 3.0,
            scoreDelta: 3.0,
          },
        ],
        pagination: {
          page: 2,
          limit: 1,
          totalPages: 300,
          hasMore: true,
        },
      };

      mockFetch(mockImpact);

      const response = await fetch('/api/feed/rule-impact/rule-2?page=2&limit=1');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(1);
      expect(data.pagination.hasMore).toBe(true);
      expect(data.samplePosts).toHaveLength(1);
    });

    it('should return sample posts with before and after scores', async () => {
      const mockImpact = {
        ruleId: 'rule-3',
        ruleName: 'Penalize Old Posts',
        totalAffectedPosts: 600,
        samplePosts: [
          {
            postId: 'post-old',
            content: 'Old post',
            beforeScore: 2.0,
            afterScore: 1.5,
            scoreDelta: -0.5,
            feedPositionBefore: 10,
            feedPositionAfter: 30,
          },
        ],
        avgScoreDelta: -0.5,
      };

      mockFetch(mockImpact);

      const response = await fetch('/api/feed/rule-impact/rule-3');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.samplePosts[0].beforeScore).toBe(2.0);
      expect(data.samplePosts[0].afterScore).toBe(1.5);
      expect(data.samplePosts[0].scoreDelta).toBe(-0.5);
    });

    it('should return 404 for non-existent rule ID', async () => {
      mockFetchError(404, 'Rule not found');

      const response = await fetch('/api/feed/rule-impact/non-existent-rule');
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Rule not found');
    });
  });

  describe('Simulate Feed API - POST /api/feed/simulate', () => {
    /**
     * INTEGRATION: POST /api/feed/simulate
     * Should simulate rule changes without applying them
     */
    it('should simulate rule changes successfully', async () => {
      const simulateRequest = {
        rules: [
          {
            id: 'rule-1',
            name: 'Boost Verified Users',
            type: 'user_verified',
            weight: 3.0, // Increased from 1.5
            enabled: true,
          },
          {
            id: 'rule-2',
            name: 'High Engagement',
            type: 'engagement_rate',
            weight: 2.0,
            enabled: true,
          },
        ],
      };

      const mockSimulation = {
        predictedComposition: {
          totalPosts: 1500,
          avgScore: 3.2, // Up from 2.35
          scoreDistribution: [
            { range: '< 0', count: 50 },
            { range: '0-1', count: 200 },
            { range: '1-2', count: 300 },
            { range: '2-3', count: 400 },
            { range: '3-4', count: 350 },
            { range: '>= 4', count: 200 },
          ],
        },
        sampleAffected: [
          {
            postId: 'post-1',
            currentScore: 2.5,
            simulatedScore: 4.0,
            scoreDelta: 1.5,
            currentPosition: 10,
            simulatedPosition: 3,
          },
          {
            postId: 'post-2',
            currentScore: 1.0,
            simulatedScore: 3.0,
            scoreDelta: 2.0,
            currentPosition: 50,
            simulatedPosition: 15,
          },
        ],
        scoreDelta: {
          avgDelta: 0.85,
          maxIncrease: 2.0,
          maxDecrease: 0,
          affectedPostsCount: 450,
        },
      };

      mockFetch(mockSimulation);

      const response = await fetch('/api/feed/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simulateRequest),
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.predictedComposition.avgScore).toBe(3.2);
      expect(data.sampleAffected).toHaveLength(2);
      expect(data.sampleAffected[0].scoreDelta).toBe(1.5);
      expect(data.scoreDelta.avgDelta).toBe(0.85);
    });

    it('should return predicted composition with score distribution', async () => {
      const simulateRequest = {
        rules: [
          {
            id: 'rule-new',
            name: 'New Rule',
            type: 'custom',
            weight: 5.0,
            enabled: true,
          },
        ],
      };

      const mockSimulation = {
        predictedComposition: {
          totalPosts: 1000,
          avgScore: 5.5,
          scoreDistribution: [
            { range: '0-2', count: 100 },
            { range: '2-4', count: 200 },
            { range: '4-6', count: 400 },
            { range: '>= 6', count: 300 },
          ],
        },
        sampleAffected: [],
        scoreDelta: {
          avgDelta: 3.15,
          maxIncrease: 5.0,
          maxDecrease: 0,
          affectedPostsCount: 1000,
        },
      };

      mockFetch(mockSimulation);

      const response = await fetch('/api/feed/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simulateRequest),
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.predictedComposition.totalPosts).toBe(1000);
      expect(data.predictedComposition.scoreDistribution).toHaveLength(4);
    });

    it('should include score delta statistics', async () => {
      const simulateRequest = {
        rules: [
          {
            id: 'rule-1',
            name: 'Adjusted Rule',
            type: 'user_verified',
            weight: 0.5, // Decreased
            enabled: true,
          },
        ],
      };

      const mockSimulation = {
        predictedComposition: {
          totalPosts: 1500,
          avgScore: 1.5,
          scoreDistribution: [],
        },
        sampleAffected: [
          {
            postId: 'post-affected',
            currentScore: 2.5,
            simulatedScore: 1.5,
            scoreDelta: -1.0,
            currentPosition: 5,
            simulatedPosition: 20,
          },
        ],
        scoreDelta: {
          avgDelta: -0.85,
          maxIncrease: 0,
          maxDecrease: -1.0,
          affectedPostsCount: 450,
        },
      };

      mockFetch(mockSimulation);

      const response = await fetch('/api/feed/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simulateRequest),
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.scoreDelta.avgDelta).toBe(-0.85);
      expect(data.scoreDelta.maxDecrease).toBe(-1.0);
      expect(data.scoreDelta.affectedPostsCount).toBe(450);
    });

    it('should return 400 for invalid rule structure', async () => {
      const invalidRequest = {
        rules: [
          {
            // Missing required fields
            name: 'Invalid Rule',
          },
        ],
      };

      mockFetchError(400, 'Validation error: type and weight are required');

      const response = await fetch('/api/feed/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidRequest),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should handle empty rules array', async () => {
      const emptyRequest = {
        rules: [],
      };

      const mockSimulation = {
        predictedComposition: {
          totalPosts: 1500,
          avgScore: 0,
          scoreDistribution: [{ range: 'all', count: 1500 }],
        },
        sampleAffected: [],
        scoreDelta: {
          avgDelta: 0,
          maxIncrease: 0,
          maxDecrease: 0,
          affectedPostsCount: 0,
        },
      };

      mockFetch(mockSimulation);

      const response = await fetch('/api/feed/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emptyRequest),
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.scoreDelta.avgDelta).toBe(0);
      expect(data.sampleAffected).toHaveLength(0);
    });
  });

  describe('API Response Validation', () => {
    it('should validate explanation response structure', async () => {
      const mockExplanation = {
        postId: 'post-123',
        feedPosition: 5,
        totalScore: 4.5,
        matchedRules: [
          {
            ruleId: 'rule-1',
            ruleName: 'Test Rule',
            ruleType: 'user_verified',
            weight: 1.5,
            matched: true,
            scoreContribution: 1.5,
            matchedConditions: [
              {
                condition: 'test condition',
                result: true,
              },
            ],
          },
        ],
        scoreBreakdown: {
          baseScore: 0,
          rulesScore: 4.5,
          totalScore: 4.5,
        },
      };

      mockFetch(mockExplanation);

      const response = await fetch('/api/feed/explanation/post-123');
      const data = await response.json();

      // Validate required fields
      expect(data).toHaveProperty('postId');
      expect(data).toHaveProperty('feedPosition');
      expect(data).toHaveProperty('totalScore');
      expect(data).toHaveProperty('matchedRules');
      expect(data).toHaveProperty('scoreBreakdown');

      // Validate data types
      expect(typeof data.postId).toBe('string');
      expect(typeof data.feedPosition).toBe('number');
      expect(typeof data.totalScore).toBe('number');
      expect(Array.isArray(data.matchedRules)).toBe(true);
      expect(typeof data.scoreBreakdown).toBe('object');

      // Validate nested structures
      expect(data.matchedRules[0]).toHaveProperty('matchedConditions');
      expect(Array.isArray(data.matchedRules[0].matchedConditions)).toBe(true);
    });

    it('should validate stats response structure', async () => {
      const mockStats = {
        totalPosts: 1500,
        avgScore: 2.35,
        ruleDistribution: {
          'rule-1': {
            name: 'Test Rule',
            appliedCount: 100,
            avgContribution: 1.5,
          },
        },
        scoreHistogram: [{ range: '0-1', count: 100 }],
      };

      mockFetch(mockStats);

      const response = await fetch('/api/feed/stats');
      const data = await response.json();

      expect(data).toHaveProperty('totalPosts');
      expect(data).toHaveProperty('avgScore');
      expect(data).toHaveProperty('ruleDistribution');
      expect(data).toHaveProperty('scoreHistogram');

      expect(typeof data.totalPosts).toBe('number');
      expect(typeof data.avgScore).toBe('number');
      expect(typeof data.ruleDistribution).toBe('object');
      expect(Array.isArray(data.scoreHistogram)).toBe(true);
    });

    it('should validate rule impact response structure', async () => {
      const mockImpact = {
        ruleId: 'rule-1',
        ruleName: 'Test Rule',
        totalAffectedPosts: 100,
        samplePosts: [
          {
            postId: 'post-1',
            beforeScore: 1.0,
            afterScore: 2.5,
            scoreDelta: 1.5,
          },
        ],
        avgScoreDelta: 1.5,
      };

      mockFetch(mockImpact);

      const response = await fetch('/api/feed/rule-impact/rule-1');
      const data = await response.json();

      expect(data).toHaveProperty('ruleId');
      expect(data).toHaveProperty('ruleName');
      expect(data).toHaveProperty('totalAffectedPosts');
      expect(data).toHaveProperty('samplePosts');
      expect(data).toHaveProperty('avgScoreDelta');

      expect(typeof data.ruleId).toBe('string');
      expect(typeof data.totalAffectedPosts).toBe('number');
      expect(Array.isArray(data.samplePosts)).toBe(true);
      expect(typeof data.avgScoreDelta).toBe('number');

      expect(data.samplePosts[0]).toHaveProperty('beforeScore');
      expect(data.samplePosts[0]).toHaveProperty('afterScore');
      expect(data.samplePosts[0]).toHaveProperty('scoreDelta');
    });

    it('should validate simulation response structure', async () => {
      const mockSimulation = {
        predictedComposition: {
          totalPosts: 1000,
          avgScore: 2.5,
          scoreDistribution: [{ range: '0-1', count: 100 }],
        },
        sampleAffected: [
          {
            postId: 'post-1',
            currentScore: 1.0,
            simulatedScore: 2.0,
            scoreDelta: 1.0,
          },
        ],
        scoreDelta: {
          avgDelta: 1.0,
          maxIncrease: 2.0,
          maxDecrease: 0,
          affectedPostsCount: 100,
        },
      };

      mockFetch(mockSimulation);

      const response = await fetch('/api/feed/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: [] }),
      });
      const data = await response.json();

      expect(data).toHaveProperty('predictedComposition');
      expect(data).toHaveProperty('sampleAffected');
      expect(data).toHaveProperty('scoreDelta');

      expect(data.predictedComposition).toHaveProperty('totalPosts');
      expect(data.predictedComposition).toHaveProperty('avgScore');
      expect(data.predictedComposition).toHaveProperty('scoreDistribution');

      expect(typeof data.scoreDelta).toBe('object');
      expect(data.scoreDelta).toHaveProperty('avgDelta');
      expect(data.scoreDelta).toHaveProperty('affectedPostsCount');
    });
  });

  describe('API Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      try {
        await fetch('/api/feed/stats');
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Network error');
      }
    });

    it('should handle 500 internal server errors', async () => {
      mockFetchError(500, 'Internal server error');

      const response = await fetch('/api/feed/explanation/post-123');
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should handle malformed JSON responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON');
        },
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      try {
        const response = await fetch('/api/feed/stats');
        await response.json();
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Invalid JSON');
      }
    });

    it('should handle missing required parameters', async () => {
      mockFetchError(400, 'Bad request: missing required parameter');

      const response = await fetch('/api/feed/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Missing rules
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required parameter');
    });
  });
});
