'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import { Plus, Settings, Users, Key, Activity } from 'lucide-react';
import {
  ActivityFeed,
  MemberManagement,
  RolePermissions,
  SharedCredentials,
  WorkspaceSettings,
  WorkspaceSwitcher,
} from '@/components/workspace';
import { Button, Card, Input, Modal, Tabs } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useActivityFeed } from '@/hooks/useActivityFeed';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useWorkspaceMembers } from '@/hooks/useWorkspaceMembers';

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const TitleSection = styled.div``;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const PageDescription = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const StyledTabs = styled(Tabs)`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const TabContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const SectionDescription = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const HeaderActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  align-items: center;
`;

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
      <PageHeader>
        <TitleSection>
          <PageTitle>Workspaces</PageTitle>
          <PageDescription>
            Collaborate with your team, share credentials, and manage roles.
          </PageDescription>
        </TitleSection>
        <HeaderActions>
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
        </HeaderActions>
      </PageHeader>

      <StyledTabs
        items={tabs}
        value={activeTab}
        onChange={(id) => setActiveTab(id as TabType)}
        variant="soft"
      />

      <TabContent>
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
            <SectionDescription>
              View the permissions available for each role in this workspace.
            </SectionDescription>
            <Card padding="lg">
              <RolePermissions />
            </Card>
          </>
        )}

        {activeTab === 'members' && (
          <>
            <SectionTitle>Members</SectionTitle>
            <SectionDescription>
              Manage workspace members and their roles.
            </SectionDescription>
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
            <SectionDescription>
              Share access to credentials with workspace members.
            </SectionDescription>
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
            <SectionDescription>
              Recent activity in this workspace.
            </SectionDescription>
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
      </TabContent>

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Workspace Name"
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            placeholder="e.g., Marketing Team"
            fullWidth
          />
          <div>
            <label htmlFor="workspace-type" style={{ fontSize: '14px', fontWeight: 500 }}>
              Workspace Type
            </label>
            <select
              id="workspace-type"
              value={newWorkspaceType}
              onChange={(e) => setNewWorkspaceType(e.target.value as 'personal' | 'team')}
              style={{ width: '100%', marginTop: '8px', height: '40px' }}
            >
              <option value="team">Team</option>
              <option value="personal">Personal</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
