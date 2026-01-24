import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import CredentialsPage from './page';

const meta: Meta<typeof CredentialsPage> = {
  title: 'Pages/Dashboard/Credentials',
  component: CredentialsPage,
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
type Story = StoryObj<typeof CredentialsPage>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify page header is present
    await expect(canvas.getByText('Credentials')).toBeInTheDocument();

    // Verify add button is accessible
    await expect(
      canvas.getByRole('button', { name: /add credential/i })
    ).toBeEnabled();
  },
};

export const Loading: Story = {
  parameters: {
    mockData: {
      credentials: { isLoading: true },
    },
    docs: {
      description: {
        story: 'Credentials page in loading state while fetching data.',
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
        story: 'Credentials page on mobile devices with responsive card layout.',
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

export const WithAddModal: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Click add credential button
    const addButton = canvas.getByRole('button', { name: /add credential/i });
    await userEvent.click(addButton);

    // Verify modal is open
    await expect(canvas.getByText('Add Credential')).toBeInTheDocument();

    // Verify form fields are present
    await expect(canvas.getByLabelText(/platform/i)).toBeInTheDocument();
    await expect(canvas.getByLabelText(/credential type/i)).toBeInTheDocument();
    await expect(canvas.getByLabelText(/username/i)).toBeInTheDocument();
    await expect(canvas.getByLabelText(/password/i)).toBeInTheDocument();
  },
};

export const EmptyState: Story = {
  parameters: {
    mockData: {
      credentials: { data: [] },
    },
    docs: {
      description: {
        story: 'Credentials page with no credentials configured.',
      },
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

    // Verify add button is accessible
    const addButton = canvas.getByRole('button', { name: /add credential/i });
    await expect(addButton).toBeEnabled();

    // Verify test buttons are accessible
    const testButtons = canvas.getAllByRole('button', { name: /test/i });
    await expect(testButtons.length).toBeGreaterThan(0);
  },
};
