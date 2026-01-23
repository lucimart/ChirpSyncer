import type { Meta, StoryObj } from '@storybook/react';
import { within, expect } from '@storybook/test';
import HomePage from './page';

const meta: Meta<typeof HomePage> = {
  title: 'Pages/Home',
  component: HomePage,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
      navigation: {
        replace: () => {},
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof HomePage>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Should show loading spinner
    await expect(canvas.getByRole('status')).toBeInTheDocument();
  },
};

export const Loading: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Home page showing loading state while checking authentication.',
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
        ],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Spinner should have accessible role
    const spinner = canvas.getByRole('status');
    await expect(spinner).toBeInTheDocument();
  },
};
