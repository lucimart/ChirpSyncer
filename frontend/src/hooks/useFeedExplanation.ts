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
  ruleType: 'boost' | 'demote' | 'filter';
  contribution: number;
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
      const response = await fetch(`/api/feed/explanation/${postId}`, {
        signal: abortController.signal,
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch explanation: ${response.status}`);
      }
      const explanation = await response.json();
      explanation.fetchedAt = new Date().toISOString();

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
