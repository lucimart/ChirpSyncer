/**
 * Sprint 21: Team Collaboration - Unit Tests (TDD)
 * Tests for Workspaces, Roles, Shared Credentials, Activity Feed
 *
 * TDD Red Phase: Components don't exist yet
 */

import React, { ReactNode } from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHook, act } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';

// TDD - These components/hooks don't exist yet, tests will fail until implemented
import { WorkspaceSwitcher } from '@/components/workspace/WorkspaceSwitcher';
import { WorkspaceSettings } from '@/components/workspace/WorkspaceSettings';
import { MemberManagement } from '@/components/workspace/MemberManagement';
import { RolePermissions } from '@/components/workspace/RolePermissions';
import { ActivityFeed } from '@/components/workspace/ActivityFeed';
import { SharedCredentials } from '@/components/workspace/SharedCredentials';
import { useWorkspace, clearWorkspaceCache } from '@/hooks/useWorkspace';
import { useWorkspaceMembers, clearMembersCache } from '@/hooks/useWorkspaceMembers';
import { useActivityFeed, clearActivityCache } from '@/hooks/useActivityFeed';

// Theme wrapper for tests with styled-components ThemeProvider
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

const renderWithTheme = (component: React.ReactElement) => {
  return render(<TestWrapper>{component}</TestWrapper>);
};

// ============================================================================
// Mock Data
// ============================================================================

const mockPersonalWorkspace = {
  id: 'ws-personal-1',
  name: 'Personal',
  type: 'personal' as const,
  ownerId: 'user-1',
  memberCount: 1,
  createdAt: '2025-01-01T00:00:00Z',
};

const mockTeamWorkspace = {
  id: 'ws-team-1',
  name: 'Marketing Team',
  type: 'team' as const,
  ownerId: 'user-1',
  memberCount: 5,
  createdAt: '2025-01-10T00:00:00Z',
};

const mockWorkspaces = [mockPersonalWorkspace, mockTeamWorkspace];

const mockCurrentUser = {
  id: 'user-1',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'admin' as const,
};

const mockMembers = [
  {
    id: 'member-1',
    userId: 'user-1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin' as const,
    joinedAt: '2025-01-10T00:00:00Z',
    lastActive: '2025-01-14T10:00:00Z',
  },
  {
    id: 'member-2',
    userId: 'user-2',
    email: 'editor@example.com',
    name: 'Editor User',
    role: 'editor' as const,
    joinedAt: '2025-01-11T00:00:00Z',
    lastActive: '2025-01-14T09:30:00Z',
  },
  {
    id: 'member-3',
    userId: 'user-3',
    email: 'viewer@example.com',
    name: 'Viewer User',
    role: 'viewer' as const,
    joinedAt: '2025-01-12T00:00:00Z',
    lastActive: '2025-01-13T15:00:00Z',
  },
];

const mockActivityItems = [
  {
    id: 'activity-1',
    type: 'credential_added' as const,
    userId: 'user-1',
    userName: 'Admin User',
    description: 'Added Twitter credentials',
    timestamp: '2025-01-14T10:30:00Z',
    metadata: { credentialType: 'twitter' },
  },
  {
    id: 'activity-2',
    type: 'member_invited' as const,
    userId: 'user-1',
    userName: 'Admin User',
    description: 'Invited editor@example.com as editor',
    timestamp: '2025-01-14T09:00:00Z',
    metadata: { invitedEmail: 'editor@example.com', role: 'editor' },
  },
  {
    id: 'activity-3',
    type: 'rule_created' as const,
    userId: 'user-2',
    userName: 'Editor User',
    description: 'Created cleanup rule "Delete old tweets"',
    timestamp: '2025-01-14T08:00:00Z',
    metadata: { ruleName: 'Delete old tweets' },
  },
  {
    id: 'activity-4',
    type: 'sync_triggered' as const,
    userId: 'user-2',
    userName: 'Editor User',
    description: 'Triggered sync for Twitter',
    timestamp: '2025-01-13T16:00:00Z',
    metadata: { platform: 'twitter' },
  },
];

const mockSharedCredentials = [
  {
    id: 'cred-1',
    name: 'Company Twitter',
    platform: 'twitter' as const,
    sharedBy: 'user-1',
    sharedByName: 'Admin User',
    sharedAt: '2025-01-10T00:00:00Z',
    accessLevel: 'full' as const,
    lastUsed: '2025-01-14T10:00:00Z',
  },
  {
    id: 'cred-2',
    name: 'Marketing Bluesky',
    platform: 'bluesky' as const,
    sharedBy: 'user-1',
    sharedByName: 'Admin User',
    sharedAt: '2025-01-12T00:00:00Z',
    accessLevel: 'read_only' as const,
    lastUsed: '2025-01-13T15:00:00Z',
  },
];

// ============================================================================
// RBAC Permissions from MASTER_ROADMAP.md
// ============================================================================

const ROLE_PERMISSIONS = {
  admin: {
    canViewDashboard: true,
    canManageCredentials: true,
    canTriggerSync: true,
    canViewCleanupRules: true,
    canEditCleanupRules: true,
    canExecuteCleanup: true,
    canViewAnalytics: true,
    canExportData: true,
    canViewAuditLog: true,
    canManageUsers: true,
  },
  editor: {
    canViewDashboard: true,
    canManageCredentials: true,
    canTriggerSync: true,
    canViewCleanupRules: true,
    canEditCleanupRules: true,
    canExecuteCleanup: false,
    canViewAnalytics: true,
    canExportData: true,
    canViewAuditLog: false,
    canManageUsers: false,
  },
  viewer: {
    canViewDashboard: true,
    canManageCredentials: false,
    canTriggerSync: false,
    canViewCleanupRules: true,
    canEditCleanupRules: false,
    canExecuteCleanup: false,
    canViewAnalytics: true,
    canExportData: false,
    canViewAuditLog: false,
    canManageUsers: false,
  },
};

// ============================================================================
// WorkspaceSwitcher Component Tests
// ============================================================================

describe('WorkspaceSwitcher Component', () => {
  const mockOnSwitch = jest.fn();
  const mockOnCreate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays current workspace name', () => {
    renderWithTheme(
      <WorkspaceSwitcher
        workspaces={mockWorkspaces}
        currentWorkspace={mockTeamWorkspace}
        onSwitch={mockOnSwitch}
        onCreateWorkspace={mockOnCreate}
      />
    );

    expect(screen.getByText('Marketing Team')).toBeInTheDocument();
  });

  it('shows workspace dropdown when clicked', async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <WorkspaceSwitcher
        workspaces={mockWorkspaces}
        currentWorkspace={mockPersonalWorkspace}
        onSwitch={mockOnSwitch}
        onCreateWorkspace={mockOnCreate}
      />
    );

    await user.click(screen.getByRole('button', { name: /current workspace/i }));

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    // Use getAllByText since "Personal" appears in button and dropdown
    expect(screen.getAllByText('Personal').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Marketing Team')).toBeInTheDocument();
  });

  it('displays workspace type badge (personal/team)', async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <WorkspaceSwitcher
        workspaces={mockWorkspaces}
        currentWorkspace={mockPersonalWorkspace}
        onSwitch={mockOnSwitch}
        onCreateWorkspace={mockOnCreate}
      />
    );

    await user.click(screen.getByRole('button', { name: /current workspace/i }));

    const dropdown = screen.getByRole('listbox');
    // The badges have class "workspace-type-badge", look for them
    const options = within(dropdown).getAllByRole('option');
    expect(options.length).toBe(2);
    // Check that type badges are present - use class selector
    const personalBadge = dropdown.querySelector('.workspace-type-personal');
    const teamBadge = dropdown.querySelector('.workspace-type-team');
    expect(personalBadge).toBeInTheDocument();
    expect(teamBadge).toBeInTheDocument();
  });

  it('calls onSwitch when selecting a different workspace', async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <WorkspaceSwitcher
        workspaces={mockWorkspaces}
        currentWorkspace={mockPersonalWorkspace}
        onSwitch={mockOnSwitch}
        onCreateWorkspace={mockOnCreate}
      />
    );

    await user.click(screen.getByRole('button', { name: /current workspace/i }));
    await user.click(screen.getByText('Marketing Team'));

    expect(mockOnSwitch).toHaveBeenCalledWith(mockTeamWorkspace.id);
  });

  it('shows member count for team workspaces', async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <WorkspaceSwitcher
        workspaces={mockWorkspaces}
        currentWorkspace={mockPersonalWorkspace}
        onSwitch={mockOnSwitch}
        onCreateWorkspace={mockOnCreate}
      />
    );

    await user.click(screen.getByRole('button', { name: /current workspace/i }));

    expect(screen.getByText(/5 members/i)).toBeInTheDocument();
  });

  it('shows create workspace button', async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <WorkspaceSwitcher
        workspaces={mockWorkspaces}
        currentWorkspace={mockPersonalWorkspace}
        onSwitch={mockOnSwitch}
        onCreateWorkspace={mockOnCreate}
      />
    );

    await user.click(screen.getByRole('button', { name: /current workspace/i }));

    const createButton = screen.getByRole('button', { name: /create.*workspace/i });
    expect(createButton).toBeInTheDocument();

    await user.click(createButton);
    expect(mockOnCreate).toHaveBeenCalled();
  });

  it('highlights current workspace in dropdown', async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <WorkspaceSwitcher
        workspaces={mockWorkspaces}
        currentWorkspace={mockPersonalWorkspace}
        onSwitch={mockOnSwitch}
        onCreateWorkspace={mockOnCreate}
      />
    );

    await user.click(screen.getByRole('button', { name: /current workspace/i }));

    const personalOption = screen.getByRole('option', { name: /personal/i });
    expect(personalOption).toHaveAttribute('aria-selected', 'true');
  });
});

// ============================================================================
// WorkspaceSettings Component Tests
// ============================================================================

describe('WorkspaceSettings Component', () => {
  const mockOnUpdate = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnLeave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays workspace name and type', () => {
    renderWithTheme(
      <WorkspaceSettings
        workspace={mockTeamWorkspace}
        currentUserRole="admin"
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onLeave={mockOnLeave}
      />
    );

    expect(screen.getByDisplayValue('Marketing Team')).toBeInTheDocument();
    expect(screen.getByText(/team/i)).toBeInTheDocument();
  });

  it('allows admin to edit workspace name', async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <WorkspaceSettings
        workspace={mockTeamWorkspace}
        currentUserRole="admin"
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onLeave={mockOnLeave}
      />
    );

    const nameInput = screen.getByLabelText(/workspace name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'New Team Name');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New Team Name' })
    );
  });

  it('disables editing for non-admin users', () => {
    renderWithTheme(
      <WorkspaceSettings
        workspace={mockTeamWorkspace}
        currentUserRole="editor"
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onLeave={mockOnLeave}
      />
    );

    expect(screen.getByLabelText(/workspace name/i)).toBeDisabled();
  });

  it('shows delete button only for admin', () => {
    const { rerender } = renderWithTheme(
      <WorkspaceSettings
        workspace={mockTeamWorkspace}
        currentUserRole="admin"
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onLeave={mockOnLeave}
      />
    );

    expect(screen.getByRole('button', { name: /delete workspace/i })).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={theme}>
        <WorkspaceSettings
          workspace={mockTeamWorkspace}
          currentUserRole="editor"
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onLeave={mockOnLeave}
        />
      </ThemeProvider>
    );

    expect(screen.queryByRole('button', { name: /delete workspace/i })).not.toBeInTheDocument();
  });

  it('shows leave button for non-owner members', () => {
    renderWithTheme(
      <WorkspaceSettings
        workspace={{ ...mockTeamWorkspace, ownerId: 'other-user' }}
        currentUserRole="editor"
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onLeave={mockOnLeave}
      />
    );

    expect(screen.getByRole('button', { name: /leave workspace/i })).toBeInTheDocument();
  });

  it('requires confirmation for delete action', async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <WorkspaceSettings
        workspace={mockTeamWorkspace}
        currentUserRole="admin"
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onLeave={mockOnLeave}
      />
    );

    await user.click(screen.getByRole('button', { name: /delete workspace/i }));

    // Confirmation modal should appear
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument();
  });
});

// ============================================================================
// MemberManagement Component Tests
// ============================================================================

describe('MemberManagement Component', () => {
  const mockOnInvite = jest.fn();
  const mockOnRemove = jest.fn();
  const mockOnUpdateRole = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays list of workspace members', () => {
    renderWithTheme(
      <MemberManagement
        members={mockMembers}
        currentUserId={mockCurrentUser.id}
        currentUserRole="admin"
        onInvite={mockOnInvite}
        onRemove={mockOnRemove}
        onUpdateRole={mockOnUpdateRole}
      />
    );

    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('Editor User')).toBeInTheDocument();
    expect(screen.getByText('Viewer User')).toBeInTheDocument();
  });

  it('shows member roles with badges', () => {
    // As viewer, all roles show as badges (not editable)
    renderWithTheme(
      <MemberManagement
        members={mockMembers}
        currentUserId={mockCurrentUser.id}
        currentUserRole="viewer"
        onInvite={mockOnInvite}
        onRemove={mockOnRemove}
        onUpdateRole={mockOnUpdateRole}
      />
    );

    expect(screen.getByTestId('role-badge-admin')).toBeInTheDocument();
    expect(screen.getByTestId('role-badge-editor')).toBeInTheDocument();
    expect(screen.getByTestId('role-badge-viewer')).toBeInTheDocument();
  });

  it('shows invite button for admin', () => {
    renderWithTheme(
      <MemberManagement
        members={mockMembers}
        currentUserId={mockCurrentUser.id}
        currentUserRole="admin"
        onInvite={mockOnInvite}
        onRemove={mockOnRemove}
        onUpdateRole={mockOnUpdateRole}
      />
    );

    expect(screen.getByRole('button', { name: /invite member/i })).toBeInTheDocument();
  });

  it('hides invite button for non-admin', () => {
    renderWithTheme(
      <MemberManagement
        members={mockMembers}
        currentUserId={mockCurrentUser.id}
        currentUserRole="viewer"
        onInvite={mockOnInvite}
        onRemove={mockOnRemove}
        onUpdateRole={mockOnUpdateRole}
      />
    );

    expect(screen.queryByRole('button', { name: /invite member/i })).not.toBeInTheDocument();
  });

  it('opens invite modal when clicking invite button', async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <MemberManagement
        members={mockMembers}
        currentUserId={mockCurrentUser.id}
        currentUserRole="admin"
        onInvite={mockOnInvite}
        onRemove={mockOnRemove}
        onUpdateRole={mockOnUpdateRole}
      />
    );

    await user.click(screen.getByRole('button', { name: /invite member/i }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/email/i)).toBeInTheDocument();
    // Use id to find the invite role select
    expect(document.getElementById('invite-role')).toBeInTheDocument();
  });

  it('submits invite with email and role', async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <MemberManagement
        members={mockMembers}
        currentUserId={mockCurrentUser.id}
        currentUserRole="admin"
        onInvite={mockOnInvite}
        onRemove={mockOnRemove}
        onUpdateRole={mockOnUpdateRole}
      />
    );

    await user.click(screen.getByRole('button', { name: /invite member/i }));

    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/email/i), 'new@example.com');
    // Select the role using the id
    const roleSelect = document.getElementById('invite-role') as HTMLSelectElement;
    await user.selectOptions(roleSelect, 'editor');
    await user.click(within(dialog).getByRole('button', { name: /send invite/i }));

    expect(mockOnInvite).toHaveBeenCalledWith({
      email: 'new@example.com',
      role: 'editor',
    });
  });

  it('allows admin to change member roles', async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <MemberManagement
        members={mockMembers}
        currentUserId={mockCurrentUser.id}
        currentUserRole="admin"
        onInvite={mockOnInvite}
        onRemove={mockOnRemove}
        onUpdateRole={mockOnUpdateRole}
      />
    );

    // Find the role selector for Editor User
    const editorRow = screen.getByText('Editor User').closest('tr') || screen.getByText('Editor User').parentElement;
    const roleSelect = within(editorRow!).getByRole('combobox');

    await user.selectOptions(roleSelect, 'viewer');

    expect(mockOnUpdateRole).toHaveBeenCalledWith('member-2', 'viewer');
  });

  it('shows remove button for members (admin only)', async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <MemberManagement
        members={mockMembers}
        currentUserId={mockCurrentUser.id}
        currentUserRole="admin"
        onInvite={mockOnInvite}
        onRemove={mockOnRemove}
        onUpdateRole={mockOnUpdateRole}
      />
    );

    // Should have remove buttons for non-current users
    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    expect(removeButtons.length).toBeGreaterThan(0);

    // Click remove on Editor User
    const editorRow = screen.getByText('Editor User').closest('tr') || screen.getByText('Editor User').parentElement;
    const removeButton = within(editorRow!).getByRole('button', { name: /remove/i });

    await user.click(removeButton);

    expect(mockOnRemove).toHaveBeenCalledWith('member-2');
  });

  it('prevents removing yourself', () => {
    renderWithTheme(
      <MemberManagement
        members={mockMembers}
        currentUserId={mockCurrentUser.id}
        currentUserRole="admin"
        onInvite={mockOnInvite}
        onRemove={mockOnRemove}
        onUpdateRole={mockOnUpdateRole}
      />
    );

    // Find the current user's row
    const adminRow = screen.getByText('Admin User').closest('tr') || screen.getByText('Admin User').parentElement;

    // Should not have a remove button for yourself
    expect(within(adminRow!).queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });

  it('shows last active time for each member', () => {
    renderWithTheme(
      <MemberManagement
        members={mockMembers}
        currentUserId={mockCurrentUser.id}
        currentUserRole="admin"
        onInvite={mockOnInvite}
        onRemove={mockOnRemove}
        onUpdateRole={mockOnUpdateRole}
      />
    );

    // Should show relative time like "2 hours ago" or formatted date
    expect(screen.getByText(/last active/i)).toBeInTheDocument();
  });
});

// ============================================================================
// RolePermissions Component Tests
// ============================================================================

describe('RolePermissions Component', () => {
  it('displays permission matrix for all roles', () => {
    renderWithTheme(<RolePermissions />);

    // Should show column headers for each role
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Editor')).toBeInTheDocument();
    expect(screen.getByText('Viewer')).toBeInTheDocument();
  });

  it('shows all permission categories', () => {
    renderWithTheme(<RolePermissions />);

    expect(screen.getByText(/view dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/manage credentials/i)).toBeInTheDocument();
    expect(screen.getByText(/trigger sync/i)).toBeInTheDocument();
    expect(screen.getByText(/execute cleanup/i)).toBeInTheDocument();
    expect(screen.getByText(/view audit log/i)).toBeInTheDocument();
    expect(screen.getByText(/manage users/i)).toBeInTheDocument();
  });

  it('correctly indicates admin permissions', () => {
    renderWithTheme(<RolePermissions />);

    const adminColumn = screen.getByTestId('permissions-admin');

    // Admin should have all permissions
    const checkmarks = within(adminColumn).getAllByTestId('permission-granted');
    expect(checkmarks.length).toBe(Object.keys(ROLE_PERMISSIONS.admin).length);
  });

  it('correctly indicates editor permissions', () => {
    renderWithTheme(<RolePermissions />);

    const editorColumn = screen.getByTestId('permissions-editor');

    // Editor should NOT have execute cleanup, audit log, or manage users
    expect(within(editorColumn).getAllByTestId('permission-denied').length).toBe(3);
  });

  it('correctly indicates viewer permissions', () => {
    renderWithTheme(<RolePermissions />);

    const viewerColumn = screen.getByTestId('permissions-viewer');

    // Viewer has limited permissions - should have many denied
    const deniedCount = within(viewerColumn).getAllByTestId('permission-denied').length;
    expect(deniedCount).toBeGreaterThan(5);
  });

  it('uses accessible indicators (not just color)', () => {
    renderWithTheme(<RolePermissions />);

    // Should use aria-labels or text alternatives
    const grantedElements = screen.getAllByTestId('permission-granted');
    grantedElements.forEach((el) => {
      expect(el).toHaveAccessibleName();
    });

    const deniedElements = screen.getAllByTestId('permission-denied');
    deniedElements.forEach((el) => {
      expect(el).toHaveAccessibleName();
    });
  });
});

// ============================================================================
// ActivityFeed Component Tests
// ============================================================================

describe('ActivityFeed Component', () => {
  const mockOnLoadMore = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays activity items in chronological order', () => {
    renderWithTheme(
      <ActivityFeed
        activities={mockActivityItems}
        isLoading={false}
        hasMore={true}
        onLoadMore={mockOnLoadMore}
      />
    );

    // Most recent first
    const activityItems = screen.getAllByTestId(/activity-item/);
    expect(activityItems.length).toBe(4);

    // Check order - first item should be most recent
    expect(activityItems[0]).toHaveTextContent(/Added Twitter credentials/i);
  });

  it('shows activity type icons', () => {
    renderWithTheme(
      <ActivityFeed
        activities={mockActivityItems}
        isLoading={false}
        hasMore={true}
        onLoadMore={mockOnLoadMore}
      />
    );

    expect(screen.getByTestId('activity-icon-credential_added')).toBeInTheDocument();
    expect(screen.getByTestId('activity-icon-member_invited')).toBeInTheDocument();
    expect(screen.getByTestId('activity-icon-rule_created')).toBeInTheDocument();
    expect(screen.getByTestId('activity-icon-sync_triggered')).toBeInTheDocument();
  });

  it('displays user name and timestamp', () => {
    renderWithTheme(
      <ActivityFeed
        activities={mockActivityItems}
        isLoading={false}
        hasMore={true}
        onLoadMore={mockOnLoadMore}
      />
    );

    // Use getAllByText since Admin User appears multiple times
    expect(screen.getAllByText('Admin User').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Editor User').length).toBeGreaterThan(0);
    // Should show relative time
    expect(screen.getAllByText(/ago|today|yesterday/i).length).toBeGreaterThan(0);
  });

  it('shows activity description', () => {
    renderWithTheme(
      <ActivityFeed
        activities={mockActivityItems}
        isLoading={false}
        hasMore={true}
        onLoadMore={mockOnLoadMore}
      />
    );

    expect(screen.getByText(/Added Twitter credentials/i)).toBeInTheDocument();
    expect(screen.getByText(/Invited editor@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/Created cleanup rule/i)).toBeInTheDocument();
    expect(screen.getByText(/Triggered sync/i)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    renderWithTheme(
      <ActivityFeed
        activities={[]}
        isLoading={true}
        hasMore={true}
        onLoadMore={mockOnLoadMore}
      />
    );

    expect(screen.getByTestId('activity-loading')).toBeInTheDocument();
  });

  it('shows empty state when no activities', () => {
    renderWithTheme(
      <ActivityFeed
        activities={[]}
        isLoading={false}
        hasMore={false}
        onLoadMore={mockOnLoadMore}
      />
    );

    expect(screen.getByText(/no activity yet/i)).toBeInTheDocument();
  });

  it('shows load more button when hasMore is true', () => {
    renderWithTheme(
      <ActivityFeed
        activities={mockActivityItems}
        isLoading={false}
        hasMore={true}
        onLoadMore={mockOnLoadMore}
      />
    );

    expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument();
  });

  it('hides load more button when hasMore is false', () => {
    renderWithTheme(
      <ActivityFeed
        activities={mockActivityItems}
        isLoading={false}
        hasMore={false}
        onLoadMore={mockOnLoadMore}
      />
    );

    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
  });

  it('calls onLoadMore when clicking load more', async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <ActivityFeed
        activities={mockActivityItems}
        isLoading={false}
        hasMore={true}
        onLoadMore={mockOnLoadMore}
      />
    );

    await user.click(screen.getByRole('button', { name: /load more/i }));

    expect(mockOnLoadMore).toHaveBeenCalled();
  });

  it('filters activities by type', async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <ActivityFeed
        activities={mockActivityItems}
        isLoading={false}
        hasMore={false}
        onLoadMore={mockOnLoadMore}
      />
    );

    // Find filter dropdown
    const filterSelect = screen.getByLabelText(/filter by type/i);
    await user.selectOptions(filterSelect, 'credential_added');

    // Should only show credential activities
    expect(screen.getByText(/Added Twitter credentials/i)).toBeInTheDocument();
    expect(screen.queryByText(/Invited editor@example.com/i)).not.toBeInTheDocument();
  });
});

// ============================================================================
// SharedCredentials Component Tests
// ============================================================================

describe('SharedCredentials Component', () => {
  const mockOnShare = jest.fn();
  const mockOnRevoke = jest.fn();
  const mockOnUpdateAccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays list of shared credentials', () => {
    renderWithTheme(
      <SharedCredentials
        credentials={mockSharedCredentials}
        currentUserRole="admin"
        onShare={mockOnShare}
        onRevoke={mockOnRevoke}
        onUpdateAccess={mockOnUpdateAccess}
      />
    );

    expect(screen.getByText('Company Twitter')).toBeInTheDocument();
    expect(screen.getByText('Marketing Bluesky')).toBeInTheDocument();
  });

  it('shows platform icons for credentials', () => {
    renderWithTheme(
      <SharedCredentials
        credentials={mockSharedCredentials}
        currentUserRole="admin"
        onShare={mockOnShare}
        onRevoke={mockOnRevoke}
        onUpdateAccess={mockOnUpdateAccess}
      />
    );

    expect(screen.getByTestId('platform-icon-twitter')).toBeInTheDocument();
    expect(screen.getByTestId('platform-icon-bluesky')).toBeInTheDocument();
  });

  it('shows access level badges', () => {
    // Use viewer role to see badges (admin sees select dropdowns)
    renderWithTheme(
      <SharedCredentials
        credentials={mockSharedCredentials}
        currentUserRole="viewer"
        onShare={mockOnShare}
        onRevoke={mockOnRevoke}
        onUpdateAccess={mockOnUpdateAccess}
      />
    );

    expect(screen.getByText('Full Access')).toBeInTheDocument();
    expect(screen.getByText('Read Only')).toBeInTheDocument();
  });

  it('shows who shared the credential', () => {
    renderWithTheme(
      <SharedCredentials
        credentials={mockSharedCredentials}
        currentUserRole="admin"
        onShare={mockOnShare}
        onRevoke={mockOnRevoke}
        onUpdateAccess={mockOnUpdateAccess}
      />
    );

    // Multiple credentials can be shared by same user
    expect(screen.getAllByText(/shared by Admin User/i).length).toBeGreaterThan(0);
  });

  it('shows last used timestamp', () => {
    renderWithTheme(
      <SharedCredentials
        credentials={mockSharedCredentials}
        currentUserRole="admin"
        onShare={mockOnShare}
        onRevoke={mockOnRevoke}
        onUpdateAccess={mockOnUpdateAccess}
      />
    );

    expect(screen.getAllByText(/last used/i).length).toBeGreaterThan(0);
  });

  it('allows admin to revoke access', async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <SharedCredentials
        credentials={mockSharedCredentials}
        currentUserRole="admin"
        onShare={mockOnShare}
        onRevoke={mockOnRevoke}
        onUpdateAccess={mockOnUpdateAccess}
      />
    );

    const revokeButtons = screen.getAllByRole('button', { name: /revoke/i });
    await user.click(revokeButtons[0]);

    expect(mockOnRevoke).toHaveBeenCalledWith('cred-1');
  });

  it('hides revoke button for non-admin', () => {
    renderWithTheme(
      <SharedCredentials
        credentials={mockSharedCredentials}
        currentUserRole="viewer"
        onShare={mockOnShare}
        onRevoke={mockOnRevoke}
        onUpdateAccess={mockOnUpdateAccess}
      />
    );

    expect(screen.queryByRole('button', { name: /revoke/i })).not.toBeInTheDocument();
  });

  it('allows admin to share new credential', async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <SharedCredentials
        credentials={mockSharedCredentials}
        currentUserRole="admin"
        onShare={mockOnShare}
        onRevoke={mockOnRevoke}
        onUpdateAccess={mockOnUpdateAccess}
      />
    );

    await user.click(screen.getByRole('button', { name: /share credential/i }));

    // Should open share modal
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/select credential/i)).toBeInTheDocument();
    // Use id for access level select in modal
    expect(document.getElementById('access-level-select')).toBeInTheDocument();
  });

  it('allows admin to update access level', async () => {
    const user = userEvent.setup();

    renderWithTheme(
      <SharedCredentials
        credentials={mockSharedCredentials}
        currentUserRole="admin"
        onShare={mockOnShare}
        onRevoke={mockOnRevoke}
        onUpdateAccess={mockOnUpdateAccess}
      />
    );

    // Find access level selector for first credential
    const firstCredRow = screen.getByText('Company Twitter').closest('tr') ||
                         screen.getByText('Company Twitter').parentElement;
    const accessSelect = within(firstCredRow!).getByRole('combobox');

    await user.selectOptions(accessSelect, 'read_only');

    expect(mockOnUpdateAccess).toHaveBeenCalledWith('cred-1', 'read_only');
  });

  it('shows audit info button for credentials', () => {
    renderWithTheme(
      <SharedCredentials
        credentials={mockSharedCredentials}
        currentUserRole="admin"
        onShare={mockOnShare}
        onRevoke={mockOnRevoke}
        onUpdateAccess={mockOnUpdateAccess}
      />
    );

    expect(screen.getAllByRole('button', { name: /view audit/i }).length).toBe(2);
  });
});

// ============================================================================
// useWorkspace Hook Tests
// ============================================================================

describe('useWorkspace Hook', () => {
  beforeEach(() => {
    clearWorkspaceCache();
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches current workspace on mount', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ workspace: mockTeamWorkspace, workspaces: mockWorkspaces }),
    });

    const { result } = renderHook(() => useWorkspace());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.currentWorkspace).toEqual(mockTeamWorkspace);
    expect(result.current.workspaces).toEqual(mockWorkspaces);
  });

  it('handles fetch error gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useWorkspace());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toMatch(/network error/i);
  });

  it('provides switchWorkspace function', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ workspace: mockPersonalWorkspace, workspaces: mockWorkspaces }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ workspace: mockTeamWorkspace, workspaces: mockWorkspaces }),
      });

    const { result } = renderHook(() => useWorkspace());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.switchWorkspace(mockTeamWorkspace.id);
    });

    expect(result.current.currentWorkspace?.id).toBe(mockTeamWorkspace.id);
  });

  it('provides createWorkspace function', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ workspace: mockPersonalWorkspace, workspaces: mockWorkspaces }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ workspace: { id: 'new-ws', name: 'New Workspace', type: 'team' } }),
      });

    const { result } = renderHook(() => useWorkspace());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      const newWs = await result.current.createWorkspace({ name: 'New Workspace', type: 'team' });
      expect(newWs?.name).toBe('New Workspace');
    });
  });

  it('caches workspace data', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ workspace: mockTeamWorkspace, workspaces: mockWorkspaces }),
    });

    // First render
    const { result: result1 } = renderHook(() => useWorkspace());
    await waitFor(() => expect(result1.current.loading).toBe(false));

    // Second render should use cache
    const { result: result2 } = renderHook(() => useWorkspace());

    // Should immediately have data (from cache)
    expect(result2.current.currentWorkspace).toEqual(mockTeamWorkspace);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('provides refresh function to bypass cache', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ workspace: mockPersonalWorkspace, workspaces: mockWorkspaces }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ workspace: mockTeamWorkspace, workspaces: mockWorkspaces }),
      });

    const { result } = renderHook(() => useWorkspace());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.refresh();
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

// ============================================================================
// useWorkspaceMembers Hook Tests
// ============================================================================

describe('useWorkspaceMembers Hook', () => {
  beforeEach(() => {
    clearMembersCache();
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches members for given workspace', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ members: mockMembers }),
    });

    const { result } = renderHook(() => useWorkspaceMembers(mockTeamWorkspace.id));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.members).toEqual(mockMembers);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/api/workspaces/${mockTeamWorkspace.id}/members`)
    );
  });

  it('does not fetch for personal workspace', async () => {
    const { result } = renderHook(() => useWorkspaceMembers(mockPersonalWorkspace.id, { isPersonal: true }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.members).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('provides inviteMember function', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ members: mockMembers }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, member: { id: 'new-member' } }),
      });

    const { result } = renderHook(() => useWorkspaceMembers(mockTeamWorkspace.id));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.inviteMember({ email: 'new@example.com', role: 'viewer' });
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/members/invite'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('new@example.com'),
      })
    );
  });

  it('provides removeMember function', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ members: mockMembers }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

    const { result } = renderHook(() => useWorkspaceMembers(mockTeamWorkspace.id));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.removeMember('member-2');
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/members/member-2'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('provides updateMemberRole function', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ members: mockMembers }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

    const { result } = renderHook(() => useWorkspaceMembers(mockTeamWorkspace.id));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateMemberRole('member-2', 'admin');
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/members/member-2/role'),
      expect.objectContaining({
        method: 'PATCH',
        body: expect.stringContaining('admin'),
      })
    );
  });
});

// ============================================================================
// useActivityFeed Hook Tests
// ============================================================================

describe('useActivityFeed Hook', () => {
  beforeEach(() => {
    clearActivityCache();
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches activity for workspace', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        activities: mockActivityItems,
        hasMore: true,
        nextCursor: 'cursor-123',
      }),
    });

    const { result } = renderHook(() => useActivityFeed(mockTeamWorkspace.id));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.activities).toEqual(mockActivityItems);
    expect(result.current.hasMore).toBe(true);
  });

  it('supports pagination with loadMore', async () => {
    const moreActivities = [
      {
        id: 'activity-5',
        type: 'login' as const,
        userId: 'user-3',
        userName: 'Viewer User',
        description: 'Logged in',
        timestamp: '2025-01-12T10:00:00Z',
        metadata: {},
      },
    ];

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          activities: mockActivityItems,
          hasMore: true,
          nextCursor: 'cursor-123',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          activities: moreActivities,
          hasMore: false,
          nextCursor: null,
        }),
      });

    const { result } = renderHook(() => useActivityFeed(mockTeamWorkspace.id));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.activities.length).toBe(5);
    expect(result.current.hasMore).toBe(false);
  });

  it('supports filtering by activity type', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        activities: mockActivityItems.filter((a) => a.type === 'credential_added'),
        hasMore: false,
      }),
    });

    const { result } = renderHook(() =>
      useActivityFeed(mockTeamWorkspace.id, { filterType: 'credential_added' })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.activities.length).toBe(1);
    expect(result.current.activities[0].type).toBe('credential_added');
  });

  it('auto-refreshes at specified interval', async () => {
    jest.useFakeTimers();

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        activities: mockActivityItems,
        hasMore: false,
      }),
    });

    renderHook(() => useActivityFeed(mockTeamWorkspace.id, { refreshInterval: 30000 }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    // Advance 30 seconds
    jest.advanceTimersByTime(30000);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    jest.useRealTimers();
  });

  it('cleans up interval on unmount', async () => {
    jest.useFakeTimers();

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        activities: mockActivityItems,
        hasMore: false,
      }),
    });

    const { unmount } = renderHook(() =>
      useActivityFeed(mockTeamWorkspace.id, { refreshInterval: 30000 })
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    unmount();

    // Advance time - should not trigger more fetches
    jest.advanceTimersByTime(60000);

    expect(global.fetch).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });
});

// ============================================================================
// Integration Tests: Workspace + Members + Activity
// ============================================================================

describe('Team Collaboration Integration', () => {
  beforeEach(() => {
    clearWorkspaceCache();
    clearMembersCache();
    clearActivityCache();
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('switching workspace clears member and activity caches', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ workspace: mockPersonalWorkspace, workspaces: mockWorkspaces }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ members: mockMembers }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: mockActivityItems, hasMore: false }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
      .mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ workspace: mockTeamWorkspace, workspaces: mockWorkspaces }),
      });

    // Render workspace hook
    const { result: wsResult } = renderHook(() => useWorkspace());
    await waitFor(() => expect(wsResult.current.loading).toBe(false));

    // Render members hook for personal workspace
    const { result: membersResult } = renderHook(() =>
      useWorkspaceMembers(mockPersonalWorkspace.id)
    );
    await waitFor(() => expect(membersResult.current.loading).toBe(false));

    // Render activity hook for personal workspace
    const { result: activityResult } = renderHook(() =>
      useActivityFeed(mockPersonalWorkspace.id)
    );
    await waitFor(() => expect(activityResult.current.loading).toBe(false));

    // Switch workspace - this should clear caches
    await act(async () => {
      await wsResult.current.switchWorkspace(mockTeamWorkspace.id);
    });

    // Workspace fetch, members fetch, activity fetch, switch call, + possible refetch
    expect(global.fetch).toHaveBeenCalledTimes(5);
  });
});
