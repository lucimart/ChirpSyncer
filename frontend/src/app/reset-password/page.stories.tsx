import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import ResetPasswordPage from './page';

const meta: Meta<typeof ResetPasswordPage> = {
  title: 'Pages/Auth/ResetPassword',
  component: ResetPasswordPage,
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
      <div style={{ minHeight: '100vh' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ResetPasswordPage>;

export const Default: Story = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        push: () => {},
        searchParams: new URLSearchParams('token=valid-token'),
      },
    },
    docs: {
      description: {
        story: 'Reset password form with a valid token. Note: In Storybook, the form may show invalid token state due to mock API.',
      },
    },
  },
};

export const InvalidToken: Story = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        push: () => {},
        searchParams: new URLSearchParams(),
      },
    },
    docs: {
      description: {
        story: 'State shown when the reset link is invalid or expired.',
      },
    },
  },
};

export const MobileView: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    nextjs: {
      appDirectory: true,
      navigation: {
        push: () => {},
        searchParams: new URLSearchParams('token=valid-token'),
      },
    },
  },
};

export const TabletView: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
    nextjs: {
      appDirectory: true,
      navigation: {
        push: () => {},
        searchParams: new URLSearchParams('token=valid-token'),
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
          { id: 'link-name', enabled: true },
        ],
      },
    },
    nextjs: {
      appDirectory: true,
      navigation: {
        push: () => {},
        searchParams: new URLSearchParams('token=valid-token'),
      },
    },
    docs: {
      description: {
        story: 'Accessibility checks for the reset password page. Verifies contrast, labels, and button names.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // The page will likely show invalid token state in Storybook
    // Check for navigational elements that should always be present
    await expect(canvas.getByText(/chirpsyncer/i)).toBeInTheDocument();
  },
};

export const LoadingState: Story = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        push: () => {},
        searchParams: new URLSearchParams('token=valid-token'),
      },
    },
    docs: {
      description: {
        story: 'Loading state while validating the reset token.',
      },
    },
  },
};
