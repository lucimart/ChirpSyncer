import type { ReactElement } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/styles/ThemeContext';
import { MemberManagement, type WorkspaceMember } from './MemberManagement';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const mockMembers: WorkspaceMember[] = [
  {
    id: 'member-1',
    userId: 'user-1',
    email: 'john@example.com',
    name: 'John Doe',
    role: 'admin',
    joinedAt: '2024-01-01T00:00:00Z',
    lastActive: new Date().toISOString(),
  },
  {
    id: 'member-2',
    userId: 'user-2',
    email: 'jane@example.com',
    name: 'Jane Smith',
    role: 'editor',
    joinedAt: '2024-02-01T00:00:00Z',
    lastActive: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'member-3',
    userId: 'user-3',
    email: 'bob@example.com',
    name: 'Bob Wilson',
    role: 'viewer',
    joinedAt: '2024-03-01T00:00:00Z',
    lastActive: new Date(Date.now() - 86400000).toISOString(),
  },
];

describe('MemberManagement', () => {
  const defaultProps = {
    members: mockMembers,
    currentUserId: 'user-1',
    currentUserRole: 'admin' as const,
    onInvite: jest.fn(),
    onRemove: jest.fn(),
    onUpdateRole: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders member management container', () => {
    renderWithTheme(<MemberManagement {...defaultProps} />);
    expect(screen.getByTestId('member-management')).toBeInTheDocument();
  });

  it('displays all members in the table', () => {
    renderWithTheme(<MemberManagement {...defaultProps} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
  });

  it('displays member emails', () => {
    renderWithTheme(<MemberManagement {...defaultProps} />);
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
  });

  it('shows Invite Member button for admins', () => {
    renderWithTheme(<MemberManagement {...defaultProps} />);
    expect(screen.getByRole('button', { name: /invite member/i })).toBeInTheDocument();
  });

  it('hides Invite Member button for non-admins', () => {
    renderWithTheme(
      <MemberManagement {...defaultProps} currentUserRole="viewer" />
    );
    expect(screen.queryByRole('button', { name: /invite member/i })).not.toBeInTheDocument();
  });

  it('opens invite modal when clicking Invite Member', async () => {
    const user = userEvent.setup();
    renderWithTheme(<MemberManagement {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /invite member/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /invite member/i })).toBeInTheDocument();
  });

  it('calls onInvite with email and role when submitting invite form', async () => {
    const user = userEvent.setup();
    const onInvite = jest.fn();
    renderWithTheme(<MemberManagement {...defaultProps} onInvite={onInvite} />);

    await user.click(screen.getByRole('button', { name: /invite member/i }));

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'newmember@example.com');

    const roleSelect = screen.getByLabelText('Role');
    await user.selectOptions(roleSelect, 'editor');

    await user.click(screen.getByRole('button', { name: /send invite/i }));

    expect(onInvite).toHaveBeenCalledWith({
      email: 'newmember@example.com',
      role: 'editor',
    });
  });

  it('shows role dropdown for other members when admin', () => {
    renderWithTheme(<MemberManagement {...defaultProps} />);

    const janeRow = screen.getByTestId('member-row-member-2');
    expect(within(janeRow).getByRole('combobox', { name: /change role for jane/i })).toBeInTheDocument();
  });

  it('shows role badge instead of dropdown for current user', () => {
    renderWithTheme(<MemberManagement {...defaultProps} />);

    const johnRow = screen.getByTestId('member-row-member-1');
    expect(within(johnRow).getByTestId('role-badge-admin')).toBeInTheDocument();
    expect(within(johnRow).queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('calls onUpdateRole when changing member role', async () => {
    const user = userEvent.setup();
    const onUpdateRole = jest.fn();
    renderWithTheme(<MemberManagement {...defaultProps} onUpdateRole={onUpdateRole} />);

    const janeRow = screen.getByTestId('member-row-member-2');
    const roleSelect = within(janeRow).getByRole('combobox');
    await user.selectOptions(roleSelect, 'viewer');

    expect(onUpdateRole).toHaveBeenCalledWith('member-2', 'viewer');
  });

  it('shows remove button for other members when admin', () => {
    renderWithTheme(<MemberManagement {...defaultProps} />);

    const janeRow = screen.getByTestId('member-row-member-2');
    expect(within(janeRow).getByRole('button', { name: /remove jane/i })).toBeInTheDocument();
  });

  it('hides remove button for current user', () => {
    renderWithTheme(<MemberManagement {...defaultProps} />);

    const johnRow = screen.getByTestId('member-row-member-1');
    expect(within(johnRow).queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });

  it('calls onRemove when clicking remove button', async () => {
    const user = userEvent.setup();
    const onRemove = jest.fn();
    renderWithTheme(<MemberManagement {...defaultProps} onRemove={onRemove} />);

    const janeRow = screen.getByTestId('member-row-member-2');
    await user.click(within(janeRow).getByRole('button', { name: /remove jane/i }));

    expect(onRemove).toHaveBeenCalledWith('member-2');
  });

  it('hides action column for non-admins', () => {
    renderWithTheme(
      <MemberManagement {...defaultProps} currentUserRole="viewer" />
    );
    expect(screen.queryByText('Actions')).not.toBeInTheDocument();
  });

  it('displays table with correct headers', () => {
    renderWithTheme(<MemberManagement {...defaultProps} />);
    expect(screen.getByRole('columnheader', { name: /member/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /role/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /last active/i })).toBeInTheDocument();
  });
});
