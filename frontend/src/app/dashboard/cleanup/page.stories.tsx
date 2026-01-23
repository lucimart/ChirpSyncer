import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CleanupPage from './page';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Infinity },
  },
});

const meta: Meta<typeof CleanupPage> = {
  title: 'Pages/Dashboard/Cleanup',
  component: CleanupPage,
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
type Story = StoryObj<typeof CleanupPage>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Cleanup Rules')).toBeInTheDocument();
    await expect(
      canvas.getByText('Automatically delete old or low-engagement posts')
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: /create rule/i })
    ).toBeInTheDocument();
  },
};

export const WithCreateModal: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: /create rule/i }));

    await expect(canvas.getByText('Create Cleanup Rule')).toBeInTheDocument();
    await expect(canvas.getByLabelText('Rule Name')).toBeInTheDocument();
    await expect(canvas.getByLabelText('Rule Type')).toBeInTheDocument();
  },
};

export const AgeBasedRule: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: /create rule/i }));

    // Age Based is default, so the age field should be visible
    await expect(
      canvas.getByLabelText('Delete tweets older than (days)')
    ).toBeInTheDocument();
  },
};

export const EngagementBasedRule: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: /create rule/i }));
    await userEvent.selectOptions(
      canvas.getByLabelText('Rule Type'),
      'engagement'
    );

    await expect(
      canvas.getByLabelText('Minimum likes to keep')
    ).toBeInTheDocument();
  },
};

export const FilledModalForm: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: /create rule/i }));

    await userEvent.type(
      canvas.getByLabelText('Rule Name'),
      'Delete old posts'
    );

    await expect(canvas.getByLabelText('Rule Name')).toHaveValue(
      'Delete old posts'
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
      canvas.getByRole('button', { name: /create rule/i })
    ).toBeEnabled();

    await userEvent.click(canvas.getByRole('button', { name: /create rule/i }));

    const ruleNameInput = canvas.getByLabelText('Rule Name');
    await expect(ruleNameInput).toHaveAttribute('required');

    const ruleTypeSelect = canvas.getByLabelText('Rule Type');
    await expect(ruleTypeSelect).toBeInTheDocument();
  },
};
