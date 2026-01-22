import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { ToastProvider, useToast } from './Toast';

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      <ToastProvider>{ui}</ToastProvider>
    </ThemeProvider>
  );
};

// Test component that exposes toast functions
const ToastTrigger = ({ type = 'success' as const, message, duration }: { type?: 'success' | 'error' | 'warning' | 'info'; message?: string; duration?: number }) => {
  const { addToast } = useToast();
  return (
    <button
      onClick={() =>
        addToast({
          type,
          title: `Test ${type}`,
          message,
          duration,
        })
      }
    >
      Add Toast
    </button>
  );
};

describe('Toast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('shows toast when triggered', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithProviders(<ToastTrigger />);

    await user.click(screen.getByText('Add Toast'));
    expect(screen.getByText('Test success')).toBeInTheDocument();
  });

  it('shows toast with message', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithProviders(<ToastTrigger message="This is a message" />);

    await user.click(screen.getByText('Add Toast'));
    expect(screen.getByText('This is a message')).toBeInTheDocument();
  });

  it('renders different toast types', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const { rerender } = renderWithProviders(<ToastTrigger type="success" />);
    await user.click(screen.getByText('Add Toast'));
    expect(screen.getByText('Test success')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={theme}>
        <ToastProvider>
          <ToastTrigger type="error" />
        </ToastProvider>
      </ThemeProvider>
    );
    await user.click(screen.getByText('Add Toast'));
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('auto-dismisses after duration', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithProviders(<ToastTrigger duration={3000} />);

    await user.click(screen.getByText('Add Toast'));
    expect(screen.getByText('Test success')).toBeInTheDocument();

    // Fast-forward past duration + animation
    act(() => {
      jest.advanceTimersByTime(3500);
    });

    await waitFor(() => {
      expect(screen.queryByText('Test success')).not.toBeInTheDocument();
    });
  });

  it('does not auto-dismiss when duration is 0', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithProviders(<ToastTrigger duration={0} />);

    await user.click(screen.getByText('Add Toast'));
    expect(screen.getByText('Test success')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(screen.getByText('Test success')).toBeInTheDocument();
  });

  it('can be manually dismissed', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderWithProviders(<ToastTrigger duration={0} />);

    await user.click(screen.getByText('Add Toast'));
    expect(screen.getByText('Test success')).toBeInTheDocument();

    // Find and click the close button
    const closeButtons = document.querySelectorAll('button');
    const closeButton = Array.from(closeButtons).find(
      (btn) => btn !== screen.getByText('Add Toast')
    );
    if (closeButton) {
      await user.click(closeButton);
    }

    // Wait for exit animation
    act(() => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() => {
      expect(screen.queryByText('Test success')).not.toBeInTheDocument();
    });
  });

  it('throws error when useToast is used outside provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    const BadComponent = () => {
      useToast();
      return null;
    };

    expect(() => render(<BadComponent />)).toThrow(
      'useToast must be used within a ToastProvider'
    );

    consoleError.mockRestore();
  });

  it('can show multiple toasts', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const MultiTrigger = () => {
      const { addToast } = useToast();
      return (
        <button
          onClick={() => {
            addToast({ type: 'success', title: 'First' });
            addToast({ type: 'error', title: 'Second' });
            addToast({ type: 'info', title: 'Third' });
          }}
        >
          Add Multiple
        </button>
      );
    };

    renderWithProviders(<MultiTrigger />);
    await user.click(screen.getByText('Add Multiple'));

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByText('Third')).toBeInTheDocument();
  });
});
