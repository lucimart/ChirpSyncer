import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import RegisterPage from './page';

const meta: Meta<typeof RegisterPage> = {
  title: 'Pages/Auth/Register',
  component: RegisterPage,
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
type Story = StoryObj<typeof RegisterPage>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify form elements are accessible
    await expect(canvas.getByLabelText(/username/i)).toBeInTheDocument();
    await expect(canvas.getByLabelText(/email/i)).toBeInTheDocument();
    await expect(canvas.getByLabelText(/^password$/i)).toBeInTheDocument();
    await expect(canvas.getByLabelText(/confirm password/i)).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /create account/i })).toBeEnabled();
  },
};

export const FilledForm: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText(/username/i), 'newuser');
    await userEvent.type(canvas.getByLabelText(/email/i), 'newuser@example.com');
    await userEvent.type(canvas.getByLabelText(/^password$/i), 'SecurePass123!');
    await userEvent.type(canvas.getByLabelText(/confirm password/i), 'SecurePass123!');

    await expect(canvas.getByLabelText(/username/i)).toHaveValue('newuser');
    await expect(canvas.getByLabelText(/email/i)).toHaveValue('newuser@example.com');
  },
};

export const PasswordMismatch: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText(/username/i), 'newuser');
    await userEvent.type(canvas.getByLabelText(/email/i), 'newuser@example.com');
    await userEvent.type(canvas.getByLabelText(/^password$/i), 'password123');
    await userEvent.type(canvas.getByLabelText(/confirm password/i), 'different456');
  },
  parameters: {
    docs: {
      description: {
        story: 'Form filled with mismatching passwords. Error will show on submit.',
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
    const emailInput = canvas.getByLabelText(/email/i);
    const passwordInput = canvas.getByLabelText(/^password$/i);
    const confirmPasswordInput = canvas.getByLabelText(/confirm password/i);
    const submitButton = canvas.getByRole('button', { name: /create account/i });

    await expect(usernameInput).toHaveAttribute('required');
    await expect(emailInput).toHaveAttribute('required');
    await expect(passwordInput).toHaveAttribute('required');
    await expect(confirmPasswordInput).toHaveAttribute('required');
    await expect(submitButton).toBeEnabled();

    // Verify autocomplete attributes for password managers
    await expect(usernameInput).toHaveAttribute('autocomplete', 'username');
    await expect(emailInput).toHaveAttribute('autocomplete', 'email');
    await expect(passwordInput).toHaveAttribute('autocomplete', 'new-password');
    await expect(confirmPasswordInput).toHaveAttribute('autocomplete', 'new-password');
  },
};
