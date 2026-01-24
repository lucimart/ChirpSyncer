import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BookmarksPage from './page';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Infinity },
  },
});

const meta: Meta<typeof BookmarksPage> = {
  title: 'Pages/Dashboard/Bookmarks',
  component: BookmarksPage,
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
type Story = StoryObj<typeof BookmarksPage>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Bookmarks')).toBeInTheDocument();
    await expect(
      canvas.getByText('Save and organize your favorite posts across platforms')
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: /new collection/i })
    ).toBeInTheDocument();
  },
};

export const WithCreateModal: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const newCollectionButton = canvas.getByRole('button', {
      name: /new collection/i,
    });
    await userEvent.click(newCollectionButton);

    await expect(canvas.getByText('Create Collection')).toBeInTheDocument();
    await expect(canvas.getByLabelText('Collection Name')).toBeInTheDocument();
    await expect(canvas.getByText('Color')).toBeInTheDocument();
  },
};

export const FilledModalForm: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      canvas.getByRole('button', { name: /new collection/i })
    );
    await userEvent.type(
      canvas.getByLabelText('Collection Name'),
      'My Favorites'
    );

    await expect(canvas.getByLabelText('Collection Name')).toHaveValue(
      'My Favorites'
    );
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

    await expect(
      canvas.getByRole('button', { name: /new collection/i })
    ).toBeEnabled();

    await userEvent.click(
      canvas.getByRole('button', { name: /new collection/i })
    );

    const input = canvas.getByLabelText('Collection Name');
    await expect(input).toHaveAttribute('required');
  },
};
