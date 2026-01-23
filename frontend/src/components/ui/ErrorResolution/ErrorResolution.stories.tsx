import type { Meta, StoryObj } from '@storybook/react';
import { ErrorResolution } from './ErrorResolution';
import type { ErrorDiagnosis, ResolutionOption } from './types';

const meta: Meta<typeof ErrorResolution> = {
  title: 'UI/ErrorResolution',
  component: ErrorResolution,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ErrorResolution>;

const sampleError: ErrorDiagnosis = {
  code: 'SYNC_001',
  message: 'Twitter API Rate Limit Exceeded',
  details: [
    'API rate limit reached for endpoint /statuses/user_timeline',
    'Current usage: 900/900 requests (100%)',
    'Rate limit resets in 12 minutes',
  ],
  timestamp: new Date(),
  lastSuccess: new Date(Date.now() - 3600000), // 1 hour ago
};

const sampleOptions: ResolutionOption[] = [
  {
    id: 'wait',
    title: 'Wait for Reset',
    description: 'The rate limit will automatically reset in 12 minutes. No action required.',
    recommended: true,
    action: {
      type: 'auto',
      label: 'Set Reminder',
      handler: async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        console.log('Reminder set');
      },
    },
  },
  {
    id: 'reduce',
    title: 'Reduce Sync Frequency',
    description: 'Adjust your sync settings to stay within rate limits.',
    recommended: false,
    action: {
      type: 'manual',
      label: 'Open Settings',
    },
  },
  {
    id: 'docs',
    title: 'View Rate Limits',
    description: 'Learn more about Twitter API rate limits and best practices.',
    recommended: false,
    action: {
      type: 'link',
      label: 'View Documentation',
      href: 'https://developer.twitter.com/en/docs/twitter-api/rate-limits',
    },
  },
];

export const Default: Story = {
  args: {
    error: sampleError,
    options: sampleOptions,
    tip: 'Consider scheduling syncs during off-peak hours to avoid rate limits.',
    onContactSupport: () => console.log('Contact support clicked'),
  },
};

export const WithoutTip: Story = {
  args: {
    error: sampleError,
    options: sampleOptions,
    onContactSupport: () => console.log('Contact support clicked'),
  },
};

export const WithoutSupport: Story = {
  args: {
    error: sampleError,
    options: sampleOptions,
    tip: 'Consider scheduling syncs during off-peak hours to avoid rate limits.',
  },
};

export const CredentialError: Story = {
  args: {
    error: {
      code: 'AUTH_002',
      message: 'Bluesky Credentials Expired',
      details: [
        'Authentication token has expired',
        'Last successful authentication: 7 days ago',
        'Account requires re-authentication',
      ],
      timestamp: new Date(),
      lastSuccess: new Date(Date.now() - 604800000), // 7 days ago
    },
    options: [
      {
        id: 'reauth',
        title: 'Re-authenticate',
        description: 'Sign in again to refresh your credentials.',
        recommended: true,
        action: {
          type: 'auto',
          label: 'Sign In',
          handler: async () => {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            console.log('Re-authenticated');
          },
        },
      },
      {
        id: 'remove',
        title: 'Remove Connection',
        description: 'Disconnect this account and set up a new one.',
        recommended: false,
        action: {
          type: 'manual',
          label: 'Remove Account',
        },
      },
    ],
    onContactSupport: () => console.log('Contact support clicked'),
  },
};

export const NetworkError: Story = {
  args: {
    error: {
      code: 'NET_001',
      message: 'Connection Failed',
      details: [
        'Unable to establish connection to api.twitter.com',
        'DNS resolution successful',
        'TCP connection timed out after 30 seconds',
      ],
      timestamp: new Date(),
    },
    options: [
      {
        id: 'retry',
        title: 'Retry Connection',
        description: 'Attempt to reconnect to the service.',
        recommended: true,
        action: {
          type: 'auto',
          label: 'Retry Now',
          handler: async () => {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            console.log('Retried');
          },
        },
      },
      {
        id: 'status',
        title: 'Check Service Status',
        description: 'View the current status of Twitter services.',
        recommended: false,
        action: {
          type: 'link',
          label: 'Status Page',
          href: 'https://api.twitterstat.us/',
        },
      },
    ],
    tip: 'If the problem persists, check your firewall or VPN settings.',
    onContactSupport: () => console.log('Contact support clicked'),
  },
};

export const SingleOption: Story = {
  args: {
    error: {
      code: 'CONF_001',
      message: 'Configuration Missing',
      details: [
        'Required configuration field "api_key" is not set',
        'This field is required for Twitter API access',
      ],
      timestamp: new Date(),
    },
    options: [
      {
        id: 'configure',
        title: 'Configure API Key',
        description: 'Add your Twitter API key in the credentials settings.',
        recommended: true,
        action: {
          type: 'manual',
          label: 'Go to Credentials',
        },
      },
    ],
  },
};
