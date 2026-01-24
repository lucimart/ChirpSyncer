import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { within, expect, userEvent } from '@storybook/test';
import SyncPage from './page';

// Create a stable QueryClient for stories
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
    },
  },
});

const meta: Meta<typeof SyncPage> = {
  title: 'Pages/Dashboard/Sync',
  component: SyncPage,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
      navigation: {
        push: () => {},
        pathname: '/dashboard/sync',
      },
    },
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <div style={{ minHeight: '100vh', padding: '24px', background: '#f5f5f5' }}>
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SyncPage>;

const mockSyncStats = {
  total: 256,
  last_sync: '2025-01-15T10:30:00Z',
};

const mockSyncHistory = {
  items: [
    {
      id: 1,
      direction: 'Twitter to Bluesky',
      status: 'success',
      posts_synced: 15,
      created_at: '2025-01-15T10:30:00Z',
    },
    {
      id: 2,
      direction: 'Bluesky to Twitter',
      status: 'success',
      posts_synced: 8,
      created_at: '2025-01-15T09:15:00Z',
    },
    {
      id: 3,
      direction: 'Twitter to Bluesky',
      status: 'failed',
      posts_synced: 0,
      created_at: '2025-01-14T14:00:00Z',
    },
    {
      id: 4,
      direction: 'Bluesky to Twitter',
      status: 'pending',
      posts_synced: 0,
      created_at: '2025-01-14T12:00:00Z',
    },
  ],
};

export const Default: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/v1/sync/stats',
        method: 'GET',
        status: 200,
        response: { success: true, data: mockSyncStats },
      },
      {
        url: '/api/v1/sync/history',
        method: 'GET',
        status: 200,
        response: { success: true, data: mockSyncHistory },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Sync Dashboard')).toBeInTheDocument();
    await expect(
      canvas.getByText('Manage synchronization between Twitter and Bluesky')
    ).toBeInTheDocument();
  },
};

export const Loading: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/v1/sync/stats',
        method: 'GET',
        status: 200,
        delay: 999999,
        response: {},
      },
      {
        url: '/api/v1/sync/history',
        method: 'GET',
        status: 200,
        delay: 999999,
        response: {},
      },
    ],
  },
};

export const WithData: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/v1/sync/stats',
        method: 'GET',
        status: 200,
        response: {
          success: true,
          data: {
            total: 1842,
            last_sync: '2025-01-15T14:45:00Z',
          },
        },
      },
      {
        url: '/api/v1/sync/history',
        method: 'GET',
        status: 200,
        response: {
          success: true,
          data: {
            items: [
              {
                id: 1,
                direction: 'Twitter to Bluesky',
                status: 'success',
                posts_synced: 45,
                created_at: '2025-01-15T14:45:00Z',
              },
              {
                id: 2,
                direction: 'Bluesky to Twitter',
                status: 'success',
                posts_synced: 32,
                created_at: '2025-01-15T12:30:00Z',
              },
              {
                id: 3,
                direction: 'Twitter to Bluesky',
                status: 'success',
                posts_synced: 28,
                created_at: '2025-01-15T10:15:00Z',
              },
              {
                id: 4,
                direction: 'Bluesky to Twitter',
                status: 'success',
                posts_synced: 19,
                created_at: '2025-01-14T22:00:00Z',
              },
              {
                id: 5,
                direction: 'Twitter to Bluesky',
                status: 'success',
                posts_synced: 56,
                created_at: '2025-01-14T18:30:00Z',
              },
            ],
          },
        },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Total Synced')).toBeInTheDocument();
    await expect(canvas.getByText('Pending')).toBeInTheDocument();
    await expect(canvas.getByText('Last Sync')).toBeInTheDocument();
    await expect(canvas.getByText('Sync Directions')).toBeInTheDocument();
    await expect(canvas.getByText('Recent Sync History')).toBeInTheDocument();
  },
};

export const MobileView: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    mockData: [
      {
        url: '/api/v1/sync/stats',
        method: 'GET',
        status: 200,
        response: { success: true, data: mockSyncStats },
      },
      {
        url: '/api/v1/sync/history',
        method: 'GET',
        status: 200,
        response: { success: true, data: mockSyncHistory },
      },
    ],
  },
};

export const AccessibilityCheck: Story = {
  parameters: {
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'heading-order', enabled: true },
          { id: 'button-name', enabled: true },
        ],
      },
    },
    mockData: [
      {
        url: '/api/v1/sync/stats',
        method: 'GET',
        status: 200,
        response: { success: true, data: mockSyncStats },
      },
      {
        url: '/api/v1/sync/history',
        method: 'GET',
        status: 200,
        response: { success: true, data: mockSyncHistory },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify accessible elements
    await expect(canvas.getByRole('heading', { name: 'Sync Dashboard' })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /sync now/i })).toBeInTheDocument();

    // Check directional sync buttons
    await expect(canvas.getByRole('button', { name: /sync twitter.*bluesky/i })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /sync bluesky.*twitter/i })).toBeInTheDocument();
  },
};

export const EmptyHistory: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/v1/sync/stats',
        method: 'GET',
        status: 200,
        response: {
          success: true,
          data: {
            total: 0,
            last_sync: null,
          },
        },
      },
      {
        url: '/api/v1/sync/history',
        method: 'GET',
        status: 200,
        response: { success: true, data: { items: [] } },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('No sync history available yet')).toBeInTheDocument();
  },
};

export const SyncInProgress: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/v1/sync/stats',
        method: 'GET',
        status: 200,
        response: { success: true, data: mockSyncStats },
      },
      {
        url: '/api/v1/sync/history',
        method: 'GET',
        status: 200,
        response: { success: true, data: mockSyncHistory },
      },
      {
        url: '/api/v1/sync/start',
        method: 'POST',
        status: 200,
        delay: 5000, // Simulate long-running sync
        response: { success: true, data: { operation_id: 'op-123' } },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Click sync button to trigger loading state
    const syncButton = await canvas.findByRole('button', { name: /sync now/i });
    await userEvent.click(syncButton);

    // Button should show loading state
    await expect(syncButton).toBeDisabled();
  },
};

export const WithFailedSyncs: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/v1/sync/stats',
        method: 'GET',
        status: 200,
        response: { success: true, data: mockSyncStats },
      },
      {
        url: '/api/v1/sync/history',
        method: 'GET',
        status: 200,
        response: {
          success: true,
          data: {
            items: [
              {
                id: 1,
                direction: 'Twitter to Bluesky',
                status: 'failed',
                posts_synced: 0,
                created_at: '2025-01-15T10:30:00Z',
              },
              {
                id: 2,
                direction: 'Bluesky to Twitter',
                status: 'failed',
                posts_synced: 0,
                created_at: '2025-01-15T09:15:00Z',
              },
              {
                id: 3,
                direction: 'Twitter to Bluesky',
                status: 'success',
                posts_synced: 12,
                created_at: '2025-01-14T14:00:00Z',
              },
            ],
          },
        },
      },
    ],
  },
};

export const AllSuccessful: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/v1/sync/stats',
        method: 'GET',
        status: 200,
        response: {
          success: true,
          data: {
            total: 500,
            last_sync: '2025-01-15T15:00:00Z',
          },
        },
      },
      {
        url: '/api/v1/sync/history',
        method: 'GET',
        status: 200,
        response: {
          success: true,
          data: {
            items: Array.from({ length: 10 }, (_, i) => ({
              id: i + 1,
              direction: i % 2 === 0 ? 'Twitter to Bluesky' : 'Bluesky to Twitter',
              status: 'success',
              posts_synced: Math.floor(Math.random() * 50) + 5,
              created_at: new Date(Date.now() - i * 3600000).toISOString(),
            })),
          },
        },
      },
    ],
  },
};

export const ErrorState: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/v1/sync/stats',
        method: 'GET',
        status: 500,
        response: { success: false, error: 'Internal server error' },
      },
      {
        url: '/api/v1/sync/history',
        method: 'GET',
        status: 500,
        response: { success: false, error: 'Internal server error' },
      },
    ],
  },
};

export const NeverSynced: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/v1/sync/stats',
        method: 'GET',
        status: 200,
        response: {
          success: true,
          data: {
            total: 0,
            last_sync: null,
          },
        },
      },
      {
        url: '/api/v1/sync/history',
        method: 'GET',
        status: 200,
        response: { success: true, data: { items: [] } },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // "Never" should be displayed for last sync
    await expect(canvas.getByText('Never')).toBeInTheDocument();
  },
};
