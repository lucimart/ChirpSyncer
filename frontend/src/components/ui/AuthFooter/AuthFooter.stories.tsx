import type { Meta, StoryObj } from '@storybook/react';
import { AuthFooter } from './AuthFooter';

const meta: Meta<typeof AuthFooter> = {
  title: 'UI/AuthFooter',
  component: AuthFooter,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AuthFooter>;

export const Default: Story = {
  args: {
    children: (
      <>
        Already have an account? <a href="/login">Sign in</a>
      </>
    ),
  },
};

export const RegisterLink: Story = {
  args: {
    children: (
      <>
        Don&apos;t have an account? <a href="/register">Create one</a>
      </>
    ),
  },
};

export const ForgotPassword: Story = {
  args: {
    children: (
      <>
        <a href="/forgot-password">Forgot your password?</a>
      </>
    ),
  },
};
