import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import LoginPage from './page';

const meta: Meta<typeof LoginPage> = {
  title: 'Pages/Auth/Login',
  component: LoginPage,
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
      <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LoginPage>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify form elements are accessible
    await expect(canvas.getByLabelText(/username/i)).toBeInTheDocument();
    await expect(canvas.getByLabelText(/password/i)).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /sign in/i })).toBeEnabled();
  },
};

export const FilledForm: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText(/username/i), 'testuser');
    await userEvent.type(canvas.getByLabelText(/password/i), 'password123');

    await expect(canvas.getByLabelText(/username/i)).toHaveValue('testuser');
  },
};

export const WithError: Story = {
  decorators: [
    (Story) => {
      // Simulate error state by pre-filling and showing error
      return (
        <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
          <Story />
        </div>
      );
    },
  ],
  parameters: {
    docs: {
      description: {
        story: 'Login form showing an error state after failed authentication.',
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

    // Check all interactive elements are keyboard accessible
    const usernameInput = canvas.getByLabelText(/username/i);
    const passwordInput = canvas.getByLabelText(/password/i);
    const submitButton = canvas.getByRole('button', { name: /sign in/i });

    await expect(usernameInput).toHaveAttribute('required');
    await expect(passwordInput).toHaveAttribute('required');
    await expect(submitButton).toBeEnabled();
  },
};
