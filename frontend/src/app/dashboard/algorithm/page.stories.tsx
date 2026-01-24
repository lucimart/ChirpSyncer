import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { within, expect, userEvent } from '@storybook/test';
import AlgorithmPage from './page';

// Create a stable QueryClient for stories
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
    },
  },
});

const meta: Meta<typeof AlgorithmPage> = {
  title: 'Pages/Dashboard/Algorithm',
  component: AlgorithmPage,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
      navigation: {
        push: () => {},
        pathname: '/dashboard/algorithm',
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
type Story = StoryObj<typeof AlgorithmPage>;

const mockStats = {
  transparencyScore: 85,
  totalRules: 10,
  activeRules: 7,
  feedComposition: {
    boosted: 30,
    demoted: 15,
    filtered: 5,
    unaffected: 50,
  },
  topRules: [
    {
      ruleId: 'rule-1',
      ruleName: 'Boost Followed Users',
      ruleType: 'boost',
      postsAffected: 120,
      averageImpact: 25,
    },
    {
      ruleId: 'rule-2',
      ruleName: 'Demote Spam Content',
      ruleType: 'demote',
      postsAffected: 45,
      averageImpact: -15,
    },
    {
      ruleId: 'rule-3',
      ruleName: 'Filter Blocked Users',
      ruleType: 'filter',
      postsAffected: 10,
    },
  ],
  lastUpdated: '2025-01-14T10:30:00Z',
};

export const Default: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/v1/algorithm/stats',
        method: 'GET',
        status: 200,
        response: { success: true, data: mockStats },
      },
      {
        url: '/api/v1/algorithm/settings',
        method: 'GET',
        status: 200,
        response: { success: true, data: { algorithm_enabled: true } },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Algorithm Dashboard')).toBeInTheDocument();
    await expect(
      canvas.getByText('Review your transparency score and see how rules shape the feed.')
    ).toBeInTheDocument();
  },
};

export const Loading: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/v1/algorithm/stats',
        method: 'GET',
        status: 200,
        delay: 999999,
        response: {},
      },
      {
        url: '/api/v1/algorithm/settings',
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
        url: '/api/v1/algorithm/stats',
        method: 'GET',
        status: 200,
        response: {
          success: true,
          data: {
            ...mockStats,
            transparencyScore: 92,
            activeRules: 12,
            totalRules: 15,
          },
        },
      },
      {
        url: '/api/v1/algorithm/settings',
        method: 'GET',
        status: 200,
        response: { success: true, data: { algorithm_enabled: true } },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Transparency Score')).toBeInTheDocument();
    await expect(canvas.getByText('Feed Composition')).toBeInTheDocument();
    await expect(canvas.getByText('Top Impactful Rules')).toBeInTheDocument();
  },
};

export const MobileView: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    mockData: [
      {
        url: '/api/v1/algorithm/stats',
        method: 'GET',
        status: 200,
        response: { success: true, data: mockStats },
      },
      {
        url: '/api/v1/algorithm/settings',
        method: 'GET',
        status: 200,
        response: { success: true, data: { algorithm_enabled: true } },
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
          { id: 'aria-meter-name', enabled: true },
        ],
      },
    },
    mockData: [
      {
        url: '/api/v1/algorithm/stats',
        method: 'GET',
        status: 200,
        response: { success: true, data: mockStats },
      },
      {
        url: '/api/v1/algorithm/settings',
        method: 'GET',
        status: 200,
        response: { success: true, data: { algorithm_enabled: true } },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify accessible elements
    await expect(canvas.getByRole('heading', { name: 'Algorithm Dashboard' })).toBeInTheDocument();
    await expect(canvas.getByRole('switch', { name: /enable algorithmic sorting/i })).toBeInTheDocument();
    await expect(canvas.getByRole('meter')).toBeInTheDocument();
  },
};

export const AlgorithmDisabled: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/v1/algorithm/stats',
        method: 'GET',
        status: 200,
        response: { success: true, data: mockStats },
      },
      {
        url: '/api/v1/algorithm/settings',
        method: 'GET',
        status: 200,
        response: { success: true, data: { algorithm_enabled: false } },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Chronological mode active')).toBeInTheDocument();
  },
};

export const LowTransparency: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/v1/algorithm/stats',
        method: 'GET',
        status: 200,
        response: {
          success: true,
          data: {
            ...mockStats,
            transparencyScore: 35,
          },
        },
      },
      {
        url: '/api/v1/algorithm/settings',
        method: 'GET',
        status: 200,
        response: { success: true, data: { algorithm_enabled: true } },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Low transparency')).toBeInTheDocument();
  },
};

export const ErrorState: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/v1/algorithm/stats',
        method: 'GET',
        status: 500,
        response: { success: false, error: 'Internal server error' },
      },
      {
        url: '/api/v1/algorithm/settings',
        method: 'GET',
        status: 200,
        response: { success: true, data: { algorithm_enabled: true } },
      },
    ],
  },
};

export const InteractiveToggle: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/v1/algorithm/stats',
        method: 'GET',
        status: 200,
        response: { success: true, data: mockStats },
      },
      {
        url: '/api/v1/algorithm/settings',
        method: 'GET',
        status: 200,
        response: { success: true, data: { algorithm_enabled: true } },
      },
      {
        url: '/api/v1/algorithm/settings',
        method: 'POST',
        status: 200,
        response: { success: true, data: { algorithm_enabled: false } },
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const toggle = await canvas.findByRole('switch', { name: /enable algorithmic sorting/i });
    await expect(toggle).toBeChecked();

    // Toggle the switch
    await userEvent.click(toggle);
  },
};
