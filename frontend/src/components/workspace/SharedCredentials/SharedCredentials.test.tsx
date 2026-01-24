import type { ReactElement } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/styles/ThemeContext';
import { SharedCredentials, type SharedCredential } from './SharedCredentials';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const mockCredentials: SharedCredential[] = [
  {
    id: 'cred-1',
    name: 'Main Twitter Account',
    platform: 'twitter',
    sharedBy: 'user-1',
    sharedByName: 'John Doe',
    sharedAt: '2024-01-15T10:00:00Z',
    accessLevel: 'full',
    lastUsed: new Date().toISOString(),
  },
  {
    id: 'cred-2',
    name: 'Team Bluesky',
    platform: 'bluesky',
    sharedBy: 'user-2',
    sharedByName: 'Jane Smith',
    sharedAt: '2024-02-01T14:30:00Z',
    accessLevel: 'read_only',
    lastUsed: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'cred-3',
    name: 'Marketing Mastodon',
    platform: 'mastodon',
    sharedBy: 'user-1',
    sharedByName: 'John Doe',
    sharedAt: '2024-03-10T09:00:00Z',
    accessLevel: 'full',
    lastUsed: new Date(Date.now() - 86400000).toISOString(),
  },
];

describe('SharedCredentials', () => {
  const defaultProps = {
    credentials: mockCredentials,
    currentUserRole: 'admin' as const,
    onShare: jest.fn(),
    onRevoke: jest.fn(),
    onUpdateAccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders shared credentials container', () => {
    renderWithTheme(<SharedCredentials {...defaultProps} />);
    expect(screen.getByTestId('shared-credentials')).toBeInTheDocument();
  });

  it('displays Shared Credentials title', () => {
    renderWithTheme(<SharedCredentials {...defaultProps} />);
    expect(screen.getByRole('heading', { name: /shared credentials/i })).toBeInTheDocument();
  });

  it('displays all credentials in the table', () => {
    renderWithTheme(<SharedCredentials {...defaultProps} />);
    expect(screen.getByText('Main Twitter Account')).toBeInTheDocument();
    expect(screen.getByText('Team Bluesky')).toBeInTheDocument();
    expect(screen.getByText('Marketing Mastodon')).toBeInTheDocument();
  });

  it('displays platform icons', () => {
    renderWithTheme(<SharedCredentials {...defaultProps} />);
    expect(screen.getByTestId('platform-icon-twitter')).toBeInTheDocument();
    expect(screen.getByTestId('platform-icon-bluesky')).toBeInTheDocument();
    expect(screen.getByTestId('platform-icon-mastodon')).toBeInTheDocument();
  });

  it('displays shared by information', () => {
    renderWithTheme(<SharedCredentials {...defaultProps} />);
    expect(screen.getAllByText('Shared by John Doe').length).toBeGreaterThan(0);
    expect(screen.getByText('Shared by Jane Smith')).toBeInTheDocument();
  });

  it('shows Share Credential button for admins', () => {
    renderWithTheme(<SharedCredentials {...defaultProps} />);
    expect(screen.getByRole('button', { name: /share credential/i })).toBeInTheDocument();
  });

  it('hides Share Credential button for non-admins', () => {
    renderWithTheme(
      <SharedCredentials {...defaultProps} currentUserRole="viewer" />
    );
    expect(screen.queryByRole('button', { name: /share credential/i })).not.toBeInTheDocument();
  });

  it('shows empty state when no credentials', () => {
    renderWithTheme(
      <SharedCredentials {...defaultProps} credentials={[]} />
    );
    expect(screen.getByText('No shared credentials')).toBeInTheDocument();
  });

  it('opens share modal when clicking Share Credential', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SharedCredentials {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /share credential/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /share credential/i })).toBeInTheDocument();
  });

  it('shows access level dropdown for admins', () => {
    renderWithTheme(<SharedCredentials {...defaultProps} />);
    const accessSelects = screen.getAllByRole('combobox', { name: /access level/i });
    expect(accessSelects.length).toBeGreaterThan(0);
  });

  it('shows access level badge for non-admins', () => {
    renderWithTheme(
      <SharedCredentials {...defaultProps} currentUserRole="viewer" />
    );
    expect(screen.getAllByText('Full Access').length).toBeGreaterThan(0);
    expect(screen.getByText('Read Only')).toBeInTheDocument();
  });

  it('calls onUpdateAccess when changing access level', async () => {
    const user = userEvent.setup();
    const onUpdateAccess = jest.fn();
    renderWithTheme(<SharedCredentials {...defaultProps} onUpdateAccess={onUpdateAccess} />);

    const accessSelects = screen.getAllByRole('combobox', { name: /access level/i });
    await user.selectOptions(accessSelects[0], 'read_only');

    expect(onUpdateAccess).toHaveBeenCalledWith('cred-1', 'read_only');
  });

  it('shows Revoke button for admins', () => {
    renderWithTheme(<SharedCredentials {...defaultProps} />);
    const revokeButtons = screen.getAllByRole('button', { name: /revoke/i });
    expect(revokeButtons).toHaveLength(3);
  });

  it('hides Revoke button for non-admins', () => {
    renderWithTheme(
      <SharedCredentials {...defaultProps} currentUserRole="viewer" />
    );
    expect(screen.queryByRole('button', { name: /revoke/i })).not.toBeInTheDocument();
  });

  it('calls onRevoke when clicking Revoke button', async () => {
    const user = userEvent.setup();
    const onRevoke = jest.fn();
    renderWithTheme(<SharedCredentials {...defaultProps} onRevoke={onRevoke} />);

    const revokeButtons = screen.getAllByRole('button', { name: /revoke/i });
    await user.click(revokeButtons[0]);

    expect(onRevoke).toHaveBeenCalledWith('cred-1');
  });

  it('shows View Audit button for all credentials', () => {
    renderWithTheme(<SharedCredentials {...defaultProps} />);
    const auditButtons = screen.getAllByRole('button', { name: /view audit/i });
    expect(auditButtons).toHaveLength(3);
  });

  it('displays table with correct headers', () => {
    renderWithTheme(<SharedCredentials {...defaultProps} />);
    expect(screen.getByText('Credential')).toBeInTheDocument();
    expect(screen.getByText('Access Level')).toBeInTheDocument();
    expect(screen.getByText('Shared By')).toBeInTheDocument();
    expect(screen.getByText('Last Used')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });
});
