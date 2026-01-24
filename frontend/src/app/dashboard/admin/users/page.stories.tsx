import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminUsersPage from './page';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Infinity },
  },
});

const meta: Meta<typeof AdminUsersPage> = {
  title: 'Pages/Dashboard/Admin/Users',
  component: AdminUsersPage,
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
type Story = StoryObj<typeof AdminUsersPage>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('User Management')).toBeInTheDocument();
    await expect(canvas.getByPlaceholderText('Search users...')).toBeInTheDocument();
  },
};

export const WithSearch: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const searchInput = canvas.getByPlaceholderText('Search users...');
    await userEvent.click(searchInput);
    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, 'admin', { delay: 10 });

    await expect(searchInput).toHaveValue('admin');
  },
};

export const WithDeleteModal: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Shows the delete confirmation modal when attempting to delete a user.',
      },
    },
  },
};

export const LoadingState: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Admin users page in loading state while fetching users.',
      },
    },
  },
};

export const EmptyState: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Admin users page when no users are found.',
      },
    },
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
          { id: 'button-name', enabled: true },
        ],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Search input should be accessible
    const searchInput = canvas.getByPlaceholderText('Search users...');
    await expect(searchInput).toBeInTheDocument();

    // Page header should be present
    await expect(canvas.getByText('User Management')).toBeInTheDocument();
  },
};
