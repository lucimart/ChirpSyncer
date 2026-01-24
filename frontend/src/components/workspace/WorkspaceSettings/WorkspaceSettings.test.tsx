import type { ReactElement } from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/styles/ThemeContext';
import { WorkspaceSettings } from './WorkspaceSettings';
import type { Workspace } from '../WorkspaceSwitcher';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const mockWorkspace: Workspace = {
  id: 'ws-1',
  name: 'My Workspace',
  type: 'team',
  ownerId: 'user-1',
  memberCount: 5,
  createdAt: '2024-01-01T00:00:00Z',
};

describe('WorkspaceSettings', () => {
  const defaultProps = {
    workspace: mockWorkspace,
    currentUserRole: 'admin' as const,
    isOwner: true,
    onUpdate: jest.fn(),
    onDelete: jest.fn(),
    onLeave: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders workspace settings container', () => {
    renderWithTheme(<WorkspaceSettings {...defaultProps} />);
    expect(screen.getByTestId('workspace-settings')).toBeInTheDocument();
  });

  it('displays General section title', () => {
    renderWithTheme(<WorkspaceSettings {...defaultProps} />);
    expect(screen.getByText('General')).toBeInTheDocument();
  });

  it('displays workspace name input', () => {
    renderWithTheme(<WorkspaceSettings {...defaultProps} />);
    const nameInput = screen.getByLabelText(/workspace name/i);
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toHaveValue('My Workspace');
  });

  it('displays workspace type', () => {
    renderWithTheme(<WorkspaceSettings {...defaultProps} />);
    expect(screen.getByText('Workspace Type')).toBeInTheDocument();
    expect(screen.getByText('team')).toBeInTheDocument();
  });

  it('enables name input for admins', () => {
    renderWithTheme(<WorkspaceSettings {...defaultProps} />);
    const nameInput = screen.getByLabelText(/workspace name/i);
    expect(nameInput).not.toBeDisabled();
  });

  it('disables name input for non-admins', () => {
    renderWithTheme(
      <WorkspaceSettings {...defaultProps} currentUserRole="viewer" />
    );
    const nameInput = screen.getByLabelText(/workspace name/i);
    expect(nameInput).toBeDisabled();
  });

  it('shows Save Changes button for admins', () => {
    renderWithTheme(<WorkspaceSettings {...defaultProps} />);
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  it('hides Save Changes button for non-admins', () => {
    renderWithTheme(
      <WorkspaceSettings {...defaultProps} currentUserRole="viewer" />
    );
    expect(screen.queryByRole('button', { name: /save changes/i })).not.toBeInTheDocument();
  });

  it('disables Save Changes when name unchanged', () => {
    renderWithTheme(<WorkspaceSettings {...defaultProps} />);
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
  });

  it('enables Save Changes when name is changed', async () => {
    const user = userEvent.setup();
    renderWithTheme(<WorkspaceSettings {...defaultProps} />);

    const nameInput = screen.getByLabelText(/workspace name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'New Name');

    expect(screen.getByRole('button', { name: /save changes/i })).not.toBeDisabled();
  });

  it('calls onUpdate when saving changes', async () => {
    const user = userEvent.setup();
    const onUpdate = jest.fn();
    renderWithTheme(<WorkspaceSettings {...defaultProps} onUpdate={onUpdate} />);

    const nameInput = screen.getByLabelText(/workspace name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'New Name');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    expect(onUpdate).toHaveBeenCalledWith({ name: 'New Name' });
  });

  it('displays Danger Zone section', () => {
    renderWithTheme(<WorkspaceSettings {...defaultProps} />);
    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
  });

  it('shows Delete Workspace button for admins', () => {
    renderWithTheme(<WorkspaceSettings {...defaultProps} />);
    expect(screen.getByRole('button', { name: /delete workspace/i })).toBeInTheDocument();
  });

  it('hides Delete Workspace button for non-admins', () => {
    renderWithTheme(
      <WorkspaceSettings {...defaultProps} currentUserRole="viewer" />
    );
    expect(screen.queryByRole('button', { name: /delete workspace/i })).not.toBeInTheDocument();
  });

  it('shows Leave Workspace button for non-owners', () => {
    renderWithTheme(<WorkspaceSettings {...defaultProps} isOwner={false} />);
    expect(screen.getByRole('button', { name: /leave workspace/i })).toBeInTheDocument();
  });

  it('hides Leave Workspace button for owners', () => {
    renderWithTheme(<WorkspaceSettings {...defaultProps} isOwner={true} />);
    expect(screen.queryByRole('button', { name: /leave workspace/i })).not.toBeInTheDocument();
  });

  it('calls onLeave when clicking Leave Workspace', async () => {
    const user = userEvent.setup();
    const onLeave = jest.fn();
    renderWithTheme(<WorkspaceSettings {...defaultProps} isOwner={false} onLeave={onLeave} />);

    await user.click(screen.getByRole('button', { name: /leave workspace/i }));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('opens delete confirmation modal when clicking Delete Workspace', async () => {
    const user = userEvent.setup();
    renderWithTheme(<WorkspaceSettings {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /delete workspace/i }));
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByText(/this action cannot be undone/i)).toBeInTheDocument();
  });

  it('calls onDelete when confirming deletion', async () => {
    const user = userEvent.setup();
    const onDelete = jest.fn();
    renderWithTheme(<WorkspaceSettings {...defaultProps} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: /delete workspace/i }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('closes delete modal when clicking Cancel', async () => {
    const user = userEvent.setup();
    renderWithTheme(<WorkspaceSettings {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /delete workspace/i }));

    const dialog = screen.getByRole('dialog');
    const cancelButton = within(dialog).getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
