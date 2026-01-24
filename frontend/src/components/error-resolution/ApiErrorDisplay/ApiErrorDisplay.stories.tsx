import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { ApiErrorDisplay } from './ApiErrorDisplay';

const meta: Meta<typeof ApiErrorDisplay> = {
  title: 'ErrorResolution/ApiErrorDisplay',
  component: ApiErrorDisplay,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '500px', maxWidth: '100%' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    showTechnicalDetails: true,
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ApiErrorDisplay>;

export const Default: Story = {
  args: {
    error: 'An unexpected error occurred',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('alert')).toBeInTheDocument();
  },
};

export const NoError: Story = {
  args: {
    error: null,
  },
};

export const NetworkError: Story = {
  args: {
    error: 'Network error: Failed to fetch',
    onRetry: () => console.log('Retrying...'),
  },
};

export const SessionExpired: Story = {
  args: {
    error: 'Token expired',
  },
};

export const RateLimitError: Story = {
  args: {
    error: 'Twitter rate limit exceeded',
    onRetry: () => console.log('Retrying...'),
  },
};

export const PermissionDenied: Story = {
  args: {
    error: 'Permission denied: 403 Forbidden',
  },
};

export const ServerError: Story = {
  args: {
    error: 'Internal server error 500',
    onRetry: () => console.log('Retrying...'),
  },
};

export const ValidationError: Story = {
  args: {
    error: 'Validation error: Invalid input provided',
    onRetry: () => console.log('Retrying...'),
  },
};

export const InvalidCredentials: Story = {
  args: {
    error: 'Invalid credentials provided',
  },
};

export const SyncFailed: Story = {
  args: {
    error: 'Sync failed: Unable to complete synchronization',
    onRetry: () => console.log('Retrying sync...'),
  },
};

export const BlueskyRateLimit: Story = {
  args: {
    error: 'Bluesky rate limit reached',
    onRetry: () => console.log('Retrying...'),
  },
};

export const Timeout: Story = {
  args: {
    error: 'Request timed out',
    onRetry: () => console.log('Retrying...'),
  },
};

export const WithErrorObject: Story = {
  args: {
    error: new Error('Something went wrong in the application'),
  },
};

export const WithDismiss: Story = {
  args: {
    error: 'This error can be dismissed',
    onDismiss: () => console.log('Dismissed'),
  },
};

export const WithRetryAndDismiss: Story = {
  args: {
    error: 'Network error occurred',
    onRetry: () => console.log('Retrying...'),
    onDismiss: () => console.log('Dismissed'),
  },
};

export const HiddenTechnicalDetails: Story = {
  args: {
    error: 'Server error occurred',
    showTechnicalDetails: false,
  },
};

export const NotFound: Story = {
  args: {
    error: '404: Resource not found',
  },
};

export const ContentTooLong: Story = {
  args: {
    error: 'Content too long: exceeds character limit',
    onRetry: () => console.log('Retrying...'),
  },
};

export const CredentialMissing: Story = {
  args: {
    error: 'No credential found for Twitter',
  },
};

export const CredentialInvalid: Story = {
  args: {
    error: 'Credential invalid: API key expired',
  },
};

export const CustomClassName: Story = {
  args: {
    error: 'Error with custom styling',
    className: 'custom-error-display',
  },
};
