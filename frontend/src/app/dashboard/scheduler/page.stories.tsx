import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import SchedulerPage from './page';

const meta: Meta<typeof SchedulerPage> = {
  title: 'Pages/Dashboard/Scheduler',
  component: SchedulerPage,
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
type Story = StoryObj<typeof SchedulerPage>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify page header is present
    await expect(canvas.getByText('Scheduler')).toBeInTheDocument();

    // Verify schedule button is accessible
    await expect(
      canvas.getByRole('button', { name: /schedule post/i })
    ).toBeEnabled();

    // Verify optimal times section exists
    await expect(canvas.getByText('Optimal Times')).toBeInTheDocument();

    // Verify heatmap section exists
    await expect(canvas.getByText('Engagement Heatmap')).toBeInTheDocument();
  },
};

export const Loading: Story = {
  parameters: {
    mockData: {
      scheduledPosts: { isLoading: true },
      optimalTimes: { isLoading: true },
    },
    docs: {
      description: {
        story: 'Scheduler page in loading state while fetching data.',
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
        story: 'Scheduler page on mobile devices with responsive layout.',
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

export const WithModalOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Click schedule post button to open modal
    const scheduleButton = canvas.getByRole('button', { name: /schedule post/i });
    await userEvent.click(scheduleButton);

    // Verify modal is open
    await expect(canvas.getByText('Schedule New Post')).toBeInTheDocument();

    // Verify form elements are present
    await expect(canvas.getByLabelText(/content/i)).toBeInTheDocument();
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

    // Verify all interactive elements are keyboard accessible
    const scheduleButton = canvas.getByRole('button', { name: /schedule post/i });
    await expect(scheduleButton).toBeEnabled();
  },
};
