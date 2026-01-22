/**
 * Sprint 21: Workspace Hook - TDD Stub
 * Manages workspace state, switching, and creation
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Workspace } from '@/components/workspace/WorkspaceSwitcher';
import { clearMembersCache } from '@/hooks/useWorkspaceMembers';
import { clearActivityCache } from '@/hooks/useActivityFeed';

export interface UseWorkspaceResult {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  loading: boolean;
  error: string | null;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  createWorkspace: (data: { name: string; type: 'personal' | 'team' }) => Promise<Workspace | null>;
  refresh: () => Promise<void>;
}

// Cache for workspace data
const workspaceCache = new Map<string, { workspace: Workspace; workspaces: Workspace[] }>();

export function clearWorkspaceCache(): void {
  workspaceCache.clear();
}

export function useWorkspace(): UseWorkspaceResult {
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchWorkspaces = useCallback(async (skipCache = false) => {
    if (!skipCache) {
      const cached = workspaceCache.get('current');
      if (cached) {
        setCurrentWorkspace(cached.workspace);
        setWorkspaces(cached.workspaces);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/workspaces/current');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json();
      if (payload && payload.success === false) {
        throw new Error(payload.error?.message || 'Failed to load workspaces');
      }
      const data = payload?.data ?? payload;

      if (!mountedRef.current) return;

      workspaceCache.set('current', {
        workspace: data.workspace,
        workspaces: data.workspaces,
      });

      setCurrentWorkspace(data.workspace);
      setWorkspaces(data.workspaces);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchWorkspaces();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchWorkspaces]);

  const switchWorkspace = useCallback(async (workspaceId: string) => {
    try {
      const response = await fetch(`/api/v1/workspaces/${workspaceId}/switch`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json().catch(() => null);
      if (payload && payload.success === false) {
        throw new Error(payload.error?.message || 'Failed to switch workspace');
      }

      // Clear cache and refetch
      clearWorkspaceCache();
      clearMembersCache();
      clearActivityCache();
      await fetchWorkspaces(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch workspace');
    }
  }, [fetchWorkspaces]);

  const createWorkspace = useCallback(async (data: { name: string; type: 'personal' | 'team' }): Promise<Workspace | null> => {
    try {
      const response = await fetch('/api/v1/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json();
      if (payload && payload.success === false) {
        throw new Error(payload.error?.message || 'Failed to create workspace');
      }
      const workspace = payload?.data?.workspace ?? payload.workspace;
      clearWorkspaceCache();
      clearMembersCache();
      clearActivityCache();
      await fetchWorkspaces(true);
      return workspace;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
      return null;
    }
  }, [fetchWorkspaces]);

  const refresh = useCallback(async () => {
    clearWorkspaceCache();
    await fetchWorkspaces(true);
  }, [fetchWorkspaces]);

  return {
    currentWorkspace,
    workspaces,
    loading,
    error,
    switchWorkspace,
    createWorkspace,
    refresh,
  };
}
