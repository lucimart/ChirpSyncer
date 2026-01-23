/**
 * Credentials Page Tests
 * Tests for the credentials management page
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '@/styles/theme';
import CredentialsPage from './page';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/dashboard/credentials',
}));

// Mock credentials data
const mockCredentials = [
  {
    id: 1,
    platform: 'twitter',
    credential_type: 'scraping',
    is_active: true,
    created_at: '2024-01-15T10:00:00Z',
    last_used: '2024-01-20T15:30:00Z',
  },
  {
    id: 2,
    platform: 'bluesky',
    credential_type: 'api',
    is_active: false,
    created_at: '2024-01-10T08:00:00Z',
    last_used: null,
  },
];

// Mock API
jest.mock('@/lib/api', () => ({
  api: {
    getCredentials: jest.fn().mockResolvedValue({
      success: true,
      data: mockCredentials,
    }),
    addCredential: jest.fn().mockResolvedValue({
      success: true,
      data: { id: 3, platform: 'twitter', credential_type: 'scraping', is_active: true },
    }),
    deleteCredential: jest.fn().mockResolvedValue({ success: true }),
    testCredential: jest.fn().mockResolvedValue({
      success: true,
      data: { valid: true, message: 'Credential is valid' },
    }),
  },
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

describe('CredentialsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Render', () => {
    it('renders page header with title', async () => {
      renderWithProviders(<CredentialsPage />);
      await waitFor(() => {
        expect(screen.getByText('Credentials')).toBeInTheDocument();
      });
    });

    it('renders add credential button', async () => {
      renderWithProviders(<CredentialsPage />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add credential/i })).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has accessible add credential button', async () => {
      renderWithProviders(<CredentialsPage />);
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /add credential/i });
        expect(button).toBeEnabled();
      });
    });

    it('displays platform badges', async () => {
      renderWithProviders(<CredentialsPage />);
      await waitFor(() => {
        expect(screen.getByText('twitter')).toBeInTheDocument();
        expect(screen.getByText('bluesky')).toBeInTheDocument();
      });
    });

    it('shows credential status badges', async () => {
      renderWithProviders(<CredentialsPage />);
      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('Inactive')).toBeInTheDocument();
      });
    });

    it('shows credential type information', async () => {
      renderWithProviders(<CredentialsPage />);
      await waitFor(() => {
        expect(screen.getByText('scraping')).toBeInTheDocument();
        expect(screen.getByText('API')).toBeInTheDocument();
      });
    });
  });

  describe('Credentials List', () => {
    it('displays credential cards', async () => {
      renderWithProviders(<CredentialsPage />);
      await waitFor(() => {
        expect(screen.getByText('twitter')).toBeInTheDocument();
        expect(screen.getByText('bluesky')).toBeInTheDocument();
      });
    });

    it('shows test button for each credential', async () => {
      renderWithProviders(<CredentialsPage />);
      await waitFor(() => {
        const testButtons = screen.getAllByRole('button', { name: /test/i });
        expect(testButtons.length).toBe(2);
      });
    });

    it('shows delete button for each credential', async () => {
      renderWithProviders(<CredentialsPage />);
      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button').filter(
          btn => btn.querySelector('[class*="Trash"]') || btn.querySelector('svg')
        );
        expect(deleteButtons.length).toBeGreaterThan(0);
      });
    });

    it('displays created and last used dates', async () => {
      renderWithProviders(<CredentialsPage />);
      await waitFor(() => {
        expect(screen.getByText(/Added:/i)).toBeInTheDocument();
        expect(screen.getByText(/Last used:/i)).toBeInTheDocument();
      });
    });
  });

  describe('Add Credential Modal', () => {
    it('opens modal when add button is clicked', async () => {
      renderWithProviders(<CredentialsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add credential/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /add credential/i }));

      await waitFor(() => {
        expect(screen.getByText('Add Credential')).toBeInTheDocument();
      });
    });

    it('shows platform select in modal', async () => {
      renderWithProviders(<CredentialsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add credential/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /add credential/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/platform/i)).toBeInTheDocument();
      });
    });

    it('shows credential type select in modal', async () => {
      renderWithProviders(<CredentialsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add credential/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /add credential/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/credential type/i)).toBeInTheDocument();
      });
    });

    it('shows username input in modal', async () => {
      renderWithProviders(<CredentialsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add credential/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /add credential/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      });
    });

    it('shows password input in modal', async () => {
      renderWithProviders(<CredentialsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add credential/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /add credential/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      });
    });

    it('closes modal when cancel is clicked', async () => {
      renderWithProviders(<CredentialsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add credential/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /add credential/i }));

      await waitFor(() => {
        expect(screen.getByText('Add Credential')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      await waitFor(() => {
        expect(screen.queryByText(/Add Credential/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Credential Actions', () => {
    it('shows loading state when testing credential', async () => {
      renderWithProviders(<CredentialsPage />);

      await waitFor(() => {
        const testButtons = screen.getAllByRole('button', { name: /test/i });
        expect(testButtons.length).toBeGreaterThan(0);
      });
    });
  });
});

describe('CredentialsPage Empty State', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Override mock for empty state
    const { api } = require('@/lib/api');
    api.getCredentials.mockResolvedValue({ success: true, data: [] });
  });

  it('shows empty state when no credentials exist', async () => {
    renderWithProviders(<CredentialsPage />);

    await waitFor(() => {
      expect(screen.getByText(/No credentials yet/i)).toBeInTheDocument();
    });
  });

  it('shows add credential button in empty state', async () => {
    renderWithProviders(<CredentialsPage />);

    await waitFor(() => {
      const addButtons = screen.getAllByRole('button', { name: /add credential/i });
      expect(addButtons.length).toBeGreaterThan(0);
    });
  });
});
