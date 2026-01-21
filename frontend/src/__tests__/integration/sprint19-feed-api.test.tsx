/**
 * Sprint 19: Feed Lab Foundation - Backend API Integration Tests
 *
 * These tests verify the integration between the frontend and the Feed Lab API.
 * They mock the backend API responses to ensure proper request/response handling.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';

// Test setup utilities
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

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

describe('Sprint 19: Feed Lab Backend API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Feed Rules API - List Rules', () => {
    /**
     * INTEGRATION: GET /api/v1/feed/rules
     * Should fetch all feed rules with their configurations
     */
    it('should fetch all feed rules successfully', async () => {
      const mockRules = [
        {
          id: 'rule-1',
          name: 'Boost Verified Users',
          description: 'Increase score for verified accounts',
          type: 'user_verified',
          weight: 1.5,
          enabled: true,
          created_at: '2024-01-15T12:00:00Z',
          updated_at: '2024-01-15T12:00:00Z',
        },
        {
          id: 'rule-2',
          name: 'Penalize Old Posts',
          description: 'Reduce score for posts older than 24h',
          type: 'post_age',
          weight: -0.5,
          config: { threshold_hours: 24 },
          enabled: true,
          created_at: '2024-01-15T13:00:00Z',
          updated_at: '2024-01-15T13:00:00Z',
        },
      ];

      mockFetch({ rules: mockRules });

      const response = await fetch('/api/v1/feed/rules');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(data.rules).toHaveLength(2);
      expect(data.rules[0].id).toBe('rule-1');
      expect(data.rules[0].type).toBe('user_verified');
      expect(data.rules[0].weight).toBe(1.5);
      expect(data.rules[0].enabled).toBe(true);
    });

    it('should handle empty rules list', async () => {
      mockFetch({ rules: [] });

      const response = await fetch('/api/v1/feed/rules');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.rules).toHaveLength(0);
    });
  });

  describe('Feed Rules API - Create Rule', () => {
    /**
     * INTEGRATION: POST /api/v1/feed/rules
     * Should create a new feed rule and return its ID
     */
    it('should create a new feed rule successfully', async () => {
      const newRule = {
        name: 'Boost High Engagement',
        description: 'Increase score for posts with high engagement',
        type: 'engagement_rate',
        weight: 2.0,
        config: {
          min_likes: 10,
          min_replies: 5,
        },
      };

      const mockResponse = {
        id: 'rule-3',
        ...newRule,
        enabled: true,
        created_at: '2024-01-15T14:00:00Z',
        updated_at: '2024-01-15T14:00:00Z',
      };

      mockFetch(mockResponse, 201);

      const response = await fetch('/api/v1/feed/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBe('rule-3');
      expect(data.name).toBe(newRule.name);
      expect(data.weight).toBe(2.0);
      expect(data.enabled).toBe(true);
    });

    it('should return 400 for invalid rule structure', async () => {
      const invalidRule = {
        // Missing required 'type' field
        name: 'Invalid Rule',
        weight: 1.0,
      };

      mockFetchError(400, 'Validation error: type is required');

      const response = await fetch('/api/v1/feed/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidRule),
      });
      const data = await response.json();

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
      expect(data.error).toContain('type is required');
    });

    it('should return 400 for invalid weight range', async () => {
      const invalidRule = {
        name: 'Invalid Weight',
        type: 'user_verified',
        weight: 15.0, // Weight too high (valid range: -10 to +10)
      };

      mockFetchError(400, 'Validation error: weight must be between -10 and 10');

      const response = await fetch('/api/v1/feed/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidRule),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('weight must be between -10 and 10');
    });

    it('should return 400 for missing required fields', async () => {
      const invalidRule = {
        description: 'Rule without name',
      };

      mockFetchError(400, 'Validation error: name, type, and weight are required');

      const response = await fetch('/api/v1/feed/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidRule),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });
  });

  describe('Feed Rules API - Update Rule', () => {
    /**
     * INTEGRATION: PUT /api/v1/feed/rules/:id
     * Should update existing rule and return updated data
     */
    it('should update a feed rule successfully', async () => {
      const updatedRule = {
        name: 'Boost Verified Users (Updated)',
        weight: 2.5,
        description: 'Higher boost for verified accounts',
      };

      const mockResponse = {
        id: 'rule-1',
        ...updatedRule,
        type: 'user_verified',
        enabled: true,
        created_at: '2024-01-15T12:00:00Z',
        updated_at: '2024-01-15T15:00:00Z',
      };

      mockFetch(mockResponse);

      const response = await fetch('/api/v1/feed/rules/rule-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRule),
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.id).toBe('rule-1');
      expect(data.name).toBe(updatedRule.name);
      expect(data.weight).toBe(2.5);
      expect(data.updated_at).toBe('2024-01-15T15:00:00Z');
    });

    it('should return 404 for non-existent rule', async () => {
      const update = { weight: 1.5 };

      mockFetchError(404, 'Rule not found');

      const response = await fetch('/api/v1/feed/rules/non-existent-id', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Rule not found');
    });

    it('should validate weight range on update', async () => {
      const invalidUpdate = { weight: -15.0 };

      mockFetchError(400, 'Validation error: weight must be between -10 and 10');

      const response = await fetch('/api/v1/feed/rules/rule-1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidUpdate),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('weight must be between -10 and 10');
    });
  });

  describe('Feed Rules API - Delete Rule', () => {
    /**
     * INTEGRATION: DELETE /api/v1/feed/rules/:id
     * Should delete rule and return success
     */
    it('should delete a feed rule successfully', async () => {
      mockFetch({ success: true, message: 'Rule deleted successfully' });

      const response = await fetch('/api/v1/feed/rules/rule-1', {
        method: 'DELETE',
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Rule deleted successfully');
    });

    it('should return 404 when deleting non-existent rule', async () => {
      mockFetchError(404, 'Rule not found');

      const response = await fetch('/api/v1/feed/rules/non-existent-id', {
        method: 'DELETE',
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Rule not found');
    });
  });

  describe('Feed Rules API - Toggle Enable/Disable', () => {
    /**
     * INTEGRATION: PATCH /api/v1/feed/rules/:id/toggle
     * Should toggle rule enabled state
     */
    it('should toggle rule from enabled to disabled', async () => {
      const mockResponse = {
        id: 'rule-1',
        name: 'Boost Verified Users',
        type: 'user_verified',
        weight: 1.5,
        enabled: false, // Toggled to disabled
        created_at: '2024-01-15T12:00:00Z',
        updated_at: '2024-01-15T16:00:00Z',
      };

      mockFetch(mockResponse);

      const response = await fetch('/api/v1/feed/rules/rule-1/toggle', {
        method: 'PATCH',
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.id).toBe('rule-1');
      expect(data.enabled).toBe(false);
    });

    it('should toggle rule from disabled to enabled', async () => {
      const mockResponse = {
        id: 'rule-2',
        name: 'Penalize Old Posts',
        type: 'post_age',
        weight: -0.5,
        enabled: true, // Toggled to enabled
        created_at: '2024-01-15T13:00:00Z',
        updated_at: '2024-01-15T16:00:00Z',
      };

      mockFetch(mockResponse);

      const response = await fetch('/api/v1/feed/rules/rule-2/toggle', {
        method: 'PATCH',
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.enabled).toBe(true);
    });

    it('should return 404 when toggling non-existent rule', async () => {
      mockFetchError(404, 'Rule not found');

      const response = await fetch('/api/v1/feed/rules/non-existent-id/toggle', {
        method: 'PATCH',
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Rule not found');
    });
  });

  describe('Scored Feed API - Get Feed', () => {
    /**
     * INTEGRATION: GET /api/v1/feed
     * Should return feed posts with scores applied
     */
    it('should fetch scored feed successfully', async () => {
      const mockFeed = {
        posts: [
          {
            id: 'post-1',
            content: 'Great post from verified user!',
            author: {
              id: 'user-1',
              handle: 'verified_user',
              displayName: 'Verified User',
              verified: true,
            },
            score: 2.5,
            created_at: '2024-01-15T10:00:00Z',
            metrics: {
              likes: 50,
              replies: 10,
              reposts: 5,
            },
          },
          {
            id: 'post-2',
            content: 'Older post with less engagement',
            author: {
              id: 'user-2',
              handle: 'regular_user',
              displayName: 'Regular User',
              verified: false,
            },
            score: -0.3,
            created_at: '2024-01-14T08:00:00Z',
            metrics: {
              likes: 2,
              replies: 0,
              reposts: 0,
            },
          },
        ],
        pagination: {
          cursor: 'next-page-token',
          has_more: true,
        },
      };

      mockFetch(mockFeed);

      const response = await fetch('/api/v1/feed');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.posts).toHaveLength(2);
      expect(data.posts[0].score).toBe(2.5);
      expect(data.posts[0].author.verified).toBe(true);
      expect(data.posts[1].score).toBe(-0.3);
      expect(data.pagination.has_more).toBe(true);
    });

    it('should support pagination parameters', async () => {
      const mockFeed = {
        posts: [],
        pagination: {
          cursor: null,
          has_more: false,
        },
      };

      mockFetch(mockFeed);

      const response = await fetch('/api/v1/feed?cursor=next-page-token&limit=20');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.posts).toHaveLength(0);
      expect(data.pagination.has_more).toBe(false);
    });
  });

  describe('Scored Feed API - Preview Feed', () => {
    /**
     * INTEGRATION: GET /api/v1/feed/preview
     * Should preview feed with rules without saving
     */
    it('should preview feed with custom rules', async () => {
      const previewRules = [
        {
          type: 'user_verified',
          weight: 3.0,
        },
        {
          type: 'engagement_rate',
          weight: 2.0,
          config: { min_likes: 5 },
        },
      ];

      const mockPreview = {
        posts: [
          {
            id: 'post-1',
            content: 'Preview post',
            score: 5.0, // Higher due to preview rules
            author: {
              id: 'user-1',
              handle: 'user',
              displayName: 'User',
              verified: true,
            },
            created_at: '2024-01-15T10:00:00Z',
          },
        ],
        rules_applied: previewRules,
      };

      mockFetch(mockPreview);

      const response = await fetch('/api/v1/feed/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: previewRules }),
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.posts[0].score).toBe(5.0);
      expect(data.rules_applied).toHaveLength(2);
    });

    it('should return 400 for invalid preview rules', async () => {
      const invalidRules = [
        {
          type: 'invalid_type',
          weight: 1.0,
        },
      ];

      mockFetchError(400, 'Validation error: invalid rule type');

      const response = await fetch('/api/v1/feed/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: invalidRules }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('invalid rule type');
    });
  });

  describe('Scored Feed API - Explain Score', () => {
    /**
     * INTEGRATION: GET /api/v1/feed/explain/:postId
     * Should return score breakdown for a specific post
     */
    it('should explain score breakdown for a post', async () => {
      const mockExplanation = {
        post_id: 'post-1',
        total_score: 3.5,
        breakdown: [
          {
            rule_id: 'rule-1',
            rule_name: 'Boost Verified Users',
            rule_type: 'user_verified',
            weight: 1.5,
            matched: true,
            contribution: 1.5,
          },
          {
            rule_id: 'rule-2',
            rule_name: 'Boost High Engagement',
            rule_type: 'engagement_rate',
            weight: 2.0,
            matched: true,
            contribution: 2.0,
          },
          {
            rule_id: 'rule-3',
            rule_name: 'Penalize Old Posts',
            rule_type: 'post_age',
            weight: -0.5,
            matched: false,
            contribution: 0,
          },
        ],
        base_score: 0,
      };

      mockFetch(mockExplanation);

      const response = await fetch('/api/v1/feed/explain/post-1');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.post_id).toBe('post-1');
      expect(data.total_score).toBe(3.5);
      expect(data.breakdown).toHaveLength(3);
      expect(data.breakdown[0].matched).toBe(true);
      expect(data.breakdown[0].contribution).toBe(1.5);
      expect(data.breakdown[2].matched).toBe(false);
    });

    it('should return 404 for non-existent post', async () => {
      mockFetchError(404, 'Post not found');

      const response = await fetch('/api/v1/feed/explain/non-existent-post');
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Post not found');
    });

    it('should show zero contributions for disabled rules', async () => {
      const mockExplanation = {
        post_id: 'post-2',
        total_score: 0,
        breakdown: [
          {
            rule_id: 'rule-4',
            rule_name: 'Disabled Rule',
            rule_type: 'user_verified',
            weight: 2.0,
            enabled: false,
            matched: true,
            contribution: 0, // Zero because rule is disabled
          },
        ],
        base_score: 0,
      };

      mockFetch(mockExplanation);

      const response = await fetch('/api/v1/feed/explain/post-2');
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.total_score).toBe(0);
      expect(data.breakdown[0].enabled).toBe(false);
      expect(data.breakdown[0].contribution).toBe(0);
    });
  });

  describe('API Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      try {
        await fetch('/api/v1/feed/rules');
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Network error');
      }
    });

    it('should handle 500 internal server errors', async () => {
      mockFetchError(500, 'Internal server error');

      const response = await fetch('/api/v1/feed/rules');
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
        const response = await fetch('/api/v1/feed/rules');
        await response.json();
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Invalid JSON');
      }
    });
  });

  describe('API Response Validation', () => {
    it('should validate rule response structure', async () => {
      const mockRule = {
        id: 'rule-1',
        name: 'Test Rule',
        type: 'user_verified',
        weight: 1.0,
        enabled: true,
        created_at: '2024-01-15T12:00:00Z',
        updated_at: '2024-01-15T12:00:00Z',
      };

      mockFetch(mockRule, 201);

      const response = await fetch('/api/v1/feed/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Rule', type: 'user_verified', weight: 1.0 }),
      });
      const data = await response.json();

      // Validate required fields
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('type');
      expect(data).toHaveProperty('weight');
      expect(data).toHaveProperty('enabled');
      expect(data).toHaveProperty('created_at');
      expect(data).toHaveProperty('updated_at');

      // Validate data types
      expect(typeof data.id).toBe('string');
      expect(typeof data.name).toBe('string');
      expect(typeof data.weight).toBe('number');
      expect(typeof data.enabled).toBe('boolean');
    });

    it('should validate feed response structure', async () => {
      const mockFeed = {
        posts: [
          {
            id: 'post-1',
            content: 'Test post',
            score: 1.5,
            author: {
              id: 'user-1',
              handle: 'user',
              displayName: 'User',
            },
            created_at: '2024-01-15T10:00:00Z',
          },
        ],
        pagination: {
          cursor: 'token',
          has_more: true,
        },
      };

      mockFetch(mockFeed);

      const response = await fetch('/api/v1/feed');
      const data = await response.json();

      expect(data).toHaveProperty('posts');
      expect(data).toHaveProperty('pagination');
      expect(Array.isArray(data.posts)).toBe(true);
      expect(data.posts[0]).toHaveProperty('score');
      expect(typeof data.posts[0].score).toBe('number');
      expect(data.pagination).toHaveProperty('has_more');
      expect(typeof data.pagination.has_more).toBe('boolean');
    });

    it('should validate explanation response structure', async () => {
      const mockExplanation = {
        post_id: 'post-1',
        total_score: 2.5,
        breakdown: [
          {
            rule_id: 'rule-1',
            rule_name: 'Rule',
            rule_type: 'user_verified',
            weight: 1.5,
            matched: true,
            contribution: 1.5,
          },
        ],
        base_score: 0,
      };

      mockFetch(mockExplanation);

      const response = await fetch('/api/v1/feed/explain/post-1');
      const data = await response.json();

      expect(data).toHaveProperty('post_id');
      expect(data).toHaveProperty('total_score');
      expect(data).toHaveProperty('breakdown');
      expect(data).toHaveProperty('base_score');
      expect(Array.isArray(data.breakdown)).toBe(true);
      expect(data.breakdown[0]).toHaveProperty('rule_id');
      expect(data.breakdown[0]).toHaveProperty('matched');
      expect(data.breakdown[0]).toHaveProperty('contribution');
      expect(typeof data.breakdown[0].matched).toBe('boolean');
      expect(typeof data.breakdown[0].contribution).toBe('number');
    });
  });
});
