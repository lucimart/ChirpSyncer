/**
 * Settings Page Tests
 * Tests for the user settings and preferences page
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '@/styles/theme';
import SettingsPage from './page';

// Mock OnboardingProvider
jest.mock('@/components/onboarding', () => ({
  OnboardingProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useOnboarding: () => ({
    steps: [],
    currentStep: null,
    progress: 100,
    isComplete: true,
    showChecklist: false,
    completeStep: jest.fn(),
    dismissChecklist: jest.fn(),
    resetOnboarding: jest.fn(),
  }),
  OnboardingChecklist: () => null,
}));

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/dashboard/settings',
}));

// Mock auth
const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  is_admin: false,
};

jest.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: mockUser,
    checkAuth: jest.fn(),
    isAuthenticated: true,
  }),
}));

// Mock API
jest.mock('@/lib/api', () => ({
  api: {
    updateProfile: jest.fn().mockResolvedValue({ success: true }),
    changePassword: jest.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock ThemeContext
const mockSetMode = jest.fn();
jest.mock('@/styles/ThemeContext', () => ({
  useTheme: () => ({
    mode: 'light',
    setMode: mockSetMode,
  }),
  ThemeMode: {},
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </QueryClientProvider>
  );
};

describe('SettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Render', () => {
    it('renders page header with title', () => {
      renderWithProviders(<SettingsPage />);
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('renders page description', () => {
      renderWithProviders(<SettingsPage />);
      expect(screen.getByText(/Manage your account and preferences/i)).toBeInTheDocument();
    });

    it('renders account section', () => {
      renderWithProviders(<SettingsPage />);
      expect(screen.getByText('Account')).toBeInTheDocument();
    });

    it('renders notifications section', () => {
      renderWithProviders(<SettingsPage />);
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    it('renders appearance section', () => {
      renderWithProviders(<SettingsPage />);
      expect(screen.getByText('Appearance')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible username input', () => {
      renderWithProviders(<SettingsPage />);
      const usernameInput = screen.getByLabelText(/username/i);
      expect(usernameInput).toBeInTheDocument();
      expect(usernameInput).toBeDisabled(); // Username is not editable
    });

    it('has accessible email input', () => {
      renderWithProviders(<SettingsPage />);
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toBeEnabled();
    });

    it('has accessible save button', () => {
      renderWithProviders(<SettingsPage />);
      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).toBeEnabled();
    });

    it('has accessible change password button', () => {
      renderWithProviders(<SettingsPage />);
      const passwordButton = screen.getByRole('button', { name: /change password/i });
      expect(passwordButton).toBeEnabled();
    });
  });

  describe('Account Section', () => {
    it('displays username field', () => {
      renderWithProviders(<SettingsPage />);
      expect(screen.getByLabelText(/username/i)).toHaveValue('testuser');
    });

    it('displays email field', () => {
      renderWithProviders(<SettingsPage />);
      expect(screen.getByLabelText(/email/i)).toHaveValue('test@example.com');
    });

    it('allows editing email', () => {
      renderWithProviders(<SettingsPage />);
      const emailInput = screen.getByLabelText(/email/i);

      fireEvent.change(emailInput, { target: { value: 'new@example.com' } });

      expect(emailInput).toHaveValue('new@example.com');
    });
  });

  describe('Notifications Section', () => {
    it('displays sync completed toggle', () => {
      renderWithProviders(<SettingsPage />);
      expect(screen.getByText('Sync Completed')).toBeInTheDocument();
    });

    it('displays sync failed toggle', () => {
      renderWithProviders(<SettingsPage />);
      expect(screen.getByText('Sync Failed')).toBeInTheDocument();
    });

    it('displays weekly report toggle', () => {
      renderWithProviders(<SettingsPage />);
      expect(screen.getByText('Weekly Report')).toBeInTheDocument();
    });

    it('has toggle switches for notifications', () => {
      renderWithProviders(<SettingsPage />);
      const switches = screen.getAllByRole('switch');
      expect(switches.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Appearance Section', () => {
    it('displays theme options', () => {
      renderWithProviders(<SettingsPage />);
      expect(screen.getByText('Theme')).toBeInTheDocument();
    });

    it('shows light, dark, and system theme options', () => {
      renderWithProviders(<SettingsPage />);
      expect(screen.getByText('Light')).toBeInTheDocument();
      expect(screen.getByText('Dark')).toBeInTheDocument();
      expect(screen.getByText('System')).toBeInTheDocument();
    });

    it('allows theme selection', () => {
      renderWithProviders(<SettingsPage />);

      const darkButton = screen.getByText('Dark');
      fireEvent.click(darkButton);

      expect(mockSetMode).toHaveBeenCalledWith('dark');
    });
  });

  describe('Password Change', () => {
    it('shows password form when change password is clicked', async () => {
      renderWithProviders(<SettingsPage />);

      fireEvent.click(screen.getByRole('button', { name: /change password/i }));

      await waitFor(() => {
        // Check form is visible by looking for the password inputs
        expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
      });
    });

    it('hides password form when clicking change password again', async () => {
      renderWithProviders(<SettingsPage />);

      // Open password form
      fireEvent.click(screen.getByRole('button', { name: /change password/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
      });

      // Close password form
      fireEvent.click(screen.getByRole('button', { name: /change password/i }));

      await waitFor(() => {
        expect(screen.queryByLabelText(/current password/i)).not.toBeInTheDocument();
      });
    });

    it('shows update password button in password form', async () => {
      renderWithProviders(<SettingsPage />);

      fireEvent.click(screen.getByRole('button', { name: /change password/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument();
      });
    });
  });

  describe('Save Actions', () => {
    it('saves changes when save button is clicked', async () => {
      const { api } = require('@/lib/api');
      renderWithProviders(<SettingsPage />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(api.updateProfile).toHaveBeenCalled();
      });
    });

    it('shows success message after saving', async () => {
      renderWithProviders(<SettingsPage />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/Changes saved successfully/i)).toBeInTheDocument();
      });
    });
  });
});
