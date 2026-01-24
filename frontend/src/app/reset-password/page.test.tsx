import type { ReactElement } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/styles/ThemeContext';
import ResetPasswordPage from './page';

// Mock next/navigation
const mockPush = jest.fn();
const mockSearchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

// Mock api
const mockValidateResetToken = jest.fn();
const mockResetPassword = jest.fn();
jest.mock('@/lib/api', () => ({
  api: {
    validateResetToken: (...args: unknown[]) => mockValidateResetToken(...args),
    resetPassword: (...args: unknown[]) => mockResetPassword(...args),
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

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams.delete('token');
  });

  describe('without token', () => {
    it('shows invalid token state when no token provided', async () => {
      mockValidateResetToken.mockResolvedValue({ success: false });

      renderWithProviders(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByText(/invalid or expired link/i)).toBeInTheDocument();
      });
    });

    it('shows request new link button', async () => {
      mockValidateResetToken.mockResolvedValue({ success: false });

      renderWithProviders(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /request new link/i })).toHaveAttribute(
          'href',
          '/forgot-password'
        );
      });
    });

    it('shows back to sign in link', async () => {
      mockValidateResetToken.mockResolvedValue({ success: false });

      renderWithProviders(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /back to sign in/i })).toHaveAttribute(
          'href',
          '/login'
        );
      });
    });
  });

  describe('with valid token', () => {
    beforeEach(() => {
      mockSearchParams.set('token', 'valid-token-123');
      mockValidateResetToken.mockResolvedValue({
        success: true,
        data: { valid: true, email: 'user@example.com' },
      });
    });

    it('renders reset password form after token validation', async () => {
      renderWithProviders(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
      });
    });

    it('shows user email in subtitle', async () => {
      renderWithProviders(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByText(/user@example.com/i)).toBeInTheDocument();
      });
    });

    it('has accessible form labels with correct input types', async () => {
      renderWithProviders(<ResetPasswordPage />);

      await waitFor(() => {
        const newPasswordInput = screen.getByLabelText(/new password/i);
        const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

        expect(newPasswordInput).toHaveAttribute('type', 'password');
        expect(confirmPasswordInput).toHaveAttribute('type', 'password');
        expect(newPasswordInput).toHaveAttribute('autocomplete', 'new-password');
        expect(confirmPasswordInput).toHaveAttribute('autocomplete', 'new-password');
      });
    });

    it('shows password hint', async () => {
      renderWithProviders(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('submits form and shows success message', async () => {
      const user = userEvent.setup();
      mockResetPassword.mockResolvedValue({ success: true });

      renderWithProviders(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/new password/i), 'newpassword123');
      await user.type(screen.getByLabelText(/confirm password/i), 'newpassword123');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith('valid-token-123', 'newpassword123');
        expect(screen.getByText(/password reset successfully/i)).toBeInTheDocument();
      });
    });

    it('shows sign in now button after success', async () => {
      const user = userEvent.setup();
      mockResetPassword.mockResolvedValue({ success: true });

      renderWithProviders(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/new password/i), 'newpassword123');
      await user.type(screen.getByLabelText(/confirm password/i), 'newpassword123');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /sign in now/i })).toHaveAttribute(
          'href',
          '/login'
        );
      });
    });

    it('shows error when passwords do not match', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/new password/i), 'newpassword123');
      await user.type(screen.getByLabelText(/confirm password/i), 'different456');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });

      expect(mockResetPassword).not.toHaveBeenCalled();
    });

    it('shows error when password is too short', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/new password/i), 'short');
      await user.type(screen.getByLabelText(/confirm password/i), 'short');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });

      expect(mockResetPassword).not.toHaveBeenCalled();
    });

    it('shows error message on failed reset', async () => {
      const user = userEvent.setup();
      mockResetPassword.mockResolvedValue({
        success: false,
        error: 'Token expired',
      });

      renderWithProviders(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/new password/i), 'newpassword123');
      await user.type(screen.getByLabelText(/confirm password/i), 'newpassword123');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      await waitFor(() => {
        expect(screen.getByText(/token expired/i)).toBeInTheDocument();
      });
    });

    it('disables submit button while loading', async () => {
      const user = userEvent.setup();
      mockResetPassword.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      renderWithProviders(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/new password/i), 'newpassword123');
      await user.type(screen.getByLabelText(/confirm password/i), 'newpassword123');
      await user.click(screen.getByRole('button', { name: /reset password/i }));

      expect(screen.getByRole('button', { name: /reset password/i })).toBeDisabled();
    });

    it('all inputs are required', async () => {
      renderWithProviders(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/new password/i)).toHaveAttribute('required');
        expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute('required');
      });
    });
  });

  describe('with invalid token', () => {
    beforeEach(() => {
      mockSearchParams.set('token', 'invalid-token');
      mockValidateResetToken.mockResolvedValue({
        success: true,
        data: { valid: false },
      });
    });

    it('shows invalid token message', async () => {
      renderWithProviders(<ResetPasswordPage />);

      await waitFor(() => {
        expect(screen.getByText(/invalid or expired link/i)).toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    beforeEach(() => {
      mockSearchParams.set('token', 'valid-token-123');
      mockValidateResetToken.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true, data: { valid: true, email: 'user@example.com' } }), 1000))
      );
    });

    it('shows validating message while checking token', () => {
      renderWithProviders(<ResetPasswordPage />);

      expect(screen.getByText(/validating reset link/i)).toBeInTheDocument();
    });
  });
});
