'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Settings, Users, Key, Activity } from 'lucide-react';
import {
  ActivityFeed,
  MemberManagement,
  RolePermissions,
  SharedCredentials,
  WorkspaceSettings,
  WorkspaceSwitcher,
} from '@/components/workspace';
import {
  Button,
  Card,
  Input,
  Modal,
  Tabs,
  PageHeader,
  SectionTitle,
  SmallText,
  Select,
  Stack,
} from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';

type TabType = 'settings' | 'members' | 'credentials' | 'activity';

const tabs: { id: TabType; label: string; icon: typeof Settings }[] = [
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'credentials', label: 'Shared Credentials', icon: Key },
  { id: 'activity', label: 'Activity', icon: Activity },
];

export default function WorkspacesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { currentWorkspace, workspaces, switchWorkspace, createWorkspace } = useWorkspace();

  const [activeTab, setActiveTab] = useState<TabType>('settings');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceType, setNewWorkspaceType] = useState<'personal' | 'team'>('team');

  const currentWorkspaceId = currentWorkspace?.id ?? '';
  const isPersonal = !currentWorkspaceId || currentWorkspace?.type === 'personal';

  const membersHook = useWorkspaceMembers(currentWorkspaceId, { isPersonal });
  const activityHook = useActivityFeed(currentWorkspaceId, { refreshInterval: 60000 });

  const { data: sharedCredentials = [] } = useQuery({
    queryKey: ['workspace-shared-credentials', currentWorkspaceId],
    queryFn: async () => {
      if (!currentWorkspaceId) {
        return [];
      }
      const response = await fetch(`/api/v1/workspaces/${currentWorkspaceId}/shared-credentials`);
      const payload = await response.json();
      if (!response.ok || payload?.success === false) {
        return [];
      }
      return payload?.data?.credentials ?? payload.credentials ?? [];
    },
    enabled: Boolean(currentWorkspaceId),
  });

  const createWorkspaceMutation = useMutation({
    mutationFn: async () => {
      const result = await createWorkspace({
        name: newWorkspaceName,
        type: newWorkspaceType,
      });
      return result;
    },
    onSuccess: () => {
      setIsCreateOpen(false);
      setNewWorkspaceName('');
      setNewWorkspaceType('team');
    },
  });

  const settingsRole = useMemo(() => {
    if (!user?.id || membersHook.members.length === 0) {
      return 'admin';
    }
    const member = membersHook.members.find((m) => m.userId === String(user.id));
    return member?.role ?? 'admin';
  }, [user?.id, membersHook.members]);

  const handleInvite = async (data: { email: string; role: 'admin' | 'editor' | 'viewer' }) => {
    await membersHook.inviteMember(data);
  };

  const handleShareCredential = async (credentialId: string, accessLevel: 'full' | 'read_only') => {
    if (!currentWorkspaceId) return;
    await fetch(`/api/v1/workspaces/${currentWorkspaceId}/shared-credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential_id: credentialId, access_level: accessLevel }),
    });
    queryClient.invalidateQueries({ queryKey: ['workspace-shared-credentials', currentWorkspaceId] });
  };

  const handleRevokeCredential = async (credentialId: string) => {
    if (!currentWorkspaceId) return;
    await fetch(`/api/v1/workspaces/${currentWorkspaceId}/shared-credentials/${credentialId}`, {
      method: 'DELETE',
    });
    queryClient.invalidateQueries({ queryKey: ['workspace-shared-credentials', currentWorkspaceId] });
  };

  const handleUpdateAccess = async (credentialId: string, accessLevel: 'full' | 'read_only') => {
    if (!currentWorkspaceId) return;
    await fetch(`/api/v1/workspaces/${currentWorkspaceId}/shared-credentials/${credentialId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_level: accessLevel }),
    });
    queryClient.invalidateQueries({ queryKey: ['workspace-shared-credentials', currentWorkspaceId] });
  };

  return (
    <div>
      <PageHeader
        title="Workspaces"
        description="Collaborate with your team, share credentials, and manage roles."
        actions={
          <>
            {currentWorkspace && (
              <WorkspaceSwitcher
                workspaces={workspaces}
                currentWorkspace={currentWorkspace}
                onSwitch={switchWorkspace}
                onCreateWorkspace={() => setIsCreateOpen(true)}
              />
            )}
            <Button variant="secondary" onClick={() => setIsCreateOpen(true)}>
              <Plus size={16} />
              New Workspace
            </Button>
          </>
        }
      />

      <div style={{ marginBottom: '24px' }}>
        <Tabs
          items={tabs}
          value={activeTab}
          onChange={(id) => setActiveTab(id as TabType)}
          variant="soft"
        />
      </div>

      <Stack gap={4}>
        {activeTab === 'settings' && (
          <>
            <SectionTitle>Workspace Settings</SectionTitle>
            {currentWorkspace ? (
              <Card padding="lg">
                <WorkspaceSettings
                  workspace={currentWorkspace}
                  currentUserRole={settingsRole}
                  isOwner={String(currentWorkspace.ownerId) === String(user?.id)}
                  onUpdate={() => {}}
                  onDelete={() => {}}
                  onLeave={() => {}}
                />
              </Card>
            ) : (
              <Card padding="lg">Loading workspace settings...</Card>
            )}

            <SectionTitle>Role Permissions</SectionTitle>
            <div style={{ marginBottom: '16px' }}>
              <SmallText>
                View the permissions available for each role in this workspace.
              </SmallText>
            </div>
            <Card padding="lg">
              <RolePermissions />
            </Card>
          </>
        )}

        {activeTab === 'members' && (
          <>
            <SectionTitle>Members</SectionTitle>
            <div style={{ marginBottom: '16px' }}>
              <SmallText>
                Manage workspace members and their roles.
              </SmallText>
            </div>
            <Card padding="lg">
              <MemberManagement
                members={membersHook.members}
                currentUserId={String(user?.id ?? '')}
                currentUserRole={settingsRole}
                onInvite={handleInvite}
                onRemove={membersHook.removeMember}
                onUpdateRole={membersHook.updateMemberRole}
              />
            </Card>
          </>
        )}

        {activeTab === 'credentials' && (
          <>
            <SectionTitle>Shared Credentials</SectionTitle>
            <div style={{ marginBottom: '16px' }}>
              <SmallText>
                Share access to credentials with workspace members.
              </SmallText>
            </div>
            <Card padding="none">
              <SharedCredentials
                credentials={sharedCredentials}
                currentUserRole={settingsRole}
                onShare={handleShareCredential}
                onRevoke={handleRevokeCredential}
                onUpdateAccess={handleUpdateAccess}
              />
            </Card>
          </>
        )}

        {activeTab === 'activity' && (
          <>
            <SectionTitle>Activity Feed</SectionTitle>
            <div style={{ marginBottom: '16px' }}>
              <SmallText>
                Recent activity in this workspace.
              </SmallText>
            </div>
            <Card padding="none">
              <ActivityFeed
                activities={activityHook.activities}
                isLoading={activityHook.loading}
                hasMore={activityHook.hasMore}
                onLoadMore={activityHook.loadMore}
              />
            </Card>
          </>
        )}
      </Stack>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Workspace"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createWorkspaceMutation.mutate()}
              disabled={!newWorkspaceName.trim()}
              isLoading={createWorkspaceMutation.isPending}
            >
              Create
            </Button>
          </>
        }
      >
        <Stack gap={4}>
          <Input
            label="Workspace Name"
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            placeholder="e.g., Marketing Team"
            fullWidth
          />
          <Select
            label="Workspace Type"
            id="workspace-type"
            value={newWorkspaceType}
            onChange={(e) => setNewWorkspaceType(e.target.value as 'personal' | 'team')}
            options={[
              { value: 'team', label: 'Team' },
              { value: 'personal', label: 'Personal' },
            ]}
            fullWidth
          />
        </Stack>
      </Modal>
    </div>
  );
}
