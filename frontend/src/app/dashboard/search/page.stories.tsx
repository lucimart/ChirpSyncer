import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SearchPage from './page';

const mockSearchResults = [
  {
    id: '1',
    content: 'This is a test tweet about React and frontend development',
    platform: 'twitter',
    created_at: '2024-01-15T10:00:00Z',
    author: 'testuser',
    hashtags: ['react', 'javascript', 'frontend'],
  },
  {
    id: '2',
    content: 'Bluesky post about TypeScript best practices',
    platform: 'bluesky',
    created_at: '2024-01-16T12:00:00Z',
    author: 'devuser',
    hashtags: ['typescript'],
  },
  {
    id: '3',
    content: 'Another tweet discussing web development trends in 2024',
    platform: 'twitter',
    created_at: '2024-01-17T09:30:00Z',
    author: 'webdev',
    hashtags: ['webdev', 'trends'],
  },
];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Infinity },
  },
});

const meta: Meta<typeof SearchPage> = {
  title: 'Pages/Dashboard/Search',
  component: SearchPage,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
      navigation: {
        push: () => {},
      },
    },
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SearchPage>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Search')).toBeInTheDocument();
    await expect(canvas.getByPlaceholderText('Search posts...')).toBeInTheDocument();
    await expect(canvas.getByText('Search your synced posts')).toBeInTheDocument();
  },
};

export const WithFiltersOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const filtersButton = canvas.getByRole('button', { name: /filters/i });
    await userEvent.click(filtersButton);

    await expect(canvas.getByLabelText('Has media')).toBeInTheDocument();
    await expect(canvas.getByLabelText('Platform')).toBeInTheDocument();
  },
};

export const WithSearchQuery: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const searchInput = canvas.getByPlaceholderText('Search posts...');
    await userEvent.type(searchInput, 'React');

    await expect(searchInput).toHaveValue('React');
  },
};

export const MobileView: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

export const TabletView: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
};

export const AccessibilityCheck: Story = {
  parameters: {
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'label', enabled: true },
        ],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const searchInput = canvas.getByPlaceholderText('Search posts...');
    await expect(searchInput).toHaveAttribute('type', 'text');

    const filtersButton = canvas.getByRole('button', { name: /filters/i });
    await expect(filtersButton).toBeEnabled();
  },
};
