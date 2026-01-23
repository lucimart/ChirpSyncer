import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { ErrorResolution } from './ErrorResolution';
import type { ErrorDiagnosis, ResolutionOption } from './types';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('ErrorResolution', () => {
  const mockError: ErrorDiagnosis = {
    code: 'TEST_001',
    message: 'Test Error Message',
    details: ['Detail 1', 'Detail 2', 'Detail 3'],
    timestamp: new Date('2024-01-15T10:30:00'),
    lastSuccess: new Date('2024-01-15T09:00:00'),
  };

  const mockOptions: ResolutionOption[] = [
    {
      id: 'option1',
      title: 'Auto Fix',
      description: 'Automatically fix the issue',
      recommended: true,
      action: {
        type: 'auto',
        label: 'Fix Now',
        handler: jest.fn().mockResolvedValue(undefined),
      },
    },
    {
      id: 'option2',
      title: 'Manual Fix',
      description: 'Manually fix the issue',
      recommended: false,
      action: {
        type: 'manual',
        label: 'Open Settings',
      },
    },
    {
      id: 'option3',
      title: 'Learn More',
      description: 'View documentation',
      recommended: false,
      action: {
        type: 'link',
        label: 'View Docs',
        href: 'https://example.com/docs',
      },
    },
  ];

  const defaultProps = {
    error: mockError,
    options: mockOptions,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders error message and code', () => {
    renderWithTheme(<ErrorResolution {...defaultProps} />);

    expect(screen.getByText('Test Error Message')).toBeInTheDocument();
    expect(screen.getByText('TEST_001')).toBeInTheDocument();
  });

  it('renders all error details', () => {
    renderWithTheme(<ErrorResolution {...defaultProps} />);

    expect(screen.getByText('Detail 1')).toBeInTheDocument();
    expect(screen.getByText('Detail 2')).toBeInTheDocument();
    expect(screen.getByText('Detail 3')).toBeInTheDocument();
  });

  it('renders diagnosis section', () => {
    renderWithTheme(<ErrorResolution {...defaultProps} />);

    expect(screen.getByText('Diagnosis')).toBeInTheDocument();
  });

  it('renders resolution options section', () => {
    renderWithTheme(<ErrorResolution {...defaultProps} />);

    expect(screen.getByText('Resolution Options')).toBeInTheDocument();
  });

  it('renders all resolution options', () => {
    renderWithTheme(<ErrorResolution {...defaultProps} />);

    expect(screen.getByText('Auto Fix')).toBeInTheDocument();
    expect(screen.getByText('Manual Fix')).toBeInTheDocument();
    expect(screen.getByText('Learn More')).toBeInTheDocument();
  });

  it('shows recommended badge for recommended option', () => {
    renderWithTheme(<ErrorResolution {...defaultProps} />);

    expect(screen.getByText('Recommended')).toBeInTheDocument();
  });

  it('renders tip when provided', () => {
    renderWithTheme(
      <ErrorResolution {...defaultProps} tip="This is a helpful tip" />
    );

    expect(screen.getByText(/This is a helpful tip/)).toBeInTheDocument();
  });

  it('does not render tip when not provided', () => {
    renderWithTheme(<ErrorResolution {...defaultProps} />);

    expect(screen.queryByText('Tip:')).not.toBeInTheDocument();
  });

  it('renders contact support link when onContactSupport is provided', () => {
    const onContactSupport = jest.fn();
    renderWithTheme(
      <ErrorResolution {...defaultProps} onContactSupport={onContactSupport} />
    );

    expect(screen.getByText(/Contact Support/)).toBeInTheDocument();
  });

  it('does not render contact support when onContactSupport is not provided', () => {
    renderWithTheme(<ErrorResolution {...defaultProps} />);

    expect(screen.queryByText(/Contact Support/)).not.toBeInTheDocument();
  });

  it('calls onContactSupport when support link is clicked', async () => {
    const user = userEvent.setup();
    const onContactSupport = jest.fn();
    renderWithTheme(
      <ErrorResolution {...defaultProps} onContactSupport={onContactSupport} />
    );

    await user.click(screen.getByText(/Contact Support/));

    expect(onContactSupport).toHaveBeenCalledTimes(1);
  });

  it('calls action handler when auto action button is clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(<ErrorResolution {...defaultProps} />);

    await user.click(screen.getByText('Fix Now'));

    await waitFor(() => {
      expect(mockOptions[0].action.handler).toHaveBeenCalledTimes(1);
    });
  });

  it('opens link in new tab for link action type', async () => {
    const user = userEvent.setup();
    const windowOpenSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

    renderWithTheme(<ErrorResolution {...defaultProps} />);

    await user.click(screen.getByText('View Docs'));

    expect(windowOpenSpy).toHaveBeenCalledWith(
      'https://example.com/docs',
      '_blank',
      'noopener,noreferrer'
    );

    windowOpenSpy.mockRestore();
  });

  it('calls onResolve when provided and action has no handler', async () => {
    const user = userEvent.setup();
    const onResolve = jest.fn().mockResolvedValue(undefined);
    const optionsWithoutHandler: ResolutionOption[] = [
      {
        id: 'test',
        title: 'Test Option',
        description: 'Test description',
        recommended: false,
        action: {
          type: 'manual',
          label: 'Test Action',
        },
      },
    ];

    renderWithTheme(
      <ErrorResolution
        error={mockError}
        options={optionsWithoutHandler}
        onResolve={onResolve}
      />
    );

    await user.click(screen.getByText('Test Action'));

    await waitFor(() => {
      expect(onResolve).toHaveBeenCalledWith('test');
    });
  });

  it('shows loading state while action is processing', async () => {
    const user = userEvent.setup();
    let resolveHandler: () => void;
    const slowHandler = jest.fn().mockImplementation(
      () => new Promise<void>((resolve) => {
        resolveHandler = resolve;
      })
    );

    const optionsWithSlowHandler: ResolutionOption[] = [
      {
        id: 'slow',
        title: 'Slow Action',
        description: 'Takes time',
        recommended: false,
        action: {
          type: 'auto',
          label: 'Run Slow',
          handler: slowHandler,
        },
      },
    ];

    renderWithTheme(
      <ErrorResolution error={mockError} options={optionsWithSlowHandler} />
    );

    await user.click(screen.getByText('Run Slow'));

    expect(screen.getByText('Processing...')).toBeInTheDocument();

    // Resolve the handler
    resolveHandler!();

    await waitFor(() => {
      expect(screen.queryByText('Processing...')).not.toBeInTheDocument();
    });
  });

  it('disables all buttons while an action is processing', async () => {
    const user = userEvent.setup();
    let resolveHandler: () => void;
    const slowHandler = jest.fn().mockImplementation(
      () => new Promise<void>((resolve) => {
        resolveHandler = resolve;
      })
    );

    const options: ResolutionOption[] = [
      {
        id: 'slow',
        title: 'Slow Action',
        description: 'Takes time',
        recommended: false,
        action: {
          type: 'auto',
          label: 'Run Slow',
          handler: slowHandler,
        },
      },
      {
        id: 'other',
        title: 'Other Action',
        description: 'Another option',
        recommended: false,
        action: {
          type: 'manual',
          label: 'Other Button',
        },
      },
    ];

    renderWithTheme(<ErrorResolution error={mockError} options={options} />);

    await user.click(screen.getByText('Run Slow'));

    // Other button should be disabled
    expect(screen.getByText('Other Button').closest('button')).toBeDisabled();

    // Resolve and cleanup
    resolveHandler!();
    await waitFor(() => {
      expect(screen.getByText('Other Button').closest('button')).not.toBeDisabled();
    });
  });

  it('displays timestamps correctly', () => {
    renderWithTheme(<ErrorResolution {...defaultProps} />);

    // Check that timestamp info is displayed (format may vary, may appear multiple times)
    expect(screen.getAllByText(/Jan 15/).length).toBeGreaterThan(0);
  });

  it('applies custom className', () => {
    const { container } = renderWithTheme(
      <ErrorResolution {...defaultProps} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
