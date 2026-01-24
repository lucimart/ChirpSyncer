import type { ReactElement } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { ActionBuilder } from '../ActionBuilder';
import type { ActionConfig } from '@/lib/workflows';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const mockActions: ActionConfig[] = [
  { type: 'cross_post', platforms: ['bluesky'] },
  { type: 'send_notification', channel: 'email', message_template: 'Post synced!' },
];

describe('ActionBuilder', () => {
  it('renders action chain', () => {
    renderWithTheme(<ActionBuilder value={mockActions} onChange={() => {}} />);

    expect(screen.getByTestId('action-chain')).toBeInTheDocument();
  });

  it('displays all configured actions', () => {
    renderWithTheme(<ActionBuilder value={mockActions} onChange={() => {}} />);

    expect(screen.getByText(/cross-post/i)).toBeInTheDocument();
    expect(screen.getByText(/send notification/i)).toBeInTheDocument();
  });

  it('shows add action button', () => {
    renderWithTheme(<ActionBuilder value={[]} onChange={() => {}} />);

    expect(screen.getByRole('button', { name: /add action/i })).toBeInTheDocument();
  });

  it('shows action type selector when adding new action', () => {
    renderWithTheme(<ActionBuilder value={[]} onChange={() => {}} />);

    const addButton = screen.getByRole('button', { name: /add action/i });
    fireEvent.click(addButton);

    expect(screen.getByText(/cross-post/i)).toBeInTheDocument();
    expect(screen.getByText(/send notification/i)).toBeInTheDocument();
    expect(screen.getByText(/transform content/i)).toBeInTheDocument();
    expect(screen.getByText(/add to queue/i)).toBeInTheDocument();
  });

  it('calls onChange when action is added', () => {
    const onChange = jest.fn();
    renderWithTheme(<ActionBuilder value={[]} onChange={onChange} />);

    const addButton = screen.getByRole('button', { name: /add action/i });
    fireEvent.click(addButton);

    const crossPostOption = screen.getByTestId('action-option-cross_post');
    fireEvent.click(crossPostOption);

    expect(onChange).toHaveBeenCalled();
    const newActions = onChange.mock.calls[0][0];
    expect(newActions.length).toBe(1);
    expect(newActions[0].type).toBe('cross_post');
  });

  it('calls onChange when action is removed', () => {
    const onChange = jest.fn();
    renderWithTheme(<ActionBuilder value={mockActions} onChange={onChange} />);

    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    fireEvent.click(removeButtons[0]);

    expect(onChange).toHaveBeenCalled();
    const newActions = onChange.mock.calls[0][0];
    expect(newActions.length).toBe(1);
    expect(newActions[0].type).toBe('send_notification');
  });

  it('shows configuration form for cross_post action', () => {
    const actions: ActionConfig[] = [{ type: 'cross_post', platforms: ['bluesky'] }];
    renderWithTheme(<ActionBuilder value={actions} onChange={() => {}} />);

    // Click to expand config - click the header text
    const actionTitle = screen.getByText('Cross-Post');
    fireEvent.click(actionTitle);

    expect(screen.getByText(/platforms/i)).toBeInTheDocument();
  });

  it('shows configuration form for send_notification action', () => {
    const actions: ActionConfig[] = [
      { type: 'send_notification', channel: 'email', message_template: 'Test' },
    ];
    renderWithTheme(<ActionBuilder value={actions} onChange={() => {}} />);

    const actionTitle = screen.getByText('Send Notification');
    fireEvent.click(actionTitle);

    expect(screen.getByText(/channel/i)).toBeInTheDocument();
    expect(screen.getByText(/message template/i)).toBeInTheDocument();
  });

  it('shows configuration form for transform_content action', () => {
    const actions: ActionConfig[] = [{ type: 'transform_content', target_platform: 'bluesky' }];
    renderWithTheme(<ActionBuilder value={actions} onChange={() => {}} />);

    const actionTitle = screen.getByText('Transform Content');
    fireEvent.click(actionTitle);

    expect(screen.getByText(/target platform/i)).toBeInTheDocument();
  });

  it('shows configuration form for add_to_queue action', () => {
    const actions: ActionConfig[] = [{ type: 'add_to_queue', priority: 'normal' }];
    renderWithTheme(<ActionBuilder value={actions} onChange={() => {}} />);

    const actionTitle = screen.getByText('Add to Queue');
    fireEvent.click(actionTitle);

    // Look for the combobox (select) in the expanded config
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('updates action configuration when form fields change', () => {
    const onChange = jest.fn();
    const actions: ActionConfig[] = [
      { type: 'send_notification', channel: 'email', message_template: 'Test' },
    ];
    renderWithTheme(<ActionBuilder value={actions} onChange={onChange} />);

    const actionTitle = screen.getByText('Send Notification');
    fireEvent.click(actionTitle);

    const templateInput = screen.getByDisplayValue('Test');
    fireEvent.change(templateInput, { target: { value: 'New message' } });

    expect(onChange).toHaveBeenCalled();
    const newActions = onChange.mock.calls[0][0];
    expect(newActions[0].message_template).toBe('New message');
  });

  it('displays action icons', () => {
    renderWithTheme(<ActionBuilder value={mockActions} onChange={() => {}} />);

    // Each action item should have an icon
    const actionItems = screen.getAllByTestId(/action-item-/);
    expect(actionItems.length).toBe(2);
  });

  it('shows empty state when no actions', () => {
    renderWithTheme(<ActionBuilder value={[]} onChange={() => {}} />);

    expect(screen.getByText(/no actions configured/i)).toBeInTheDocument();
  });

  it('displays flow arrows between actions', () => {
    renderWithTheme(<ActionBuilder value={mockActions} onChange={() => {}} />);

    // Should show arrow between actions
    const arrows = screen.getAllByTestId('flow-arrow');
    expect(arrows.length).toBeGreaterThan(0);
  });
});
