import type { Meta, StoryObj } from '@storybook/react';
import { AuthLayout } from './AuthLayout';

const meta: Meta<typeof AuthLayout> = {
  title: 'UI/AuthLayout',
  component: AuthLayout,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AuthLayout>;

export const Default: Story = {
  args: {
    children: (
      <form>
        <input type="email" placeholder="Email" style={{ width: '100%', padding: '8px', marginBottom: '12px' }} />
        <input type="password" placeholder="Password" style={{ width: '100%', padding: '8px', marginBottom: '12px' }} />
        <button type="submit" style={{ width: '100%', padding: '10px', background: '#0066cc', color: 'white', border: 'none', borderRadius: '4px' }}>
          Sign In
        </button>
      </form>
    ),
  },
};

export const WithSubtitle: Story = {
  args: {
    title: 'Welcome Back',
    subtitle: 'Sign in to your account to continue',
    children: (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        Form content goes here
      </div>
    ),
  },
};

export const WithoutLogo: Story = {
  args: {
    showLogo: false,
    children: (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <h2>Custom Header</h2>
        <p>Form content without branding</p>
      </div>
    ),
  },
};

export const CustomWidth: Story = {
  args: {
    maxWidth: '500px',
    subtitle: 'Create your account',
    children: (
      <div style={{ padding: '20px' }}>
        Wider form layout for more complex registration forms
      </div>
    ),
  },
};
