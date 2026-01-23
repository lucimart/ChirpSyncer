import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WebhooksPage from './page';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Infinity },
  },
});

const meta: Meta<typeof WebhooksPage> = {
  title: 'Pages/Dashboard/Webhooks',
  component: WebhooksPage,
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
type Story = StoryObj<typeof WebhooksPage>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Webhooks')).toBeInTheDocument();
    await expect(
      canvas.getByText('Receive real-time notifications when events occur')
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: /create webhook/i })
    ).toBeInTheDocument();
  },
};

export const WithCreateModal: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      canvas.getByRole('button', { name: /create webhook/i })
    );

    await expect(canvas.getByText('Create Webhook')).toBeInTheDocument();
    await expect(canvas.getByLabelText('Name (optional)')).toBeInTheDocument();
    await expect(canvas.getByLabelText('URL')).toBeInTheDocument();
    await expect(canvas.getByText('Events')).toBeInTheDocument();
  },
};

export const FilledModalForm: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      canvas.getByRole('button', { name: /create webhook/i })
    );

    await userEvent.type(
      canvas.getByLabelText('Name (optional)'),
      'Slack Notifications'
    );
    await userEvent.type(
      canvas.getByLabelText('URL'),
      'https://hooks.slack.com/services/xxx'
    );

    await expect(canvas.getByLabelText('Name (optional)')).toHaveValue(
      'Slack Notifications'
    );
    await expect(canvas.getByLabelText('URL')).toHaveValue(
      'https://hooks.slack.com/services/xxx'
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
      canvas.getByRole('button', { name: /create webhook/i })
    ).toBeEnabled();

    await userEvent.click(
      canvas.getByRole('button', { name: /create webhook/i })
    );

    await expect(canvas.getByLabelText('URL')).toHaveAttribute('required');
  },
};
