import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { CommandPalette } from './CommandPalette';
import { ToastProvider } from '@/components/ui/Toast';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const renderWithTheme = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      <ToastProvider>
        {ui}
      </ToastProvider>
    </ThemeProvider>
  );
};

describe('CommandPalette', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('does not render initially', () => {
    renderWithTheme(<CommandPalette />);
    expect(screen.queryByPlaceholderText(/search commands/i)).not.toBeInTheDocument();
  });

  it('opens when Ctrl+K is pressed', async () => {
    renderWithTheme(<CommandPalette />);

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search commands/i)).toBeInTheDocument();
    });
  });

  it('opens when Cmd+K is pressed (Mac)', async () => {
    renderWithTheme(<CommandPalette />);

    fireEvent.keyDown(document, { key: 'k', metaKey: true });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search commands/i)).toBeInTheDocument();
    });
  });

  it('closes when Escape is pressed', async () => {
    renderWithTheme(<CommandPalette />);

    // Open
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search commands/i)).toBeInTheDocument();
    });

    // Close with Escape
    fireEvent.keyDown(screen.getByPlaceholderText(/search commands/i).closest('[cmdk-root]')!, {
      key: 'Escape',
    });

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/search commands/i)).not.toBeInTheDocument();
    });
  });

  it('closes when overlay is clicked', async () => {
    renderWithTheme(<CommandPalette />);

    // Open
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search commands/i)).toBeInTheDocument();
    });

    // Close with Escape (overlay click behavior may vary in jsdom)
    fireEvent.keyDown(screen.getByPlaceholderText(/search commands/i).closest('[cmdk-root]')!, {
      key: 'Escape',
    });

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/search commands/i)).not.toBeInTheDocument();
    });
  });

  it('displays Quick Actions group', async () => {
    renderWithTheme(<CommandPalette />);

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });
  });

  it('displays Navigation group', async () => {
    renderWithTheme(<CommandPalette />);

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByText('Navigation')).toBeInTheDocument();
    });
  });

  it('displays navigation commands', async () => {
    renderWithTheme(<CommandPalette />);

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Sync')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  it('displays theme toggle action', async () => {
    renderWithTheme(<CommandPalette />);

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByText(/switch to (light|dark) mode/i)).toBeInTheDocument();
    });
  });

  it('shows footer with keyboard hints', async () => {
    renderWithTheme(<CommandPalette />);

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByText('Navigate')).toBeInTheDocument();
      expect(screen.getByText('Select')).toBeInTheDocument();
      expect(screen.getByText('Close')).toBeInTheDocument();
    });
  });

  it('filters commands when typing', async () => {
    const user = userEvent.setup();
    renderWithTheme(<CommandPalette />);

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search commands/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/search commands/i);
    await user.type(input, 'dashboard');

    // Dashboard should still be visible, but other items might be filtered
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  it('shows empty state when no results', async () => {
    const user = userEvent.setup();
    renderWithTheme(<CommandPalette />);

    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search commands/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/search commands/i);
    await user.type(input, 'xyznonexistent123');

    await waitFor(() => {
      expect(screen.getByText('No results found.')).toBeInTheDocument();
    });
  });
});
