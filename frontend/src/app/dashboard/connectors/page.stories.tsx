import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import ConnectorsPage from './page';

const meta: Meta<typeof ConnectorsPage> = {
  title: 'Pages/Dashboard/Connectors',
  component: ConnectorsPage,
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
      <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '24px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ConnectorsPage>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify page header is present
    await expect(canvas.getByText('Platform Connectors')).toBeInTheDocument();

    // Verify tabs are present
    await expect(canvas.getByText('Platforms')).toBeInTheDocument();
    await expect(canvas.getByText('Flow View')).toBeInTheDocument();

    // Verify platforms section is shown
    await expect(canvas.getByText('Available Platforms')).toBeInTheDocument();
  },
};

export const Loading: Story = {
  parameters: {
    mockData: {
      connectors: { isLoading: true },
      connections: { isLoading: true },
    },
    docs: {
      description: {
        story: 'Connectors page in loading state while fetching platform data.',
      },
    },
  },
};

export const MobileView: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Connectors page on mobile devices with stacked platform cards.',
      },
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

export const FlowView: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Switch to Flow View tab
    const flowTab = canvas.getByText('Flow View');
    await userEvent.click(flowTab);

    // Platforms section should be hidden in flow view
    await expect(canvas.queryByText('Available Platforms')).not.toBeInTheDocument();
  },
};

export const WithExpandedDetails: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Find and click the first expand button
    const expandButtons = canvas.getAllByRole('button', { name: /show details/i });
    if (expandButtons.length > 0) {
      await userEvent.click(expandButtons[0]);

      // Verify capabilities are shown
      await expect(canvas.getByText('Core')).toBeInTheDocument();
      await expect(canvas.getByText('Media')).toBeInTheDocument();
    }
  },
};

export const ConnectModal: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Find connect button (for unconnected platform)
    const connectButtons = canvas.getAllByRole('button', { name: /^connect$/i });
    if (connectButtons.length > 0) {
      await userEvent.click(connectButtons[0]);

      // Verify modal appears
      await expect(canvas.getByText(/Connect to/i)).toBeInTheDocument();
    }
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

    // Verify tabs are keyboard accessible
    const tabs = canvas.getAllByRole('tab');
    await expect(tabs.length).toBeGreaterThanOrEqual(2);

    // Verify buttons have accessible names
    const connectButtons = canvas.getAllByRole('button', { name: /connect/i });
    await expect(connectButtons.length).toBeGreaterThan(0);
  },
};
