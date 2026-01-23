import type { Meta, StoryObj } from '@storybook/react';
import { expect, within, userEvent } from '@storybook/test';
import { ErrorCard } from './ErrorCard';
import type { ErrorDefinition } from '@/lib/errors';

const criticalError: ErrorDefinition = {
  code: 'SERVER_ERROR',
  patterns: [],
  title: 'Server Error',
  description: 'An unexpected error occurred on the server. Please try again later.',
  severity: 'critical',
  solutions: [
    {
      title: 'Retry the operation',
      description: 'This might be a temporary issue.',
      action: { type: 'retry', label: 'Try Again', handler: '' },
    },
    {
      title: 'Report the issue',
      description: 'If the problem persists, let us know.',
      action: { type: 'link', label: 'Report Issue', handler: '/support' },
    },
  ],
  retryable: true,
};

const warningError: ErrorDefinition = {
  code: 'RATE_LIMIT',
  patterns: [],
  title: 'Rate Limit Exceeded',
  description: 'You have made too many requests. Please wait before trying again.',
  severity: 'warning',
  solutions: [
    {
      title: 'Wait and retry',
      description: 'Rate limits typically reset in 15 minutes.',
    },
    {
      title: 'Reduce frequency',
      description: 'Consider spacing out your requests.',
      action: { type: 'link', label: 'View Settings', handler: '/settings' },
    },
  ],
  retryable: true,
};

const infoError: ErrorDefinition = {
  code: 'SYNC_CONFLICT',
  patterns: [],
  title: 'Sync Conflict',
  description: 'This content has already been synced to the target platform.',
  severity: 'info',
  solutions: [
    {
      title: 'Skip this item',
      description: 'The content already exists.',
    },
    {
      title: 'View sync history',
      action: { type: 'link', label: 'Sync History', handler: '/sync' },
    },
  ],
  retryable: false,
};

const meta: Meta<typeof ErrorCard> = {
  title: 'ErrorResolution/ErrorCard',
  component: ErrorCard,
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

type Story = StoryObj<typeof ErrorCard>;

export const Critical: Story = {
  args: {
    error: criticalError,
    onRetry: () => console.log('Retrying...'),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('alert')).toBeInTheDocument();
    await expect(canvas.getByText('Server Error')).toBeInTheDocument();
  },
};

export const Warning: Story = {
  args: {
    error: warningError,
  },
};

export const Info: Story = {
  args: {
    error: infoError,
  },
};

export const WithTechnicalDetails: Story = {
  args: {
    error: criticalError,
    originalError: 'Error: ECONNREFUSED 127.0.0.1:5000 - Connection refused by server',
    onRetry: () => console.log('Retrying...'),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByText('Technical details');
    await userEvent.click(toggle);
    await expect(canvas.getByText(/Error Code: SERVER_ERROR/)).toBeInTheDocument();
  },
};

export const HiddenTechnicalDetails: Story = {
  args: {
    error: criticalError,
    originalError: 'Some error',
    showTechnicalDetails: false,
  },
};

export const WithRetryAction: Story = {
  args: {
    error: {
      code: 'NETWORK_ERROR',
      patterns: [],
      title: 'Connection Error',
      description: 'Unable to connect to the server. Check your internet connection.',
      severity: 'critical',
      solutions: [
        {
          title: 'Check your connection',
          description: 'Make sure you have an active internet connection.',
        },
        {
          title: 'Retry',
          action: { type: 'retry', label: 'Try Again', handler: '' },
        },
      ],
      retryable: true,
    },
    onRetry: () => new Promise((resolve) => setTimeout(resolve, 2000)),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const retryButton = canvas.getByRole('button', { name: /try again/i });
    await userEvent.click(retryButton);
  },
};

export const WithLinkAction: Story = {
  args: {
    error: {
      code: 'AUTH_EXPIRED',
      patterns: [],
      title: 'Session Expired',
      description: 'Your login session has expired. Please sign in again.',
      severity: 'warning',
      solutions: [
        {
          title: 'Sign in again',
          action: { type: 'link', label: 'Go to Login', handler: '/login' },
        },
      ],
      retryable: false,
    },
  },
};

export const WithButtonAction: Story = {
  args: {
    error: {
      code: 'NOT_FOUND',
      patterns: [],
      title: 'Page Not Found',
      description: 'The requested page could not be found.',
      severity: 'warning',
      solutions: [
        {
          title: 'Go back',
          description: 'Return to the previous page.',
          action: { type: 'button', label: 'Go Back', handler: () => console.log('Going back...') },
        },
      ],
      retryable: false,
    },
  },
};

export const NoSolutions: Story = {
  args: {
    error: {
      code: 'UNKNOWN',
      patterns: [],
      title: 'Unknown Error',
      description: 'An unexpected error occurred.',
      severity: 'warning',
      solutions: [],
      retryable: false,
    },
  },
};

export const MultipleSolutions: Story = {
  args: {
    error: {
      code: 'SYNC_FAILED',
      patterns: [],
      title: 'Sync Failed',
      description: 'The synchronization could not be completed.',
      severity: 'critical',
      solutions: [
        {
          title: 'Check credentials',
          description: 'Make sure your platform credentials are valid.',
          action: { type: 'link', label: 'Check Credentials', handler: '/credentials' },
        },
        {
          title: 'Retry sync',
          action: { type: 'retry', label: 'Retry', handler: '' },
        },
        {
          title: 'Contact support',
          description: 'If the issue persists, reach out to our support team.',
          action: { type: 'link', label: 'Get Help', handler: '/support' },
        },
      ],
      retryable: true,
    },
    onRetry: () => console.log('Retrying sync...'),
  },
};

export const CredentialError: Story = {
  args: {
    error: {
      code: 'CREDENTIAL_INVALID',
      patterns: [],
      title: 'Invalid Platform Credentials',
      description: 'Your credentials for Twitter are invalid or have expired.',
      severity: 'critical',
      solutions: [
        {
          title: 'Update credentials',
          description: 'Re-enter your platform credentials to restore access.',
          action: { type: 'link', label: 'Manage Credentials', handler: '/dashboard/credentials' },
        },
      ],
      retryable: false,
    },
  },
};

export const ValidationError: Story = {
  args: {
    error: {
      code: 'CONTENT_TOO_LONG',
      patterns: [],
      title: 'Content Too Long',
      description: 'Your post exceeds the 280 character limit for Twitter.',
      severity: 'warning',
      solutions: [
        {
          title: 'Shorten content',
          description: 'Edit your content to fit within the character limit.',
        },
      ],
      retryable: true,
    },
  },
};

export const PermissionError: Story = {
  args: {
    error: {
      code: 'PERMISSION_DENIED',
      patterns: [],
      title: 'Permission Denied',
      description: 'You do not have permission to perform this action.',
      severity: 'critical',
      solutions: [
        {
          title: 'Contact admin',
          description: 'Ask your workspace admin to grant you the necessary permissions.',
        },
      ],
      retryable: false,
    },
  },
};

export const AllSeverities: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <ErrorCard error={criticalError} />
      <ErrorCard error={warningError} />
      <ErrorCard error={infoError} />
    </div>
  ),
};
