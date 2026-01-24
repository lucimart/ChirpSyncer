import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import ForgotPasswordPage from './page';

const meta: Meta<typeof ForgotPasswordPage> = {
  title: 'Pages/Auth/ForgotPassword',
  component: ForgotPasswordPage,
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
type Story = StoryObj<typeof ForgotPasswordPage>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify form elements are accessible
    await expect(canvas.getByLabelText(/email/i)).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /send reset link/i })).toBeEnabled();
    await expect(canvas.getByRole('link', { name: /back to sign in/i })).toBeInTheDocument();
  },
};

export const FilledForm: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const emailInput = canvas.getByLabelText(/email/i);

    await userEvent.click(emailInput);
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, 'user@example.com', { delay: 10 });

    await expect(emailInput).toHaveValue('user@example.com');
  },
};

export const WithInstructions: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Default state showing the instructions for password recovery.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify instructions are shown
    await expect(canvas.getByText(/enter your email address/i)).toBeInTheDocument();
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
          { id: 'link-name', enabled: true },
        ],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Check all interactive elements are keyboard accessible
    const emailInput = canvas.getByLabelText(/email/i);
    const submitButton = canvas.getByRole('button', { name: /send reset link/i });
    const backLink = canvas.getByRole('link', { name: /back to sign in/i });

    await expect(emailInput).toHaveAttribute('required');
    await expect(emailInput).toHaveAttribute('autocomplete', 'email');
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(submitButton).toBeEnabled();
    await expect(backLink).toHaveAttribute('href', '/login');
  },
};
