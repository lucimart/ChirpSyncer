import type { ReactElement } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/styles/ThemeContext';
import HomePage from './page';

// Mock next/navigation
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

// Mock auth
const mockCheckAuth = jest.fn();
jest.mock('@/lib/auth', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    isLoading: false,
    checkAuth: mockCheckAuth,
  }),
}));

function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{ui}</ThemeProvider>
    </QueryClientProvider>
  );
}

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading spinner', () => {
    renderWithProviders(<HomePage />);

    // Should show spinner while checking auth
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('calls checkAuth on mount', () => {
    renderWithProviders(<HomePage />);

    expect(mockCheckAuth).toHaveBeenCalled();
  });

  it('redirects to login when not authenticated', async () => {
    renderWithProviders(<HomePage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('redirects based on authentication state', async () => {
    // This test verifies the redirect logic is called
    // The actual redirect destination depends on isAuthenticated state
    renderWithProviders(<HomePage />);

    await waitFor(() => {
      // Should redirect somewhere (either /login or /dashboard)
      expect(mockReplace).toHaveBeenCalled();
    });
  });

  it('has accessible spinner with status role', () => {
    renderWithProviders(<HomePage />);

    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });

  it('centers spinner on screen', () => {
    renderWithProviders(<HomePage />);

    const container = screen.getByRole('status').parentElement;
    expect(container).toHaveStyle({ minHeight: '100vh' });
  });
});
