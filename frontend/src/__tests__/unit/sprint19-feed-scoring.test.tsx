/**
 * Sprint 19: Feed Lab Foundation - Feed Scoring Engine - Unit Tests (TDD)
 * Tests for scoring algorithm that applies FeedRules to posts
 * Implementation will be in:
 * - src/lib/feed-scoring.ts
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';

// TDD imports - these don't exist yet
import {
  calculatePostScore,
  applyBoostRule,
  applyDemoteRule,
  applyFilterRule,
  evaluateCondition,
  useScoredFeed,
  useFilteredFeed,
  useFeedPreview,
  type Post,
  type FeedRule,
  type Condition,
  type ScoredPost,
} from '@/lib/feed-scoring';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

const createWrapper = () => {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Mock data
const mockPost: Post = {
  id: 'post-1',
  content: 'This is a test post about #technology and #ai',
  created_at: '2024-01-15T12:00:00.000Z',
  author: {
    id: 'user-1',
    handle: 'testuser',
    displayName: 'Test User',
  },
  platform: 'bluesky',
  metrics: {
    likes: 50,
    reposts: 10,
    replies: 5,
  },
};

const mockBoostRule: FeedRule = {
  id: 'rule-1',
  name: 'Boost tech posts',
  type: 'boost',
  weight: 20,
  enabled: true,
  condition: {
    field: 'content',
    operator: 'contains',
    value: 'technology',
  },
};

const mockDemoteRule: FeedRule = {
  id: 'rule-2',
  name: 'Demote spam',
  type: 'demote',
  weight: 30,
  enabled: true,
  condition: {
    field: 'content',
    operator: 'contains',
    value: 'spam',
  },
};

const mockFilterRule: FeedRule = {
  id: 'rule-3',
  name: 'Filter NSFW',
  type: 'filter',
  enabled: true,
  condition: {
    field: 'labels',
    operator: 'contains',
    value: 'nsfw',
  },
};

describe('Sprint 19: Feed Scoring Engine', () => {
  describe('1. Scoring Algorithm', () => {
    describe('calculatePostScore', () => {
      it('should return base score of 50 with no rules', () => {
        const score = calculatePostScore(mockPost, []);
        expect(score).toBe(50);
      });

      it('should apply boost rule correctly', () => {
        const score = calculatePostScore(mockPost, [mockBoostRule]);
        expect(score).toBe(70); // 50 + 20
      });

      it('should apply demote rule correctly', () => {
        const post = { ...mockPost, content: 'This is spam content' };
        const score = calculatePostScore(post, [mockDemoteRule]);
        expect(score).toBe(20); // 50 - 30
      });

      it('should combine multiple rules additively', () => {
        const post = { ...mockPost, content: 'technology and spam mixed' };
        const score = calculatePostScore(post, [mockBoostRule, mockDemoteRule]);
        expect(score).toBe(40); // 50 + 20 - 30
      });

      it('should clamp score to minimum 0', () => {
        const demoteHeavy: FeedRule = {
          ...mockDemoteRule,
          weight: 100,
        };
        const post = { ...mockPost, content: 'spam content' };
        const score = calculatePostScore(post, [demoteHeavy]);
        expect(score).toBe(0);
      });

      it('should clamp score to maximum 100', () => {
        const boostHeavy: FeedRule = {
          ...mockBoostRule,
          weight: 100,
        };
        const score = calculatePostScore(mockPost, [boostHeavy]);
        expect(score).toBe(100);
      });

      it('should skip disabled rules', () => {
        const disabledRule: FeedRule = {
          ...mockBoostRule,
          enabled: false,
        };
        const score = calculatePostScore(mockPost, [disabledRule]);
        expect(score).toBe(50); // No boost applied
      });
    });

    describe('applyBoostRule', () => {
      it('should increase score when condition matches', () => {
        const result = applyBoostRule(mockPost, mockBoostRule);
        expect(result).toBe(20); // weight value
      });

      it('should return 0 when condition does not match', () => {
        const post = { ...mockPost, content: 'No keywords here' };
        const result = applyBoostRule(post, mockBoostRule);
        expect(result).toBe(0);
      });

      it('should return 0 if rule is disabled', () => {
        const disabledRule = { ...mockBoostRule, enabled: false };
        const result = applyBoostRule(mockPost, disabledRule);
        expect(result).toBe(0);
      });
    });

    describe('applyDemoteRule', () => {
      it('should decrease score when condition matches', () => {
        const post = { ...mockPost, content: 'This is spam' };
        const result = applyDemoteRule(post, mockDemoteRule);
        expect(result).toBe(-30); // negative weight
      });

      it('should return 0 when condition does not match', () => {
        const result = applyDemoteRule(mockPost, mockDemoteRule);
        expect(result).toBe(0);
      });

      it('should return 0 if rule is disabled', () => {
        const disabledRule = { ...mockDemoteRule, enabled: false };
        const post = { ...mockPost, content: 'spam content' };
        const result = applyDemoteRule(post, disabledRule);
        expect(result).toBe(0);
      });
    });

    describe('applyFilterRule', () => {
      it('should return false when condition matches (hide post)', () => {
        const post = {
          ...mockPost,
          labels: ['nsfw', 'adult'],
        };
        const result = applyFilterRule(post, mockFilterRule);
        expect(result).toBe(false);
      });

      it('should return true when condition does not match (show post)', () => {
        const result = applyFilterRule(mockPost, mockFilterRule);
        expect(result).toBe(true);
      });

      it('should return true if rule is disabled', () => {
        const disabledRule = { ...mockFilterRule, enabled: false };
        const post = {
          ...mockPost,
          labels: ['nsfw'],
        };
        const result = applyFilterRule(post, disabledRule);
        expect(result).toBe(true);
      });
    });
  });

  describe('2. Condition Evaluation', () => {
    describe('evaluateCondition - contains operator', () => {
      it('should match substring in content', () => {
        const condition: Condition = {
          field: 'content',
          operator: 'contains',
          value: 'technology',
        };
        expect(evaluateCondition(mockPost, condition)).toBe(true);
      });

      it('should be case-insensitive', () => {
        const condition: Condition = {
          field: 'content',
          operator: 'contains',
          value: 'TECHNOLOGY',
        };
        expect(evaluateCondition(mockPost, condition)).toBe(true);
      });

      it('should return false for non-matching content', () => {
        const condition: Condition = {
          field: 'content',
          operator: 'contains',
          value: 'python',
        };
        expect(evaluateCondition(mockPost, condition)).toBe(false);
      });
    });

    describe('evaluateCondition - equals operator', () => {
      it('should match exact author handle', () => {
        const condition: Condition = {
          field: 'author.handle',
          operator: 'equals',
          value: 'testuser',
        };
        expect(evaluateCondition(mockPost, condition)).toBe(true);
      });

      it('should match platform', () => {
        const condition: Condition = {
          field: 'platform',
          operator: 'equals',
          value: 'bluesky',
        };
        expect(evaluateCondition(mockPost, condition)).toBe(true);
      });

      it('should be case-sensitive for equals', () => {
        const condition: Condition = {
          field: 'platform',
          operator: 'equals',
          value: 'Bluesky',
        };
        expect(evaluateCondition(mockPost, condition)).toBe(false);
      });
    });

    describe('evaluateCondition - numeric operators', () => {
      it('should evaluate gt (greater than) for likes', () => {
        const condition: Condition = {
          field: 'metrics.likes',
          operator: 'gt',
          value: 40,
        };
        expect(evaluateCondition(mockPost, condition)).toBe(true);
      });

      it('should evaluate lt (less than) for likes', () => {
        const condition: Condition = {
          field: 'metrics.likes',
          operator: 'lt',
          value: 100,
        };
        expect(evaluateCondition(mockPost, condition)).toBe(true);
      });

      it('should handle post age in hours', () => {
        const recentPost = {
          ...mockPost,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        };
        const condition: Condition = {
          field: 'age_hours',
          operator: 'lt',
          value: 24,
        };
        expect(evaluateCondition(recentPost, condition)).toBe(true);
      });

      it('should handle engagement ratio', () => {
        const condition: Condition = {
          field: 'engagement_ratio',
          operator: 'gt',
          value: 0.5,
        };
        // engagement = (50 likes + 10 reposts + 5 replies) / 50 likes = 1.3
        expect(evaluateCondition(mockPost, condition)).toBe(true);
      });
    });

    describe('evaluateCondition - regex operator', () => {
      it('should match regex pattern in content', () => {
        const condition: Condition = {
          field: 'content',
          operator: 'regex',
          value: '#\\w+', // hashtag pattern
        };
        expect(evaluateCondition(mockPost, condition)).toBe(true);
      });

      it('should match email pattern', () => {
        const post = {
          ...mockPost,
          content: 'Contact me at test@example.com',
        };
        const condition: Condition = {
          field: 'content',
          operator: 'regex',
          value: '[a-z]+@[a-z]+\\.[a-z]+',
        };
        expect(evaluateCondition(post, condition)).toBe(true);
      });

      it('should return false for non-matching regex', () => {
        const condition: Condition = {
          field: 'content',
          operator: 'regex',
          value: '^\\d+$', // only numbers
        };
        expect(evaluateCondition(mockPost, condition)).toBe(false);
      });
    });

    describe('evaluateCondition - edge cases', () => {
      it('should handle missing nested fields gracefully', () => {
        const post = { ...mockPost, metrics: undefined };
        const condition: Condition = {
          field: 'metrics.likes',
          operator: 'gt',
          value: 10,
        };
        expect(evaluateCondition(post, condition)).toBe(false);
      });

      it('should handle null values', () => {
        const post = { ...mockPost, language: null };
        const condition: Condition = {
          field: 'language',
          operator: 'equals',
          value: 'en',
        };
        expect(evaluateCondition(post, condition)).toBe(false);
      });
    });
  });

  describe('3. Feed Processing Hooks', () => {
    describe('useScoredFeed', () => {
      const mockPosts: Post[] = [
        mockPost,
        {
          ...mockPost,
          id: 'post-2',
          content: 'Regular post without keywords',
          metrics: { likes: 5, reposts: 1, replies: 0 },
        },
        {
          ...mockPost,
          id: 'post-3',
          content: 'Another technology post with AI',
          metrics: { likes: 100, reposts: 20, replies: 10 },
        },
      ];

      it('should return posts with scores', async () => {
        const { result } = renderHook(
          () => useScoredFeed(mockPosts, [mockBoostRule]),
          { wrapper: createWrapper() }
        );

        await waitFor(() => {
          expect(result.current.data).toBeDefined();
        });

        const scoredPosts = result.current.data!;
        expect(scoredPosts).toHaveLength(3);
        expect(scoredPosts[0]).toHaveProperty('score');
        expect(typeof scoredPosts[0].score).toBe('number');
      });

      it('should sort posts by score descending', async () => {
        const { result } = renderHook(
          () => useScoredFeed(mockPosts, [mockBoostRule]),
          { wrapper: createWrapper() }
        );

        await waitFor(() => {
          expect(result.current.data).toBeDefined();
        });

        const scoredPosts = result.current.data!;
        // Posts with 'technology' should be scored higher (both post-1 and post-3 match)
        // They should be at top with higher scores than post-2
        const techPosts = scoredPosts.filter(p => p.id !== 'post-2');
        const nonTechPost = scoredPosts.find(p => p.id === 'post-2');
        expect(techPosts[0].score).toBeGreaterThan(nonTechPost!.score);
      });

      it('should handle empty posts array', async () => {
        const { result } = renderHook(() => useScoredFeed([], [mockBoostRule]), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.data).toEqual([]);
        });
      });

      it('should handle empty rules array', async () => {
        const { result } = renderHook(() => useScoredFeed(mockPosts, []), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.data).toBeDefined();
        });

        const scoredPosts = result.current.data!;
        // All posts should have base score of 50
        scoredPosts.forEach((post) => {
          expect(post.score).toBe(50);
        });
      });

      it('should recalculate when rules change', async () => {
        const { result, rerender } = renderHook(
          ({ rules }: { rules: FeedRule[] }) => useScoredFeed(mockPosts, rules),
          {
            wrapper: createWrapper(),
            initialProps: { rules: [] as FeedRule[] },
          }
        );

        await waitFor(() => {
          expect(result.current.data).toBeDefined();
        });

        const initialScores = result.current.data!.map((p) => p.score);

        rerender({ rules: [mockBoostRule] });

        await waitFor(() => {
          const newScores = result.current.data!.map((p) => p.score);
          expect(newScores).not.toEqual(initialScores);
        });
      });
    });

    describe('useFilteredFeed', () => {
      const mockPostsWithLabels: Post[] = [
        mockPost,
        {
          ...mockPost,
          id: 'post-nsfw',
          content: 'NSFW content',
          labels: ['nsfw'],
        },
        {
          ...mockPost,
          id: 'post-safe',
          content: 'Safe content',
        },
      ];

      it('should filter out posts matching filter rules', async () => {
        const { result } = renderHook(
          () => useFilteredFeed(mockPostsWithLabels, [mockFilterRule]),
          { wrapper: createWrapper() }
        );

        await waitFor(() => {
          expect(result.current.data).toBeDefined();
        });

        const filteredPosts = result.current.data!;
        expect(filteredPosts).toHaveLength(2);
        expect(filteredPosts.find((p) => p.id === 'post-nsfw')).toBeUndefined();
      });

      it('should return all posts when no filter rules', async () => {
        const { result } = renderHook(
          () => useFilteredFeed(mockPostsWithLabels, []),
          { wrapper: createWrapper() }
        );

        await waitFor(() => {
          expect(result.current.data).toBeDefined();
        });

        expect(result.current.data).toHaveLength(3);
      });

      it('should apply multiple filter rules (AND logic)', async () => {
        const filterSpam: FeedRule = {
          id: 'filter-spam',
          name: 'Filter spam',
          type: 'filter',
          enabled: true,
          condition: {
            field: 'content',
            operator: 'contains',
            value: 'spam',
          },
        };

        const posts: Post[] = [
          mockPost,
          {
            ...mockPost,
            id: 'post-spam',
            content: 'spam post',
          },
          {
            ...mockPost,
            id: 'post-nsfw-spam',
            content: 'spam nsfw',
            labels: ['nsfw'],
          },
        ];

        const { result } = renderHook(
          () => useFilteredFeed(posts, [mockFilterRule, filterSpam]),
          { wrapper: createWrapper() }
        );

        await waitFor(() => {
          expect(result.current.data).toBeDefined();
        });

        // Should only show first post (no spam, no nsfw)
        expect(result.current.data).toHaveLength(1);
        expect(result.current.data![0].id).toBe('post-1');
      });

      it('should respect disabled filter rules', async () => {
        const disabledFilter = { ...mockFilterRule, enabled: false };
        const { result } = renderHook(
          () => useFilteredFeed(mockPostsWithLabels, [disabledFilter]),
          { wrapper: createWrapper() }
        );

        await waitFor(() => {
          expect(result.current.data).toBeDefined();
        });

        // All posts should pass through
        expect(result.current.data).toHaveLength(3);
      });
    });

    describe('useFeedPreview', () => {
      it('should generate preview with sample posts', async () => {
        const { result } = renderHook(() => useFeedPreview([mockBoostRule]), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.data).toBeDefined();
        });

        const preview = result.current.data!;
        expect(preview.posts).toBeDefined();
        expect(Array.isArray(preview.posts)).toBe(true);
        expect(preview.posts.length).toBeGreaterThan(0);
      });

      it('should show score changes in preview', async () => {
        const { result } = renderHook(() => useFeedPreview([mockBoostRule]), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.data).toBeDefined();
        });

        const preview = result.current.data!;
        expect(preview.stats).toBeDefined();
        expect(preview.stats.avgScore).toBeDefined();
        expect(preview.stats.minScore).toBeDefined();
        expect(preview.stats.maxScore).toBeDefined();
      });

      it('should show filter impact stats', async () => {
        const { result } = renderHook(() => useFeedPreview([mockFilterRule]), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.data).toBeDefined();
        });

        const preview = result.current.data!;
        expect(preview.stats.totalPosts).toBeDefined();
        expect(preview.stats.filteredPosts).toBeDefined();
        expect(preview.stats.visiblePosts).toBeDefined();
      });

      it('should update preview when rules change', async () => {
        const { result, rerender } = renderHook(
          ({ rules }: { rules: FeedRule[] }) => useFeedPreview(rules),
          {
            wrapper: createWrapper(),
            initialProps: { rules: [] as FeedRule[] },
          }
        );

        await waitFor(() => {
          expect(result.current.data).toBeDefined();
        });

        const initialStats = result.current.data!.stats;

        rerender({ rules: [mockBoostRule] });

        await waitFor(() => {
          const newStats = result.current.data!.stats;
          expect(newStats.avgScore).not.toBe(initialStats.avgScore);
        });
      });
    });
  });

  describe('4. Edge Cases', () => {
    describe('Empty rules array', () => {
      it('should return posts unchanged with base scores', () => {
        const score = calculatePostScore(mockPost, []);
        expect(score).toBe(50);
      });

      it('should not filter any posts', async () => {
        const posts = [mockPost, { ...mockPost, id: 'post-2' }];
        const { result } = renderHook(() => useFilteredFeed(posts, []), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.data).toEqual(posts);
        });
      });
    });

    describe('Disabled rules', () => {
      it('should skip disabled boost rules', () => {
        const disabledBoost = { ...mockBoostRule, enabled: false };
        const score = calculatePostScore(mockPost, [disabledBoost]);
        expect(score).toBe(50);
      });

      it('should skip disabled filter rules', async () => {
        const disabledFilter = { ...mockFilterRule, enabled: false };
        const post = { ...mockPost, labels: ['nsfw'] };
        const { result } = renderHook(
          () => useFilteredFeed([post], [disabledFilter]),
          { wrapper: createWrapper() }
        );

        await waitFor(() => {
          expect(result.current.data).toHaveLength(1);
        });
      });
    });

    describe('Score clamping', () => {
      it('should clamp minimum score to 0', () => {
        const heavyDemote: FeedRule = {
          ...mockDemoteRule,
          weight: 200,
          condition: { field: 'content', operator: 'contains', value: 'test' },
        };
        const score = calculatePostScore(mockPost, [heavyDemote]);
        expect(score).toBe(0);
        expect(score).toBeGreaterThanOrEqual(0);
      });

      it('should clamp maximum score to 100', () => {
        const heavyBoost: FeedRule = {
          ...mockBoostRule,
          weight: 200,
        };
        const score = calculatePostScore(mockPost, [heavyBoost]);
        expect(score).toBe(100);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    describe('Multiple rules combining', () => {
      it('should combine boost and demote rules additively', () => {
        const post = {
          ...mockPost,
          content: 'technology spam mixed content',
        };
        const rules = [mockBoostRule, mockDemoteRule];
        const score = calculatePostScore(post, rules);
        // 50 (base) + 20 (boost) - 30 (demote) = 40
        expect(score).toBe(40);
      });

      it('should apply multiple boosts cumulatively', () => {
        const boostAI: FeedRule = {
          id: 'boost-ai',
          name: 'Boost AI',
          type: 'boost',
          weight: 15,
          enabled: true,
          condition: { field: 'content', operator: 'contains', value: 'ai' },
        };
        const score = calculatePostScore(mockPost, [mockBoostRule, boostAI]);
        // 50 + 20 (tech) + 15 (ai) = 85
        expect(score).toBe(85);
      });

      it('should handle complex rule combinations', () => {
        const post = {
          ...mockPost,
          content: 'technology and ai content',
          metrics: { likes: 100, reposts: 20, replies: 10 },
        };

        const rules: FeedRule[] = [
          mockBoostRule, // +20 for tech
          {
            id: 'boost-ai',
            name: 'Boost AI',
            type: 'boost',
            weight: 15,
            enabled: true,
            condition: { field: 'content', operator: 'contains', value: 'ai' },
          }, // +15 for ai
          {
            id: 'boost-engagement',
            name: 'Boost high engagement',
            type: 'boost',
            weight: 10,
            enabled: true,
            condition: { field: 'metrics.likes', operator: 'gt', value: 50 },
          }, // +10 for likes > 50
        ];

        const score = calculatePostScore(post, rules);
        // 50 + 20 + 15 + 10 = 95
        expect(score).toBe(95);
      });
    });

    describe('Invalid or malformed data', () => {
      it('should handle posts with missing content', () => {
        const post = { ...mockPost, content: undefined as any };
        const score = calculatePostScore(post, [mockBoostRule]);
        expect(score).toBe(50); // No boost applied
      });

      it('should handle posts with missing metrics', () => {
        const post = { ...mockPost, metrics: undefined };
        const condition: Condition = {
          field: 'metrics.likes',
          operator: 'gt',
          value: 10,
        };
        expect(evaluateCondition(post, condition)).toBe(false);
      });

      it('should handle invalid regex patterns gracefully', () => {
        const condition: Condition = {
          field: 'content',
          operator: 'regex',
          value: '[invalid(regex',
        };
        // Should not throw, should return false
        expect(() => evaluateCondition(mockPost, condition)).not.toThrow();
      });
    });
  });
});
