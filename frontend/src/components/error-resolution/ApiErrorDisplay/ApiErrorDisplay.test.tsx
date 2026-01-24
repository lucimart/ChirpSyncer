import type { ReactElement } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/styles/ThemeContext';
import { ApiErrorDisplay } from './ApiErrorDisplay';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('ApiErrorDisplay', () => {
  it('renders nothing when error is null', () => {
    const { container } = renderWithTheme(<ApiErrorDisplay error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders error message for string error', () => {
    renderWithTheme(<ApiErrorDisplay error="Something went wrong" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders error message for Error object', () => {
    renderWithTheme(<ApiErrorDisplay error={new Error('Network error')} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('matches known error patterns', async () => {
    renderWithTheme(<ApiErrorDisplay error="Token expired" />);
    await waitFor(() => {
      expect(screen.getByText('Session Expired')).toBeInTheDocument();
    });
  });

  it('shows retry button for retryable errors', async () => {
    const handleRetry = jest.fn();
    renderWithTheme(
      <ApiErrorDisplay error="Network error" onRetry={handleRetry} />
    );

    await waitFor(() => {
      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();
    });
  });

  it('calls onRetry when retry button is clicked', async () => {
    const user = userEvent.setup();
    const handleRetry = jest.fn();
    renderWithTheme(
      <ApiErrorDisplay error="Request timeout" onRetry={handleRetry} />
    );

    await waitFor(async () => {
      const retryButton = screen.getByRole('button', { name: /try again/i });
      await user.click(retryButton);
    });

    expect(handleRetry).toHaveBeenCalled();
  });

  it('does not show retry button for non-retryable errors', async () => {
    const handleRetry = jest.fn();
    renderWithTheme(
      <ApiErrorDisplay error="Permission denied" onRetry={handleRetry} />
    );

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    const { container } = renderWithTheme(
      <ApiErrorDisplay error="Test error" className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('shows technical details toggle by default', async () => {
    renderWithTheme(<ApiErrorDisplay error="Internal server error" />);
    await waitFor(() => {
      expect(screen.getByText('Technical details')).toBeInTheDocument();
    });
  });

  it('hides technical details when showTechnicalDetails is false', async () => {
    renderWithTheme(
      <ApiErrorDisplay error="Server error" showTechnicalDetails={false} />
    );
    await waitFor(() => {
      expect(screen.queryByText('Technical details')).not.toBeInTheDocument();
    });
  });

  it('displays fallback error for unknown errors', async () => {
    renderWithTheme(<ApiErrorDisplay error="Some random unknown error xyz123" />);
    await waitFor(() => {
      expect(screen.getByText('Some random unknown error xyz123')).toBeInTheDocument();
    });
  });
});
