/**
 * Sprint 20: Feed Explanation Hook - TDD Stub
 * Fetches and caches explanation for why a post appears in feed
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface MatchedCondition {
  field: string;
  operator: string;
  value: string;
}

export interface AppliedRule {
  ruleId: string;
  ruleName: string;
  type: 'boost' | 'demote' | 'filter';
  contribution: number;
  percentage?: number;
  matchedConditions: MatchedCondition[];
}

export interface FeedExplanation {
  postId: string;
  baseScore: number;
  totalScore: number;
  appliedRules: AppliedRule[];
  feedPosition: number;
  fetchedAt: string;
}

export interface UseFeedExplanationResult {
  data: FeedExplanation | null;
  isLoading: boolean;
  loading: boolean; // alias for isLoading
  error: Error | null;
  refetch: () => void;
  invalidateCache: () => void;
  lastFetched: number | null;
}

// Cache for explanations
const explanationCache = new Map<string, FeedExplanation>();

// Export for testing - clear all cached explanations
export function clearExplanationCache(): void {
  explanationCache.clear();
}

export function useFeedExplanation(postId: string | null | undefined): UseFeedExplanationResult {
  const [data, setData] = useState<FeedExplanation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchExplanation = useCallback(async () => {
    if (!postId) {
      setData(null);
      return;
    }

    // Check cache first
    const cached = explanationCache.get(postId);
    if (cached) {
      setData(cached);
      return;
    }

    // Abort any previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/feed/explain/${postId}`, {
        signal: abortController.signal,
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch explanation: ${response.status}`);
      }
      const payload = await response.json();
      if (payload && payload.success === false) {
        throw new Error(payload.error?.message || 'Failed to fetch explanation');
      }
      const raw = payload?.data ?? payload;
      const explanation: FeedExplanation = {
        postId: raw.post_id ?? postId,
        baseScore: raw.base_score ?? 0,
        totalScore: raw.final_score ?? raw.total_score ?? 0,
        appliedRules: Array.isArray(raw.rules_applied)
          ? raw.rules_applied.map((rule: any) => ({
              ruleId: String(rule.rule_id ?? rule.ruleId),
              ruleName: rule.rule_name ?? rule.ruleName ?? 'Rule',
              type: rule.rule_type ?? rule.ruleType ?? 'boost',
              contribution: rule.contribution ?? 0,
              percentage: rule.percentage,
              matchedConditions: rule.matched_condition
                ? [
                    {
                      field: String(rule.matched_condition.field ?? ''),
                      operator: String(rule.matched_condition.operator ?? ''),
                      value: String(rule.matched_condition.value ?? ''),
                    },
                  ]
                : rule.matchedConditions || [],
            }))
          : [],
        feedPosition: raw.feed_position,
        fetchedAt: new Date().toISOString(),
      };

      // Cache the result
      explanationCache.set(postId, explanation);
      setData(explanation);
      setLastFetched(Date.now());
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchExplanation();

    // Cleanup: abort on unmount or postId change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchExplanation]);

  const refetch = useCallback(() => {
    if (postId) {
      explanationCache.delete(postId);
      fetchExplanation();
    }
  }, [postId, fetchExplanation]);

  const invalidateCache = useCallback(() => {
    explanationCache.clear();
  }, []);

  return { data, isLoading, loading: isLoading, error, refetch, invalidateCache, lastFetched };
}
