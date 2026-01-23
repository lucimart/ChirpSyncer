import type { ReactElement } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/styles/ThemeContext';
import { WorkspaceSwitcher, type Workspace } from './WorkspaceSwitcher';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const mockWorkspaces: Workspace[] = [
  {
    id: 'ws-1',
    name: 'Personal',
    type: 'personal',
    ownerId: 'user-1',
    memberCount: 1,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'ws-2',
    name: 'Marketing Team',
    type: 'team',
    ownerId: 'user-1',
    memberCount: 5,
    createdAt: '2024-02-01T00:00:00Z',
  },
  {
    id: 'ws-3',
    name: 'Engineering',
    type: 'team',
    ownerId: 'user-2',
    memberCount: 12,
    createdAt: '2024-03-01T00:00:00Z',
  },
];

describe('WorkspaceSwitcher', () => {
  const defaultProps = {
    workspaces: mockWorkspaces,
    currentWorkspace: mockWorkspaces[0],
    onSwitch: jest.fn(),
    onCreateWorkspace: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders workspace switcher container', () => {
    renderWithTheme(<WorkspaceSwitcher {...defaultProps} />);
    expect(screen.getByTestId('workspace-switcher')).toBeInTheDocument();
  });

  it('displays current workspace name', () => {
    renderWithTheme(<WorkspaceSwitcher {...defaultProps} />);
    expect(screen.getByText('Personal')).toBeInTheDocument();
  });

  it('shows trigger button with aria-label', () => {
    renderWithTheme(<WorkspaceSwitcher {...defaultProps} />);
    expect(screen.getByRole('button', { name: /current workspace: personal/i })).toBeInTheDocument();
  });

  it('opens dropdown when clicking trigger button', async () => {
    const user = userEvent.setup();
    renderWithTheme(<WorkspaceSwitcher {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /current workspace/i }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('closes dropdown when clicking outside', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <div>
        <WorkspaceSwitcher {...defaultProps} />
        <button>Outside</button>
      </div>
    );

    await user.click(screen.getByRole('button', { name: /current workspace/i }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /outside/i }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('displays all workspaces in dropdown', async () => {
    const user = userEvent.setup();
    renderWithTheme(<WorkspaceSwitcher {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /current workspace/i }));

    expect(screen.getByRole('option', { name: /personal/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /marketing team/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /engineering/i })).toBeInTheDocument();
  });

  it('marks current workspace as selected', async () => {
    const user = userEvent.setup();
    renderWithTheme(<WorkspaceSwitcher {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /current workspace/i }));

    const personalOption = screen.getByRole('option', { name: /personal/i });
    expect(personalOption).toHaveAttribute('aria-selected', 'true');
  });

  it('shows workspace type badges', async () => {
    const user = userEvent.setup();
    renderWithTheme(<WorkspaceSwitcher {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /current workspace/i }));

    expect(screen.getByText('personal')).toBeInTheDocument();
    expect(screen.getAllByText('team')).toHaveLength(2);
  });

  it('shows member count for team workspaces', async () => {
    const user = userEvent.setup();
    renderWithTheme(<WorkspaceSwitcher {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /current workspace/i }));

    expect(screen.getByText('5 members')).toBeInTheDocument();
    expect(screen.getByText('12 members')).toBeInTheDocument();
  });

  it('calls onSwitch when selecting different workspace', async () => {
    const user = userEvent.setup();
    const onSwitch = jest.fn();
    renderWithTheme(<WorkspaceSwitcher {...defaultProps} onSwitch={onSwitch} />);

    await user.click(screen.getByRole('button', { name: /current workspace/i }));
    await user.click(screen.getByRole('option', { name: /marketing team/i }));

    expect(onSwitch).toHaveBeenCalledWith('ws-2');
  });

  it('does not call onSwitch when selecting current workspace', async () => {
    const user = userEvent.setup();
    const onSwitch = jest.fn();
    renderWithTheme(<WorkspaceSwitcher {...defaultProps} onSwitch={onSwitch} />);

    await user.click(screen.getByRole('button', { name: /current workspace/i }));
    await user.click(screen.getByRole('option', { name: /personal/i }));

    expect(onSwitch).not.toHaveBeenCalled();
  });

  it('closes dropdown after selecting workspace', async () => {
    const user = userEvent.setup();
    renderWithTheme(<WorkspaceSwitcher {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /current workspace/i }));
    await user.click(screen.getByRole('option', { name: /marketing team/i }));

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('displays Create Workspace button', async () => {
    const user = userEvent.setup();
    renderWithTheme(<WorkspaceSwitcher {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /current workspace/i }));
    expect(screen.getByRole('button', { name: /create workspace/i })).toBeInTheDocument();
  });

  it('calls onCreateWorkspace when clicking Create Workspace', async () => {
    const user = userEvent.setup();
    const onCreateWorkspace = jest.fn();
    renderWithTheme(<WorkspaceSwitcher {...defaultProps} onCreateWorkspace={onCreateWorkspace} />);

    await user.click(screen.getByRole('button', { name: /current workspace/i }));
    await user.click(screen.getByRole('button', { name: /create workspace/i }));

    expect(onCreateWorkspace).toHaveBeenCalledTimes(1);
  });

  it('closes dropdown after clicking Create Workspace', async () => {
    const user = userEvent.setup();
    renderWithTheme(<WorkspaceSwitcher {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /current workspace/i }));
    await user.click(screen.getByRole('button', { name: /create workspace/i }));

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('toggles aria-expanded attribute', async () => {
    const user = userEvent.setup();
    renderWithTheme(<WorkspaceSwitcher {...defaultProps} />);

    const trigger = screen.getByRole('button', { name: /current workspace/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('has aria-haspopup attribute on trigger', () => {
    renderWithTheme(<WorkspaceSwitcher {...defaultProps} />);
    const trigger = screen.getByRole('button', { name: /current workspace/i });
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
  });
});
