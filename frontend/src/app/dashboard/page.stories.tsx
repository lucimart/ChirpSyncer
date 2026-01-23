import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { within, expect } from '@storybook/test';
import DashboardPage from './page';

// Create a stable QueryClient for stories
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
    },
  },
});

const meta: Meta<typeof DashboardPage> = {
  title: 'Pages/Dashboard/Home',
  component: DashboardPage,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
      navigation: {
        push: () => {},
        pathname: '/dashboard',
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
type Story = StoryObj<typeof DashboardPage>;

export const Default: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/v1/dashboard/stats',
        method: 'GET',
        status: 200,
        response: {
          success: true,
          data: {
            synced_today: 15,
            synced_week: 42,
            total_synced: 256,
            platforms_connected: 2,
          },
        },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify dashboard structure
    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();
    await expect(canvas.getByText('Overview of your ChirpSyncer activity')).toBeInTheDocument();
  },
};

export const Loading: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/v1/dashboard/stats',
        method: 'GET',
        status: 200,
        delay: 999999, // Infinite delay to show loading state
        response: {},
      },
    ],
  },
};

export const WithData: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/v1/dashboard/stats',
        method: 'GET',
        status: 200,
        response: {
          success: true,
          data: {
            synced_today: 127,
            synced_week: 843,
            total_synced: 12456,
            platforms_connected: 4,
          },
        },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Dashboard')).toBeInTheDocument();
    await expect(canvas.getByText('Synced Today')).toBeInTheDocument();
    await expect(canvas.getByText('Total Synced')).toBeInTheDocument();
  },
};

export const MobileView: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    mockData: [
      {
        url: '/api/v1/dashboard/stats',
        method: 'GET',
        status: 200,
        response: {
          success: true,
          data: {
            synced_today: 15,
            synced_week: 42,
            total_synced: 256,
            platforms_connected: 2,
          },
        },
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
          { id: 'link-name', enabled: true },
        ],
      },
    },
    mockData: [
      {
        url: '/api/v1/dashboard/stats',
        method: 'GET',
        status: 200,
        response: {
          success: true,
          data: {
            synced_today: 15,
            synced_week: 42,
            total_synced: 256,
            platforms_connected: 2,
          },
        },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify accessible elements
    await expect(canvas.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    await expect(canvas.getByRole('link', { name: /manage credentials/i })).toBeInTheDocument();
  },
};

export const EmptyState: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/v1/dashboard/stats',
        method: 'GET',
        status: 200,
        response: {
          success: true,
          data: {
            synced_today: 0,
            synced_week: 0,
            total_synced: 0,
            platforms_connected: 0,
          },
        },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('No recent activity')).toBeInTheDocument();
    await expect(
      canvas.getByText('Start by adding credentials and syncing your accounts.')
    ).toBeInTheDocument();
  },
};

export const ErrorState: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/v1/dashboard/stats',
        method: 'GET',
        status: 500,
        response: {
          success: false,
          error: 'Internal server error',
        },
      },
    ],
  },
};
