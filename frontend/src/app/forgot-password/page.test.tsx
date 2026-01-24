import type { ReactElement } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/styles/ThemeContext';
import ForgotPasswordPage from './page';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock api
const mockForgotPassword = jest.fn();
jest.mock('@/lib/api', () => ({
  api: {
    forgotPassword: (...args: unknown[]) => mockForgotPassword(...args),
  },
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

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders forgot password form', () => {
    renderWithProviders(<ForgotPasswordPage />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('has accessible form labels with correct input type', () => {
    renderWithProviders(<ForgotPasswordPage />);

    const emailInput = screen.getByLabelText(/email/i);

    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('autocomplete', 'email');
  });

  it('shows back to sign in link', () => {
    renderWithProviders(<ForgotPasswordPage />);

    expect(screen.getByRole('link', { name: /back to sign in/i })).toHaveAttribute(
      'href',
      '/login'
    );
  });

  it('shows subtitle with instructions', () => {
    renderWithProviders(<ForgotPasswordPage />);

    expect(screen.getByText(/enter your email address/i)).toBeInTheDocument();
  });

  it('submits form and shows success message', async () => {
    const user = userEvent.setup();
    mockForgotPassword.mockResolvedValue({ success: true, data: {} });

    renderWithProviders(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(mockForgotPassword).toHaveBeenCalledWith('user@example.com');
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
  });

  it('shows success state with correct messaging', async () => {
    const user = userEvent.setup();
    mockForgotPassword.mockResolvedValue({ success: true, data: {} });

    renderWithProviders(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      expect(screen.getByText(/if an account with that email exists/i)).toBeInTheDocument();
    });

    // Back link should still be present
    expect(screen.getByRole('link', { name: /back to sign in/i })).toBeInTheDocument();
  });

  it('shows development mode reset URL when provided', async () => {
    const user = userEvent.setup();
    const devUrl = '/reset-password?token=dev-token-123';
    mockForgotPassword.mockResolvedValue({
      success: true,
      data: { dev_reset_url: devUrl },
    });

    renderWithProviders(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/development mode/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /reset-password\?token=dev-token-123/ })).toHaveAttribute(
        'href',
        devUrl
      );
    });
  });

  it('shows error message on failed request', async () => {
    const user = userEvent.setup();
    mockForgotPassword.mockResolvedValue({
      success: false,
      error: 'Failed to send reset email',
    });

    renderWithProviders(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to send reset email/i)).toBeInTheDocument();
    });
  });

  it('disables submit button while loading', async () => {
    const user = userEvent.setup();
    mockForgotPassword.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true, data: {} }), 100))
    );

    renderWithProviders(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('email input is required', () => {
    renderWithProviders(<ForgotPasswordPage />);

    expect(screen.getByLabelText(/email/i)).toHaveAttribute('required');
  });
});
