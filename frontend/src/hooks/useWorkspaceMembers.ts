/**
 * Sprint 21: Workspace Members Hook - TDD Stub
 * Manages workspace member list and operations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { WorkspaceMember, MemberRole, InviteMemberData } from '@/components/workspace/MemberManagement';

export interface UseWorkspaceMembersOptions {
  isPersonal?: boolean;
}

export interface UseWorkspaceMembersResult {
  members: WorkspaceMember[];
  loading: boolean;
  error: string | null;
  inviteMember: (data: InviteMemberData) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  updateMemberRole: (memberId: string, role: MemberRole) => Promise<void>;
  refresh: () => Promise<void>;
}

// Cache for members data
const membersCache = new Map<string, WorkspaceMember[]>();

export function clearMembersCache(): void {
  membersCache.clear();
}

export function useWorkspaceMembers(
  workspaceId: string,
  options: UseWorkspaceMembersOptions = {}
): UseWorkspaceMembersResult {
  const { isPersonal = false } = options;
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(!isPersonal);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchMembers = useCallback(async (skipCache = false) => {
    if (isPersonal || !workspaceId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    if (!skipCache) {
      const cached = membersCache.get(workspaceId);
      if (cached) {
        setMembers(cached);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/workspaces/${workspaceId}/members`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json();
      if (payload && payload.success === false) {
        throw new Error(payload.error?.message || 'Failed to load members');
      }
      const data = payload?.data ?? payload;

      if (!mountedRef.current) return;

      membersCache.set(workspaceId, data.members);
      setMembers(data.members);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [workspaceId, isPersonal]);

  useEffect(() => {
    mountedRef.current = true;
    fetchMembers();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchMembers]);

  const inviteMember = useCallback(async (data: InviteMemberData) => {
    try {
      const response = await fetch(`/api/v1/workspaces/${workspaceId}/members/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Refresh members list
      clearMembersCache();
      await fetchMembers(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to invite member');
    }
  }, [workspaceId, fetchMembers]);

  const removeMember = useCallback(async (memberId: string) => {
    try {
      const response = await fetch(`/api/v1/workspaces/${workspaceId}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Update local state
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      membersCache.delete(workspaceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  }, [workspaceId]);

  const updateMemberRole = useCallback(async (memberId: string, role: MemberRole) => {
    try {
      const response = await fetch(`/api/v1/workspaces/${workspaceId}/members/${memberId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Update local state
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role } : m))
      );
      membersCache.delete(workspaceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  }, [workspaceId]);

  const refresh = useCallback(async () => {
    membersCache.delete(workspaceId);
    await fetchMembers(true);
  }, [workspaceId, fetchMembers]);

  return {
    members,
    loading,
    error,
    inviteMember,
    removeMember,
    updateMemberRole,
    refresh,
  };
}
