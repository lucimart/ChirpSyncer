import type { ReactElement } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/styles/ThemeContext';
import WorkspacesPage from './page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/dashboard/workspaces',
}));

// Mock auth
const mockUser = { id: 1, username: 'testuser', is_admin: false };
jest.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Mock workspace hook
const mockSwitchWorkspace = jest.fn();
const mockCreateWorkspace = jest.fn();
const mockWorkspaces = [
  { id: 'ws1', name: 'Personal', type: 'personal', ownerId: 1 },
  { id: 'ws2', name: 'Marketing Team', type: 'team', ownerId: 1 },
];
const mockCurrentWorkspace = mockWorkspaces[1];

jest.mock('@/hooks/useWorkspace', () => ({
  useWorkspace: () => ({
    currentWorkspace: mockCurrentWorkspace,
    workspaces: mockWorkspaces,
    switchWorkspace: mockSwitchWorkspace,
    createWorkspace: mockCreateWorkspace,
  }),
}));

// Mock workspace members hook
const mockInviteMember = jest.fn();
const mockRemoveMember = jest.fn();
const mockUpdateMemberRole = jest.fn();
jest.mock('@/hooks/useWorkspaceMembers', () => ({
  useWorkspaceMembers: () => ({
    members: [
      { userId: '1', username: 'testuser', email: 'test@example.com', role: 'admin' },
      { userId: '2', username: 'member1', email: 'member@example.com', role: 'editor' },
    ],
    inviteMember: mockInviteMember,
    removeMember: mockRemoveMember,
    updateMemberRole: mockUpdateMemberRole,
  }),
}));

// Mock activity feed hook
jest.mock('@/hooks/useActivityFeed', () => ({
  useActivityFeed: () => ({
    activities: [
      {
        id: '1',
        type: 'member_joined',
        actor: 'member1',
        created_at: '2024-01-15T10:00:00Z',
      },
    ],
    loading: false,
    hasMore: false,
    loadMore: jest.fn(),
  }),
}));

// Mock workspace components
jest.mock('@/components/workspace', () => ({
  ActivityFeed: ({ activities }: { activities: unknown[] }) => (
    <div data-testid="activity-feed">Activities: {activities.length}</div>
  ),
  MemberManagement: ({ members }: { members: unknown[] }) => (
    <div data-testid="member-management">Members: {members.length}</div>
  ),
  RolePermissions: () => <div data-testid="role-permissions">Role Permissions</div>,
  SharedCredentials: ({ credentials }: { credentials: unknown[] }) => (
    <div data-testid="shared-credentials">Credentials: {credentials.length}</div>
  ),
  WorkspaceSettings: ({ workspace }: { workspace: { name: string } }) => (
    <div data-testid="workspace-settings">Settings for {workspace.name}</div>
  ),
  WorkspaceSwitcher: ({ workspaces }: { workspaces: unknown[] }) => (
    <div data-testid="workspace-switcher">Switcher: {workspaces.length}</div>
  ),
}));

function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{ui}</ThemeProvider>
    </QueryClientProvider>
  );
}

describe('WorkspacesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateWorkspace.mockResolvedValue({ success: true });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { credentials: [] } }),
    });
  });

  it('renders workspaces page with header', () => {
    renderWithProviders(<WorkspacesPage />);

    expect(screen.getByText('Workspaces')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Collaborate with your team, share credentials, and manage roles.'
      )
    ).toBeInTheDocument();
  });

  it('renders new workspace button', () => {
    renderWithProviders(<WorkspacesPage />);

    expect(
      screen.getByRole('button', { name: /new workspace/i })
    ).toBeInTheDocument();
  });

  it('displays tabs for different sections', () => {
    renderWithProviders(<WorkspacesPage />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Members')).toBeInTheDocument();
    expect(screen.getByText('Shared Credentials')).toBeInTheDocument();
    expect(screen.getByText('Activity')).toBeInTheDocument();
  });

  it('shows settings tab by default', () => {
    renderWithProviders(<WorkspacesPage />);

    expect(screen.getByText('Workspace Settings')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-settings')).toBeInTheDocument();
    expect(screen.getByTestId('role-permissions')).toBeInTheDocument();
  });

  it('switches to members tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkspacesPage />);

    await user.click(screen.getByText('Members'));

    await waitFor(() => {
      expect(screen.getByTestId('member-management')).toBeInTheDocument();
    });
  });

  it('switches to credentials tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkspacesPage />);

    await user.click(screen.getByText('Shared Credentials'));

    await waitFor(() => {
      expect(screen.getByTestId('shared-credentials')).toBeInTheDocument();
    });
  });

  it('switches to activity tab', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkspacesPage />);

    await user.click(screen.getByText('Activity'));

    await waitFor(() => {
      expect(screen.getByTestId('activity-feed')).toBeInTheDocument();
    });
  });

  it('opens create workspace modal', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkspacesPage />);

    await user.click(screen.getByRole('button', { name: /new workspace/i }));

    expect(screen.getByText('Create Workspace')).toBeInTheDocument();
    expect(screen.getByLabelText('Workspace Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Workspace Type')).toBeInTheDocument();
  });

  it('creates a new workspace', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkspacesPage />);

    await user.click(screen.getByRole('button', { name: /new workspace/i }));
    await user.type(screen.getByLabelText('Workspace Name'), 'New Team');
    await user.click(screen.getByRole('button', { name: /^create$/i }));

    await waitFor(() => {
      expect(mockCreateWorkspace).toHaveBeenCalledWith({
        name: 'New Team',
        type: 'team',
      });
    });
  });

  it('can select workspace type when creating', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkspacesPage />);

    await user.click(screen.getByRole('button', { name: /new workspace/i }));

    const typeSelect = screen.getByLabelText('Workspace Type');
    await user.selectOptions(typeSelect, 'personal');

    expect(typeSelect).toHaveValue('personal');
  });

  it('disables create button when name is empty', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkspacesPage />);

    await user.click(screen.getByRole('button', { name: /new workspace/i }));

    const createButton = screen.getByRole('button', { name: /^create$/i });
    expect(createButton).toBeDisabled();
  });

  it('closes modal on cancel', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkspacesPage />);

    await user.click(screen.getByRole('button', { name: /new workspace/i }));
    expect(screen.getByText('Create Workspace')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByText('Create Workspace')).not.toBeInTheDocument();
    });
  });

  it('displays workspace switcher', () => {
    renderWithProviders(<WorkspacesPage />);

    expect(screen.getByTestId('workspace-switcher')).toBeInTheDocument();
  });

  it('has accessible tab navigation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WorkspacesPage />);

    const settingsTab = screen.getByText('Settings');
    const membersTab = screen.getByText('Members');

    // Both tabs should be clickable
    await user.click(membersTab);
    await waitFor(() => {
      expect(screen.getByTestId('member-management')).toBeInTheDocument();
    });

    await user.click(settingsTab);
    await waitFor(() => {
      expect(screen.getByTestId('workspace-settings')).toBeInTheDocument();
    });
  });
});
