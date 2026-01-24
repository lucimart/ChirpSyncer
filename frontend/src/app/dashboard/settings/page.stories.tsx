import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import SettingsPage from './page';

const meta: Meta<typeof SettingsPage> = {
  title: 'Pages/Dashboard/Settings',
  component: SettingsPage,
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
type Story = StoryObj<typeof SettingsPage>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify page header is present
    await expect(canvas.getByText('Settings')).toBeInTheDocument();

    // Verify main sections are present
    await expect(canvas.getByText('Account')).toBeInTheDocument();
    await expect(canvas.getByText('Notifications')).toBeInTheDocument();
    await expect(canvas.getByText('Appearance')).toBeInTheDocument();

    // Verify save button is accessible
    await expect(
      canvas.getByRole('button', { name: /save changes/i })
    ).toBeEnabled();
  },
};

export const Loading: Story = {
  parameters: {
    mockData: {
      user: { isLoading: true },
    },
    docs: {
      description: {
        story: 'Settings page in loading state while fetching user data.',
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
        story: 'Settings page on mobile devices with stacked form layout.',
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

export const WithPasswordForm: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Click change password button
    const changePasswordButton = canvas.getByRole('button', { name: /change password/i });
    await userEvent.click(changePasswordButton);

    // Verify password form is shown
    await expect(canvas.getByText('Change Password')).toBeInTheDocument();
    await expect(canvas.getByLabelText(/current password/i)).toBeInTheDocument();
    await expect(canvas.getByLabelText(/new password/i)).toBeInTheDocument();
    await expect(canvas.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /update password/i })).toBeEnabled();
  },
};

export const DarkThemeSelected: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Click dark theme option
    const darkButton = canvas.getByText('Dark');
    await userEvent.click(darkButton);
  },
  parameters: {
    docs: {
      description: {
        story: 'Settings page with dark theme option selected.',
      },
    },
  },
};

export const NotificationsToggled: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Find and toggle notification switches
    const switches = canvas.getAllByRole('switch');
    if (switches.length > 0) {
      await userEvent.click(switches[0]);
    }
  },
  parameters: {
    docs: {
      description: {
        story: 'Settings page with notification toggles interacted.',
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

    // Verify form inputs have labels
    await expect(canvas.getByLabelText(/username/i)).toBeInTheDocument();
    await expect(canvas.getByLabelText(/email/i)).toBeInTheDocument();

    // Verify buttons are accessible
    await expect(canvas.getByRole('button', { name: /save changes/i })).toBeEnabled();
    await expect(canvas.getByRole('button', { name: /change password/i })).toBeEnabled();

    // Verify notification switches
    const switches = canvas.getAllByRole('switch');
    await expect(switches.length).toBeGreaterThanOrEqual(3);
  },
};
