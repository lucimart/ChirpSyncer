/**
 * Connectors Page Tests
 * Tests for the platform connectors management page
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '@/styles/theme';
import ConnectorsPage from './page';

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
  usePathname: () => '/dashboard/connectors',
}));

// Mock connectors - data inline to avoid hoisting issues
jest.mock('@/lib/connectors', () => {
  const connectors = [
    {
      id: 'twitter-connector',
      platform: 'twitter',
      name: 'Twitter',
      icon: 'T',
      color: '#1DA1F2',
      description: 'Connect your Twitter account',
      auth_type: 'session',
      status: 'available',
      capabilities: {
        publish: true,
        read: true,
        edit: false,
        delete: true,
        metrics: true,
        schedule: true,
        threads: true,
        characterLimit: 280,
        altTextLimit: 1000,
        media: { images: true, videos: true, gifs: true, maxImages: 4 },
        interactions: { like: true, repost: true, reply: true, quote: true, bookmark: true },
      },
    },
    {
      id: 'bluesky-connector',
      platform: 'bluesky',
      name: 'Bluesky',
      icon: 'B',
      color: '#0085FF',
      description: 'Connect your Bluesky account',
      auth_type: 'atproto',
      status: 'available',
      capabilities: {
        publish: true,
        read: true,
        edit: false,
        delete: true,
        metrics: true,
        schedule: true,
        threads: true,
        characterLimit: 300,
        altTextLimit: 2000,
        media: { images: true, videos: false, gifs: false, maxImages: 4 },
        interactions: { like: true, repost: true, reply: true, quote: true, bookmark: false },
      },
    },
  ];
  const connections = [
    {
      id: 'conn-1',
      platform: 'twitter',
      connected: true,
      sync_enabled: true,
      handle: '@testuser',
      last_sync: new Date().toISOString(),
    },
  ];
  const syncConfigs = [
    {
      platform: 'twitter',
      enabled: true,
      direction: 'bidirectional',
      filters: { include_replies: true, include_reposts: false, include_quotes: true },
      transform: { add_source_link: false, preserve_mentions: true, preserve_hashtags: true, truncate_strategy: 'thread' },
    },
  ];
  return {
    useConnectors: () => ({ data: connectors, isLoading: false }),
    useConnections: () => ({ data: connections, isLoading: false }),
    useSyncConfigs: () => ({ data: syncConfigs, isLoading: false }),
    useConnectPlatform: () => ({
      mutateAsync: jest.fn().mockResolvedValue({}),
      isPending: false,
    }),
    useDisconnectPlatform: () => ({
      mutateAsync: jest.fn().mockResolvedValue({}),
      isPending: false,
    }),
    useUpdateSyncConfig: () => ({
      mutateAsync: jest.fn().mockResolvedValue({}),
      isPending: false,
    }),
    AVAILABLE_CONNECTORS: connectors,
    PlatformConnector: {},
    PlatformConnection: {},
    PlatformSyncConfig: {},
    PlatformType: {},
  };
});

// Mock toast
jest.mock('@/components/ui', () => {
  const actual = jest.requireActual('@/components/ui');
  return {
    ...actual,
    useToast: () => ({ addToast: jest.fn() }),
  };
});

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

describe('ConnectorsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Render', () => {
    it('renders page header with title', () => {
      renderWithProviders(<ConnectorsPage />);
      expect(screen.getByText('Platform Connectors')).toBeInTheDocument();
    });

    it('renders page description', () => {
      renderWithProviders(<ConnectorsPage />);
      expect(
        screen.getByText(/Connect your social media accounts and configure sync settings/i)
      ).toBeInTheDocument();
    });

    it('renders tab navigation', () => {
      renderWithProviders(<ConnectorsPage />);
      expect(screen.getByText('Platforms')).toBeInTheDocument();
      expect(screen.getByText('Flow View')).toBeInTheDocument();
    });

    it('renders available platforms section', () => {
      renderWithProviders(<ConnectorsPage />);
      expect(screen.getByText('Available Platforms')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible tab buttons', () => {
      renderWithProviders(<ConnectorsPage />);
      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBeGreaterThanOrEqual(2);
    });

    it('displays platform names', () => {
      renderWithProviders(<ConnectorsPage />);
      expect(screen.getAllByText('Twitter').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Bluesky').length).toBeGreaterThan(0);
    });

    it('shows connection status', () => {
      renderWithProviders(<ConnectorsPage />);
      expect(screen.getByText(/Connected as @testuser/i)).toBeInTheDocument();
    });

    it('displays connect buttons for disconnected platforms', () => {
      renderWithProviders(<ConnectorsPage />);
      const connectButtons = screen.getAllByRole('button', { name: /connect/i });
      expect(connectButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Platform Cards', () => {
    it('shows disconnect button for connected platforms', () => {
      renderWithProviders(<ConnectorsPage />);
      expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument();
    });

    it('shows settings button for connected platforms', () => {
      renderWithProviders(<ConnectorsPage />);
      const settingsButtons = screen.getAllByRole('button', { name: /settings/i });
      expect(settingsButtons.length).toBeGreaterThan(0);
    });

    it('shows expand button for platform details', () => {
      renderWithProviders(<ConnectorsPage />);
      const expandButtons = screen.getAllByRole('button', { name: /show details/i });
      expect(expandButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Sync Configuration', () => {
    it('displays sync configuration section', () => {
      renderWithProviders(<ConnectorsPage />);
      expect(screen.getByText('Sync Configuration')).toBeInTheDocument();
    });

    it('shows sync direction options', () => {
      renderWithProviders(<ConnectorsPage />);
      expect(screen.getByText('Sync Direction')).toBeInTheDocument();
    });

    it('displays sync toggle switch', () => {
      renderWithProviders(<ConnectorsPage />);
      const switches = screen.getAllByRole('switch');
      expect(switches.length).toBeGreaterThan(0);
    });
  });

  describe('Tab Navigation', () => {
    it('shows platforms tab by default', () => {
      renderWithProviders(<ConnectorsPage />);
      expect(screen.getByText('Available Platforms')).toBeInTheDocument();
    });

    it('switches to flow view when clicked', async () => {
      renderWithProviders(<ConnectorsPage />);

      const flowTab = screen.getByText('Flow View');
      fireEvent.click(flowTab);

      await waitFor(() => {
        // Flow diagram should be rendered (check for a specific element)
        expect(screen.queryByText('Available Platforms')).not.toBeInTheDocument();
      });
    });
  });

  describe('Connect Modal', () => {
    it('opens connect modal when connect button is clicked', async () => {
      renderWithProviders(<ConnectorsPage />);

      // Find the connect button for Bluesky (not connected)
      const connectButtons = screen.getAllByRole('button', { name: /^connect$/i });
      if (connectButtons.length > 0) {
        fireEvent.click(connectButtons[0]);

        await waitFor(() => {
          expect(screen.getByText(/Connect to/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Capability Display', () => {
    it('expands to show capabilities when details button is clicked', async () => {
      renderWithProviders(<ConnectorsPage />);

      const expandButtons = screen.getAllByRole('button', { name: /show details/i });
      fireEvent.click(expandButtons[0]);

      await waitFor(() => {
        expect(screen.getAllByText('Core').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Media').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Interactions').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Limits').length).toBeGreaterThan(0);
      });
    });
  });
});
