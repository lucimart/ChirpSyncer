import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { within, expect, userEvent } from '@storybook/test';
import AnalyticsPage from './page';

// Create a stable QueryClient for stories
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
    },
  },
});

const meta: Meta<typeof AnalyticsPage> = {
  title: 'Pages/Dashboard/Analytics',
  component: AnalyticsPage,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
      navigation: {
        push: () => {},
        pathname: '/dashboard/analytics',
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
type Story = StoryObj<typeof AnalyticsPage>;

const mockOverviewData = {
  total_impressions: 125000,
  total_engagements: 4500,
  avg_engagement_rate: 3.6,
  total_likes: 3200,
  total_replies: 1300,
};

const mockTopTweetsData = {
  items: [
    { tweet_id: 'tweet-1', likes: 150, replies: 42 },
    { tweet_id: 'tweet-2', likes: 89, replies: 23 },
    { tweet_id: 'tweet-3', likes: 67, replies: 15 },
  ],
};

export const Default: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/v1/analytics/overview*',
        method: 'GET',
        status: 200,
        response: { success: true, data: mockOverviewData },
      },
      {
        url: '/api/v1/analytics/top-tweets*',
        method: 'GET',
        status: 200,
        response: { success: true, data: mockTopTweetsData },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Analytics')).toBeInTheDocument();
    await expect(
      canvas.getByText('Track your social media performance across platforms')
    ).toBeInTheDocument();
  },
};

export const Loading: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/v1/analytics/overview*',
        method: 'GET',
        status: 200,
        delay: 999999,
        response: {},
      },
      {
        url: '/api/v1/analytics/top-tweets*',
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
        url: '/api/v1/analytics/overview*',
        method: 'GET',
        status: 200,
        response: {
          success: true,
          data: {
            total_impressions: 542000,
            total_engagements: 18500,
            avg_engagement_rate: 5.2,
            total_likes: 12400,
            total_replies: 6100,
          },
        },
      },
      {
        url: '/api/v1/analytics/top-tweets*',
        method: 'GET',
        status: 200,
        response: {
          success: true,
          data: {
            items: [
              { tweet_id: 'tweet-1', likes: 892, replies: 234 },
              { tweet_id: 'tweet-2', likes: 654, replies: 178 },
              { tweet_id: 'tweet-3', likes: 521, replies: 145 },
              { tweet_id: 'tweet-4', likes: 398, replies: 89 },
              { tweet_id: 'tweet-5', likes: 287, replies: 67 },
            ],
          },
        },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Total Followers')).toBeInTheDocument();
    await expect(canvas.getByText('Engagement Rate')).toBeInTheDocument();
    await expect(canvas.getByText('Impressions')).toBeInTheDocument();
    await expect(canvas.getByText('Interactions')).toBeInTheDocument();
    await expect(canvas.getByText('Engagement Over Time')).toBeInTheDocument();
    await expect(canvas.getByText('Platform Breakdown')).toBeInTheDocument();
  },
};

export const MobileView: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    mockData: [
      {
        url: '/api/v1/analytics/overview*',
        method: 'GET',
        status: 200,
        response: { success: true, data: mockOverviewData },
      },
      {
        url: '/api/v1/analytics/top-tweets*',
        method: 'GET',
        status: 200,
        response: { success: true, data: mockTopTweetsData },
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
        url: '/api/v1/analytics/overview*',
        method: 'GET',
        status: 200,
        response: { success: true, data: mockOverviewData },
      },
      {
        url: '/api/v1/analytics/top-tweets*',
        method: 'GET',
        status: 200,
        response: { success: true, data: mockTopTweetsData },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify accessible elements
    await expect(canvas.getByRole('heading', { name: 'Analytics' })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /export/i })).toBeInTheDocument();

    // Check period selector buttons
    await expect(canvas.getByText('24h')).toBeInTheDocument();
    await expect(canvas.getByText('7d')).toBeInTheDocument();
    await expect(canvas.getByText('30d')).toBeInTheDocument();
    await expect(canvas.getByText('90d')).toBeInTheDocument();
  },
};

export const Period24Hours: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/v1/analytics/overview*',
        method: 'GET',
        status: 200,
        response: {
          success: true,
          data: {
            total_impressions: 8500,
            total_engagements: 320,
            avg_engagement_rate: 3.8,
            total_likes: 245,
            total_replies: 75,
          },
        },
      },
      {
        url: '/api/v1/analytics/top-tweets*',
        method: 'GET',
        status: 200,
        response: { success: true, data: mockTopTweetsData },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Click 24h period
    const button24h = await canvas.findByText('24h');
    await userEvent.click(button24h);
  },
};

export const Period90Days: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/v1/analytics/overview*',
        method: 'GET',
        status: 200,
        response: {
          success: true,
          data: {
            total_impressions: 1250000,
            total_engagements: 45000,
            avg_engagement_rate: 3.6,
            total_likes: 32000,
            total_replies: 13000,
          },
        },
      },
      {
        url: '/api/v1/analytics/top-tweets*',
        method: 'GET',
        status: 200,
        response: { success: true, data: mockTopTweetsData },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Click 90d period
    const button90d = await canvas.findByText('90d');
    await userEvent.click(button90d);
  },
};

export const NoTopPosts: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/v1/analytics/overview*',
        method: 'GET',
        status: 200,
        response: { success: true, data: mockOverviewData },
      },
      {
        url: '/api/v1/analytics/top-tweets*',
        method: 'GET',
        status: 200,
        response: { success: true, data: { items: [] } },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Top Performing Posts')).toBeInTheDocument();
  },
};

export const HighEngagement: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/v1/analytics/overview*',
        method: 'GET',
        status: 200,
        response: {
          success: true,
          data: {
            total_impressions: 2500000,
            total_engagements: 125000,
            avg_engagement_rate: 8.5,
            total_likes: 98000,
            total_replies: 27000,
          },
        },
      },
      {
        url: '/api/v1/analytics/top-tweets*',
        method: 'GET',
        status: 200,
        response: {
          success: true,
          data: {
            items: [
              { tweet_id: 'viral-1', likes: 15000, replies: 4200 },
              { tweet_id: 'viral-2', likes: 8900, replies: 2300 },
              { tweet_id: 'viral-3', likes: 6700, replies: 1800 },
            ],
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
        url: '/api/v1/analytics/overview*',
        method: 'GET',
        status: 500,
        response: { success: false, error: 'Internal server error' },
      },
      {
        url: '/api/v1/analytics/top-tweets*',
        method: 'GET',
        status: 500,
        response: { success: false, error: 'Internal server error' },
      },
    ],
  },
};
