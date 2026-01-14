/**
 * Sprint 21: Activity Feed Hook - TDD Stub
 * Fetches and manages workspace activity feed
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ActivityItem, ActivityType } from '@/components/workspace/ActivityFeed';

export interface UseActivityFeedOptions {
  filterType?: ActivityType;
  refreshInterval?: number;
}

export interface UseActivityFeedResult {
  activities: ActivityItem[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

// Cache for activity data
const activityCache = new Map<string, { activities: ActivityItem[]; hasMore: boolean; cursor: string | null }>();

export function clearActivityCache(): void {
  activityCache.clear();
}

export function useActivityFeed(
  workspaceId: string,
  options: UseActivityFeedOptions = {}
): UseActivityFeedResult {
  const { filterType, refreshInterval } = options;
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cacheKey = `${workspaceId}-${filterType || 'all'}`;

  const fetchActivities = useCallback(async (skipCache = false, append = false) => {
    if (!skipCache && !append) {
      const cached = activityCache.get(cacheKey);
      if (cached) {
        setActivities(cached.activities);
        setHasMore(cached.hasMore);
        setCursor(cached.cursor);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filterType) params.set('type', filterType);
      if (append && cursor) params.set('cursor', cursor);

      const response = await fetch(
        `/api/workspaces/${workspaceId}/activity?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!mountedRef.current) return;

      const newActivities = append
        ? [...activities, ...data.activities]
        : data.activities;

      activityCache.set(cacheKey, {
        activities: newActivities,
        hasMore: data.hasMore,
        cursor: data.nextCursor,
      });

      setActivities(newActivities);
      setHasMore(data.hasMore);
      setCursor(data.nextCursor);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [workspaceId, filterType, cacheKey, cursor, activities]);

  useEffect(() => {
    mountedRef.current = true;
    fetchActivities();

    return () => {
      mountedRef.current = false;
    };
  }, [workspaceId, filterType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval) {
      intervalRef.current = setInterval(() => {
        fetchActivities(true);
      }, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [refreshInterval]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await fetchActivities(true, true);
  }, [hasMore, loading, fetchActivities]);

  const refresh = useCallback(async () => {
    activityCache.delete(cacheKey);
    setCursor(null);
    await fetchActivities(true);
  }, [cacheKey, fetchActivities]);

  return {
    activities,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}
