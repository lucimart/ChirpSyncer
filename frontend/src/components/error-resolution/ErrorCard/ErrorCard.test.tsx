import type { ReactElement } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/styles/ThemeContext';
import { ErrorCard } from './ErrorCard';
import type { ErrorDefinition } from '@/lib/errors';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const criticalError: ErrorDefinition = {
  code: 'CRITICAL_ERROR',
  patterns: [],
  title: 'Critical Error',
  description: 'A critical error has occurred that requires immediate attention.',
  severity: 'critical',
  solutions: [
    {
      title: 'Contact support',
      description: 'Please reach out to our support team.',
    },
  ],
  retryable: false,
};

const warningError: ErrorDefinition = {
  code: 'WARNING_ERROR',
  patterns: [],
  title: 'Warning',
  description: 'Something went wrong but you can try again.',
  severity: 'warning',
  solutions: [
    {
      title: 'Retry the operation',
      action: { type: 'retry', label: 'Retry', handler: '' },
    },
  ],
  retryable: true,
};

const infoError: ErrorDefinition = {
  code: 'INFO_ERROR',
  patterns: [],
  title: 'Information',
  description: 'This is an informational message.',
  severity: 'info',
  solutions: [],
  retryable: false,
};

const errorWithLink: ErrorDefinition = {
  code: 'LINK_ERROR',
  patterns: [],
  title: 'Credentials Required',
  description: 'You need to update your credentials.',
  severity: 'warning',
  solutions: [
    {
      title: 'Update credentials',
      description: 'Go to settings to update your credentials.',
      action: { type: 'link', label: 'Go to Settings', handler: '/settings' },
    },
  ],
  retryable: false,
};

const errorWithButton: ErrorDefinition = {
  code: 'BUTTON_ERROR',
  patterns: [],
  title: 'Action Required',
  description: 'Please take action.',
  severity: 'warning',
  solutions: [
    {
      title: 'Click to fix',
      action: { type: 'button', label: 'Fix Now', handler: jest.fn() },
    },
  ],
  retryable: false,
};

describe('ErrorCard', () => {
  it('renders error title', () => {
    renderWithTheme(<ErrorCard error={criticalError} />);
    expect(screen.getByText('Critical Error')).toBeInTheDocument();
  });

  it('renders error description', () => {
    renderWithTheme(<ErrorCard error={criticalError} />);
    expect(screen.getByText(/A critical error has occurred/)).toBeInTheDocument();
  });

  it('has alert role', () => {
    renderWithTheme(<ErrorCard error={criticalError} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders solutions', () => {
    renderWithTheme(<ErrorCard error={criticalError} />);
    expect(screen.getByText('Contact support')).toBeInTheDocument();
  });

  it('renders solution description', () => {
    renderWithTheme(<ErrorCard error={criticalError} />);
    expect(screen.getByText('Please reach out to our support team.')).toBeInTheDocument();
  });

  it('renders retry button for retryable errors', () => {
    renderWithTheme(<ErrorCard error={warningError} onRetry={() => {}} />);
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', async () => {
    const user = userEvent.setup();
    const handleRetry = jest.fn();
    renderWithTheme(<ErrorCard error={warningError} onRetry={handleRetry} />);

    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(handleRetry).toHaveBeenCalled();
  });

  it('shows loading state when retrying', async () => {
    const user = userEvent.setup();
    const handleRetry = jest.fn((): Promise<void> => new Promise((resolve) => setTimeout(resolve, 100)));
    renderWithTheme(<ErrorCard error={warningError} onRetry={handleRetry} />);

    await user.click(screen.getByRole('button', { name: /retry/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeDisabled();
    });
  });

  it('renders link action', () => {
    renderWithTheme(<ErrorCard error={errorWithLink} />);
    const link = screen.getByRole('link', { name: /go to settings/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/settings');
  });

  it('renders button action', () => {
    renderWithTheme(<ErrorCard error={errorWithButton} />);
    expect(screen.getByRole('button', { name: /fix now/i })).toBeInTheDocument();
  });

  it('calls button handler when clicked', async () => {
    const user = userEvent.setup();
    const handler = jest.fn();
    const error: ErrorDefinition = {
      ...errorWithButton,
      solutions: [
        {
          title: 'Click to fix',
          action: { type: 'button', label: 'Fix Now', handler },
        },
      ],
    };
    renderWithTheme(<ErrorCard error={error} />);

    await user.click(screen.getByRole('button', { name: /fix now/i }));
    expect(handler).toHaveBeenCalled();
  });

  it('shows technical details toggle when originalError is provided', () => {
    renderWithTheme(
      <ErrorCard error={criticalError} originalError="Original error message" />
    );
    expect(screen.getByText('Technical details')).toBeInTheDocument();
  });

  it('expands technical details when clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <ErrorCard error={criticalError} originalError="Original error message" />
    );

    await user.click(screen.getByText('Technical details'));
    expect(screen.getByText(/Original: Original error message/)).toBeInTheDocument();
    expect(screen.getByText(/Error Code: CRITICAL_ERROR/)).toBeInTheDocument();
  });

  it('hides technical details when showTechnicalDetails is false', () => {
    renderWithTheme(
      <ErrorCard
        error={criticalError}
        originalError="Original error"
        showTechnicalDetails={false}
      />
    );
    expect(screen.queryByText('Technical details')).not.toBeInTheDocument();
  });

  it('renders correctly for critical severity', () => {
    renderWithTheme(<ErrorCard error={criticalError} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders correctly for warning severity', () => {
    renderWithTheme(<ErrorCard error={warningError} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders correctly for info severity', () => {
    renderWithTheme(<ErrorCard error={infoError} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders error without solutions', () => {
    renderWithTheme(<ErrorCard error={infoError} />);
    expect(screen.getByText('Information')).toBeInTheDocument();
    expect(screen.getByText('This is an informational message.')).toBeInTheDocument();
  });
});
