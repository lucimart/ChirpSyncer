import type { ReactElement } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { WorkflowCard } from '../WorkflowCard';
import type { Workflow } from '@/lib/workflows';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const mockWorkflow: Workflow = {
  id: 'wf-1',
  name: 'Cross-post viral tweets',
  description: 'Automatically cross-post tweets that get 100+ likes to Bluesky',
  is_active: true,
  trigger_config: {
    type: 'viral_post',
    platform: 'twitter',
    threshold: { likes: 100 },
  },
  actions_config: [
    { type: 'cross_post', platforms: ['bluesky'] },
    { type: 'send_notification', channel: 'email', message_template: 'Post went viral!' },
  ],
  run_count: 42,
  last_run_at: '2024-01-15T10:30:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-15T10:30:00Z',
};

describe('WorkflowCard', () => {
  it('renders workflow name', () => {
    renderWithTheme(<WorkflowCard workflow={mockWorkflow} />);

    expect(screen.getByText('Cross-post viral tweets')).toBeInTheDocument();
  });

  it('renders workflow description', () => {
    renderWithTheme(<WorkflowCard workflow={mockWorkflow} />);

    expect(
      screen.getByText(/Automatically cross-post tweets that get 100\+ likes to Bluesky/)
    ).toBeInTheDocument();
  });

  it('shows active toggle when workflow is active', () => {
    renderWithTheme(<WorkflowCard workflow={mockWorkflow} />);

    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('shows inactive toggle when workflow is inactive', () => {
    const inactiveWorkflow = { ...mockWorkflow, is_active: false };
    renderWithTheme(<WorkflowCard workflow={inactiveWorkflow} />);

    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('displays run count', () => {
    renderWithTheme(<WorkflowCard workflow={mockWorkflow} />);

    expect(screen.getByText(/42 runs/i)).toBeInTheDocument();
  });

  it('displays last run time', () => {
    renderWithTheme(<WorkflowCard workflow={mockWorkflow} />);

    // Should show some relative time format
    expect(screen.getByTestId('last-run-time')).toBeInTheDocument();
  });

  it('shows trigger type icon and label', () => {
    renderWithTheme(<WorkflowCard workflow={mockWorkflow} />);

    expect(screen.getByTestId('trigger-badge')).toBeInTheDocument();
    expect(screen.getByText(/viral post/i)).toBeInTheDocument();
  });

  it('shows action icons', () => {
    renderWithTheme(<WorkflowCard workflow={mockWorkflow} />);

    const actionIcons = screen.getByTestId('action-icons');
    expect(actionIcons).toBeInTheDocument();
  });

  it('calls onToggle when switch is clicked', () => {
    const onToggle = jest.fn();
    renderWithTheme(<WorkflowCard workflow={mockWorkflow} onToggle={onToggle} />);

    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    expect(onToggle).toHaveBeenCalledWith('wf-1', false);
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = jest.fn();
    renderWithTheme(<WorkflowCard workflow={mockWorkflow} onEdit={onEdit} />);

    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    expect(onEdit).toHaveBeenCalledWith('wf-1');
  });

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = jest.fn();
    renderWithTheme(<WorkflowCard workflow={mockWorkflow} onDelete={onDelete} />);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    expect(onDelete).toHaveBeenCalledWith('wf-1');
  });

  it('handles workflow without description', () => {
    const noDescWorkflow = { ...mockWorkflow, description: undefined };
    renderWithTheme(<WorkflowCard workflow={noDescWorkflow} />);

    expect(screen.getByText('Cross-post viral tweets')).toBeInTheDocument();
    expect(screen.queryByTestId('workflow-description')).not.toBeInTheDocument();
  });

  it('handles workflow without last run', () => {
    const neverRunWorkflow = { ...mockWorkflow, last_run_at: undefined, run_count: 0 };
    renderWithTheme(<WorkflowCard workflow={neverRunWorkflow} />);

    expect(screen.getByText(/never run/i)).toBeInTheDocument();
  });

  it('displays different trigger types correctly', () => {
    const scheduledWorkflow: Workflow = {
      ...mockWorkflow,
      trigger_config: { type: 'scheduled', cron: '0 9 * * *' },
    };
    renderWithTheme(<WorkflowCard workflow={scheduledWorkflow} />);

    expect(screen.getByText(/scheduled/i)).toBeInTheDocument();
  });

  it('renders multiple action icons', () => {
    renderWithTheme(<WorkflowCard workflow={mockWorkflow} />);

    // Should show 2 action icons for cross_post and send_notification
    const actionIcons = screen.getByTestId('action-icons');
    expect(actionIcons.children.length).toBeGreaterThanOrEqual(2);
  });

  it('applies hoverable card styles', () => {
    renderWithTheme(<WorkflowCard workflow={mockWorkflow} />);

    const card = screen.getByTestId('workflow-card');
    expect(card).toBeInTheDocument();
  });
});
