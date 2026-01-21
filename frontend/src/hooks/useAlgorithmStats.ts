/**
 * Sprint 20: Algorithm Stats Hook
 * Fetches and caches algorithm statistics for the transparency dashboard
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface FeedComposition {
  boosted: number;
  demoted: number;
  filtered: number;
  unaffected: number;
}

export interface RuleImpact {
  ruleId: string;
  ruleName: string;
  ruleType: 'boost' | 'demote' | 'filter';
  postsAffected: number;
  averageImpact?: number;
}

export interface AlgorithmStats {
  transparencyScore: number;
  totalRules: number;
  activeRules: number;
  feedComposition: FeedComposition;
  topRules: RuleImpact[];
  lastUpdated: string;
}

export interface UseAlgorithmStatsOptions {
  userId?: string;
  refetchInterval?: number;
  enabled?: boolean;
}

export interface UseAlgorithmStatsResult {
  data: AlgorithmStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  invalidateCache: () => void;
}

// Cache for algorithm stats - keyed by userId (or 'default' for no userId)
const statsCache = new Map<string, AlgorithmStats>();

// Export for testing - clear all cached stats
export function clearStatsCache(): void {
  statsCache.clear();
}

// Helper to generate cache key
function getCacheKey(userId?: string): string {
  return userId ?? 'default';
}

// Helper to check if two stats objects are equal (for cache comparison)
function areStatsEqual(a: AlgorithmStats | null, b: AlgorithmStats | null): boolean {
  if (a === null || b === null) return a === b;
  return JSON.stringify(a) === JSON.stringify(b);
}

export function useAlgorithmStats(options: UseAlgorithmStatsOptions = {}): UseAlgorithmStatsResult {
  const { userId, refetchInterval, enabled = true } = options;
  const [data, setData] = useState<AlgorithmStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const cacheKey = getCacheKey(userId);

  const fetchStats = useCallback(async (skipCache = false) => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    // Check cache first (unless skipping)
    if (!skipCache) {
      const cached = statsCache.get(cacheKey);
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const url = userId
        ? `/api/v1/algorithm/stats?userId=${userId}`
        : '/api/v1/algorithm/stats';
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const payload = await response.json();
      if (payload && payload.success === false) {
        throw new Error(payload.error?.message || 'Failed to load stats');
      }
      const stats: AlgorithmStats = payload?.data ?? payload;

      // Only update if still mounted
      if (!mountedRef.current) return;

      // Check if data is the same as current (for cache stability)
      const existingData = statsCache.get(cacheKey);
      if (existingData && areStatsEqual(existingData, stats)) {
        // Return cached reference to maintain referential equality
        setData(existingData);
      } else {
        // Cache the new result
        statsCache.set(cacheKey, stats);
        setData(stats);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [userId, enabled, cacheKey]);

  // Initial fetch on mount
  useEffect(() => {
    mountedRef.current = true;
    fetchStats();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchStats]);

  // Refetch interval
  useEffect(() => {
    if (refetchInterval && enabled) {
      intervalRef.current = setInterval(() => {
        fetchStats(true); // Skip cache for interval refetches
      }, refetchInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [refetchInterval, enabled, fetchStats]);

  const refresh = useCallback(() => {
    // Clear cache for this key and refetch
    statsCache.delete(cacheKey);
    fetchStats(true);
  }, [cacheKey, fetchStats]);

  const invalidateCache = useCallback(() => {
    statsCache.clear();
  }, []);

  return { data, loading, error, refresh, invalidateCache };
}
