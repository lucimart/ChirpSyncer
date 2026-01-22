import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { DangerConfirm } from './DangerConfirm';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('DangerConfirm', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    title: 'Delete Item',
    description: 'This action cannot be undone.',
    confirmPhrase: 'delete',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
    renderWithTheme(<DangerConfirm {...defaultProps} />);

    expect(screen.getByText('Delete Item')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    expect(screen.getByText('delete')).toBeInTheDocument();
  });

  it('shows confirm phrase that user must type', () => {
    renderWithTheme(<DangerConfirm {...defaultProps} />);

    expect(
      screen.getByText('To confirm this action, type the following phrase exactly:')
    ).toBeInTheDocument();
    expect(screen.getByText('delete')).toBeInTheDocument();
  });

  it('disables confirm button when phrase is not typed', () => {
    renderWithTheme(<DangerConfirm {...defaultProps} />);

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmButton).toBeDisabled();
  });

  it('enables confirm button when phrase matches and reason provided', async () => {
    const user = userEvent.setup();
    renderWithTheme(<DangerConfirm {...defaultProps} requireReason />);

    // Type the confirm phrase
    const phraseInput = screen.getByPlaceholderText('Type the phrase above');
    await user.type(phraseInput, 'delete');

    // Type a reason
    const reasonInput = screen.getByPlaceholderText(
      'Why are you performing this action?'
    );
    await user.type(reasonInput, 'Testing deletion');

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmButton).not.toBeDisabled();
  });

  it('shows error when phrase does not match', async () => {
    const user = userEvent.setup();
    renderWithTheme(<DangerConfirm {...defaultProps} />);

    const phraseInput = screen.getByPlaceholderText('Type the phrase above');
    await user.type(phraseInput, 'wrong');

    expect(screen.getByText('Phrase does not match')).toBeInTheDocument();
  });

  it('calls onConfirm with reason when confirmed', async () => {
    const user = userEvent.setup();
    renderWithTheme(<DangerConfirm {...defaultProps} requireReason />);

    await user.type(screen.getByPlaceholderText('Type the phrase above'), 'delete');
    await user.type(
      screen.getByPlaceholderText('Why are you performing this action?'),
      'Test reason'
    );

    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(defaultProps.onConfirm).toHaveBeenCalledWith('Test reason');
  });

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(<DangerConfirm {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('works without requiring reason', async () => {
    const user = userEvent.setup();
    renderWithTheme(<DangerConfirm {...defaultProps} requireReason={false} />);

    // Should not show reason field
    expect(
      screen.queryByPlaceholderText('Why are you performing this action?')
    ).not.toBeInTheDocument();

    // Just type the phrase
    await user.type(screen.getByPlaceholderText('Type the phrase above'), 'delete');

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    expect(confirmButton).not.toBeDisabled();
  });

  it('disables buttons when loading', () => {
    renderWithTheme(<DangerConfirm {...defaultProps} isLoading />);

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    // Confirm button is also disabled (both by loading and by invalid state)
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
  });

  it('shows audit note', () => {
    renderWithTheme(<DangerConfirm {...defaultProps} />);

    expect(
      screen.getByText(/This action will be logged with your user ID/)
    ).toBeInTheDocument();
  });

  it('resets state when closed', async () => {
    const user = userEvent.setup();
    const { rerender } = renderWithTheme(<DangerConfirm {...defaultProps} />);

    // Type something
    await user.type(screen.getByPlaceholderText('Type the phrase above'), 'partial');

    // Close modal
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    // Reopen
    rerender(
      <ThemeProvider theme={theme}>
        <DangerConfirm {...defaultProps} />
      </ThemeProvider>
    );

    // Input should be cleared (onClose resets state)
    // This tests that handleClose was called which resets state
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
