/**
 * ErrorResolution Component Tests
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { ErrorResolution, ErrorDiagnosis, ResolutionOption } from '@/components/ui/ErrorResolution';

// Mock theme
const mockTheme = {
  colors: {
    background: { primary: '#fff', secondary: '#f5f5f5', tertiary: '#eee' },
    text: { primary: '#000', secondary: '#666', tertiary: '#999' },
    border: { light: '#ddd', default: '#ccc', dark: '#999' },
    primary: { 50: '#e3f2fd', 100: '#bbdefb', 200: '#90caf9', 300: '#64b5f6', 400: '#42a5f5', 600: '#1e88e5', 700: '#1976d2' },
    neutral: { 50: '#fafafa', 100: '#f5f5f5', 200: '#eee', 500: '#9e9e9e' },
    danger: { 50: '#ffebee', 100: '#ffcdd2', 500: '#f44336', 600: '#e53935' },
    success: { 50: '#e8f5e9', 100: '#c8e6c9', 500: '#4caf50', 600: '#43a047' },
    warning: { 50: '#fff3e0', 100: '#ffe0b2', 600: '#fb8c00', 700: '#f57c00' },
    surface: {
      primary: { bg: '#e3f2fd', text: '#1565c0', border: '#90caf9' },
      success: { bg: '#e8f5e9', text: '#2e7d32', border: '#a5d6a7' },
      warning: { bg: '#fff3e0', text: '#e65100', border: '#ffcc80' },
      danger: { bg: '#ffebee', text: '#c62828', border: '#ef9a9a' },
      info: { bg: '#e3f2fd', text: '#1565c0', border: '#90caf9' },
      neutral: { bg: '#f5f5f5', text: '#424242', border: '#e0e0e0' },
    },
  },
  spacing: { 1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px', 6: '24px', 8: '32px' },
  fontSizes: { xs: '12px', sm: '14px', base: '16px', lg: '18px' },
  fontWeights: { medium: 500, semibold: 600, bold: 700 },
  borderRadius: { md: '6px', lg: '8px', xl: '12px', full: '9999px' },
  shadows: { sm: '0 1px 2px rgba(0,0,0,0.05)', md: '0 4px 6px rgba(0,0,0,0.1)', lg: '0 10px 15px rgba(0,0,0,0.1)', xl: '0 20px 25px rgba(0,0,0,0.15)' },
  transitions: { fast: '150ms', default: '200ms' },
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={mockTheme}>
      {component}
    </ThemeProvider>
  );
};

const mockError: ErrorDiagnosis = {
  code: 'AUTH_001',
  message: 'Authentication Failed',
  details: [
    'Invalid credentials provided',
    'Token has expired',
    'Please re-authenticate',
  ],
  timestamp: new Date('2024-01-15T10:30:00Z'),
  lastSuccess: new Date('2024-01-14T08:00:00Z'),
};

const mockOptions: ResolutionOption[] = [
  {
    id: 'retry',
    title: 'Retry Authentication',
    description: 'Attempt to re-authenticate with current credentials',
    recommended: true,
    action: {
      type: 'auto',
      label: 'Retry Now',
      handler: jest.fn().mockResolvedValue(undefined),
    },
  },
  {
    id: 'manual',
    title: 'Update Credentials',
    description: 'Manually update your API credentials',
    recommended: false,
    action: {
      type: 'manual',
      label: 'Go to Settings',
    },
  },
  {
    id: 'docs',
    title: 'View Documentation',
    description: 'Read the troubleshooting guide',
    recommended: false,
    action: {
      type: 'link',
      label: 'Open Docs',
      href: 'https://docs.example.com/auth',
    },
  },
];

describe('ErrorResolution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.open
    window.open = jest.fn();
  });

  it('renders error message and code', () => {
    renderWithTheme(
      <ErrorResolution error={mockError} options={mockOptions} />
    );

    expect(screen.getByText('Authentication Failed')).toBeInTheDocument();
    expect(screen.getByText('AUTH_001')).toBeInTheDocument();
  });

  it('renders all diagnosis details', () => {
    renderWithTheme(
      <ErrorResolution error={mockError} options={mockOptions} />
    );

    expect(screen.getByText('Invalid credentials provided')).toBeInTheDocument();
    expect(screen.getByText('Token has expired')).toBeInTheDocument();
    expect(screen.getByText('Please re-authenticate')).toBeInTheDocument();
  });

  it('renders all resolution options', () => {
    renderWithTheme(
      <ErrorResolution error={mockError} options={mockOptions} />
    );

    expect(screen.getByText('Retry Authentication')).toBeInTheDocument();
    expect(screen.getByText('Update Credentials')).toBeInTheDocument();
    expect(screen.getByText('View Documentation')).toBeInTheDocument();
  });

  it('displays recommended badge on recommended option', () => {
    renderWithTheme(
      <ErrorResolution error={mockError} options={mockOptions} />
    );

    expect(screen.getByText('Recommended')).toBeInTheDocument();
  });

  it('displays timestamps correctly', () => {
    renderWithTheme(
      <ErrorResolution error={mockError} options={mockOptions} />
    );

    // Check for formatted dates (format: "Jan 15, 10:30 AM" style)
    expect(screen.getByText(/Last success:/)).toBeInTheDocument();
  });

  it('renders tip section when tip is provided', () => {
    renderWithTheme(
      <ErrorResolution 
        error={mockError} 
        options={mockOptions} 
        tip="Try clearing your browser cache before retrying."
      />
    );

    expect(screen.getByText(/Try clearing your browser cache/)).toBeInTheDocument();
  });

  it('does not render tip section when tip is not provided', () => {
    renderWithTheme(
      <ErrorResolution error={mockError} options={mockOptions} />
    );

    expect(screen.queryByText('Tip:')).not.toBeInTheDocument();
  });

  it('renders contact support link when onContactSupport is provided', () => {
    const mockContactSupport = jest.fn();
    renderWithTheme(
      <ErrorResolution 
        error={mockError} 
        options={mockOptions} 
        onContactSupport={mockContactSupport}
      />
    );

    expect(screen.getByText(/Contact Support/)).toBeInTheDocument();
  });

  it('does not render contact support link when onContactSupport is not provided', () => {
    renderWithTheme(
      <ErrorResolution error={mockError} options={mockOptions} />
    );

    expect(screen.queryByText(/Contact Support/)).not.toBeInTheDocument();
  });

  it('calls onContactSupport when support link is clicked', async () => {
    const mockContactSupport = jest.fn();
    renderWithTheme(
      <ErrorResolution 
        error={mockError} 
        options={mockOptions} 
        onContactSupport={mockContactSupport}
      />
    );

    const supportLink = screen.getByText(/Contact Support/);
    fireEvent.click(supportLink);

    expect(mockContactSupport).toHaveBeenCalledTimes(1);
  });

  it('calls action handler when auto action button is clicked', async () => {
    const mockHandler = jest.fn().mockResolvedValue(undefined);
    const optionsWithHandler: ResolutionOption[] = [
      {
        id: 'retry',
        title: 'Retry',
        description: 'Retry the operation',
        recommended: true,
        action: {
          type: 'auto',
          label: 'Retry Now',
          handler: mockHandler,
        },
      },
    ];

    renderWithTheme(
      <ErrorResolution error={mockError} options={optionsWithHandler} />
    );

    const retryButton = screen.getByText('Retry Now');
    await act(async () => {
      fireEvent.click(retryButton);
    });

    await waitFor(() => {
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });
  });

  it('opens link in new tab when link action is clicked', async () => {
    renderWithTheme(
      <ErrorResolution error={mockError} options={mockOptions} />
    );

    const docsButton = screen.getByText('Open Docs');
    fireEvent.click(docsButton);

    expect(window.open).toHaveBeenCalledWith(
      'https://docs.example.com/auth',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('calls onResolve when action without handler is clicked', async () => {
    const mockOnResolve = jest.fn().mockResolvedValue(undefined);
    const optionsWithoutHandler: ResolutionOption[] = [
      {
        id: 'manual',
        title: 'Manual Fix',
        description: 'Fix manually',
        recommended: false,
        action: {
          type: 'manual',
          label: 'Fix It',
        },
      },
    ];

    renderWithTheme(
      <ErrorResolution 
        error={mockError} 
        options={optionsWithoutHandler} 
        onResolve={mockOnResolve}
      />
    );

    const fixButton = screen.getByText('Fix It');
    await act(async () => {
      fireEvent.click(fixButton);
    });

    await waitFor(() => {
      expect(mockOnResolve).toHaveBeenCalledWith('manual');
    });
  });

  it('shows loading state while action is processing', async () => {
    let resolveHandler: () => void;
    const slowHandler = jest.fn().mockImplementation(() => {
      return new Promise<void>((resolve) => {
        resolveHandler = resolve;
      });
    });

    const optionsWithSlowHandler: ResolutionOption[] = [
      {
        id: 'slow',
        title: 'Slow Action',
        description: 'Takes time',
        recommended: true,
        action: {
          type: 'auto',
          label: 'Start',
          handler: slowHandler,
        },
      },
    ];

    renderWithTheme(
      <ErrorResolution error={mockError} options={optionsWithSlowHandler} />
    );

    const startButton = screen.getByText('Start');
    
    await act(async () => {
      fireEvent.click(startButton);
    });

    // Should show processing state
    await waitFor(() => {
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    // Resolve the handler
    await act(async () => {
      resolveHandler!();
    });

    // Should return to normal state
    await waitFor(() => {
      expect(screen.getByText('Start')).toBeInTheDocument();
    });
  });

  it('disables all buttons while one action is processing', async () => {
    let resolveHandler: () => void;
    const slowHandler = jest.fn().mockImplementation(() => {
      return new Promise<void>((resolve) => {
        resolveHandler = resolve;
      });
    });

    const multipleOptions: ResolutionOption[] = [
      {
        id: 'slow',
        title: 'Slow Action',
        description: 'Takes time',
        recommended: true,
        action: {
          type: 'auto',
          label: 'Start',
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
          label: 'Other',
        },
      },
    ];

    renderWithTheme(
      <ErrorResolution error={mockError} options={multipleOptions} />
    );

    const startButton = screen.getByText('Start');
    
    await act(async () => {
      fireEvent.click(startButton);
    });

    // Other button should be disabled
    const otherButton = screen.getByText('Other');
    expect(otherButton).toBeDisabled();

    // Resolve the handler
    await act(async () => {
      resolveHandler!();
    });

    // Other button should be enabled again
    await waitFor(() => {
      expect(screen.getByText('Other')).not.toBeDisabled();
    });
  });

  it('renders without lastSuccess date', () => {
    const errorWithoutLastSuccess: ErrorDiagnosis = {
      ...mockError,
      lastSuccess: undefined,
    };

    renderWithTheme(
      <ErrorResolution error={errorWithoutLastSuccess} options={mockOptions} />
    );

    expect(screen.queryByText(/Last success:/)).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = renderWithTheme(
      <ErrorResolution 
        error={mockError} 
        options={mockOptions} 
        className="custom-class"
      />
    );

    const containerDiv = container.firstChild;
    expect(containerDiv).toHaveClass('custom-class');
  });

  it('renders Diagnosis section title', () => {
    renderWithTheme(
      <ErrorResolution error={mockError} options={mockOptions} />
    );

    expect(screen.getByText('Diagnosis')).toBeInTheDocument();
  });

  it('renders Resolution Options section title', () => {
    renderWithTheme(
      <ErrorResolution error={mockError} options={mockOptions} />
    );

    expect(screen.getByText('Resolution Options')).toBeInTheDocument();
  });

  it('renders option descriptions', () => {
    renderWithTheme(
      <ErrorResolution error={mockError} options={mockOptions} />
    );

    expect(screen.getByText('Attempt to re-authenticate with current credentials')).toBeInTheDocument();
    expect(screen.getByText('Manually update your API credentials')).toBeInTheDocument();
    expect(screen.getByText('Read the troubleshooting guide')).toBeInTheDocument();
  });

  it('handles error without details gracefully', () => {
    const errorWithoutDetails: ErrorDiagnosis = {
      code: 'ERR_001',
      message: 'An error occurred',
      details: [],
      timestamp: new Date(),
    };

    renderWithTheme(
      <ErrorResolution error={errorWithoutDetails} options={mockOptions} />
    );

    expect(screen.getByText('An error occurred')).toBeInTheDocument();
  });

  it('handles empty options array', () => {
    renderWithTheme(
      <ErrorResolution error={mockError} options={[]} />
    );

    expect(screen.getByText('Authentication Failed')).toBeInTheDocument();
    expect(screen.getByText('Resolution Options')).toBeInTheDocument();
  });
});
