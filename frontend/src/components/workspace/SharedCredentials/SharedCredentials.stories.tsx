import type { Meta, StoryObj } from '@storybook/react';
import { SharedCredentials, type SharedCredential } from './SharedCredentials';

const meta: Meta<typeof SharedCredentials> = {
  title: 'Workspace/SharedCredentials',
  component: SharedCredentials,
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj<typeof SharedCredentials>;

const mockCredentials: SharedCredential[] = [
  {
    id: 'cred-1',
    name: 'Main Twitter Account',
    platform: 'twitter',
    sharedBy: 'user-1',
    sharedByName: 'John Doe',
    sharedAt: '2024-01-15T10:00:00Z',
    accessLevel: 'full',
    lastUsed: new Date().toISOString(),
  },
  {
    id: 'cred-2',
    name: 'Team Bluesky',
    platform: 'bluesky',
    sharedBy: 'user-2',
    sharedByName: 'Jane Smith',
    sharedAt: '2024-02-01T14:30:00Z',
    accessLevel: 'read_only',
    lastUsed: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'cred-3',
    name: 'Marketing Mastodon',
    platform: 'mastodon',
    sharedBy: 'user-1',
    sharedByName: 'John Doe',
    sharedAt: '2024-03-10T09:00:00Z',
    accessLevel: 'full',
    lastUsed: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const AsAdmin: Story = {
  args: {
    credentials: mockCredentials,
    currentUserRole: 'admin',
    onShare: (id, level) => console.log('Share:', id, level),
    onRevoke: (id) => console.log('Revoke:', id),
    onUpdateAccess: (id, level) => console.log('Update access:', id, level),
  },
};

export const AsEditor: Story = {
  args: {
    credentials: mockCredentials,
    currentUserRole: 'editor',
    onShare: (id, level) => console.log('Share:', id, level),
    onRevoke: (id) => console.log('Revoke:', id),
    onUpdateAccess: (id, level) => console.log('Update access:', id, level),
  },
};

export const AsViewer: Story = {
  args: {
    credentials: mockCredentials,
    currentUserRole: 'viewer',
    onShare: (id, level) => console.log('Share:', id, level),
    onRevoke: (id) => console.log('Revoke:', id),
    onUpdateAccess: (id, level) => console.log('Update access:', id, level),
  },
};

export const Empty: Story = {
  args: {
    credentials: [],
    currentUserRole: 'admin',
    onShare: (id, level) => console.log('Share:', id, level),
    onRevoke: (id) => console.log('Revoke:', id),
    onUpdateAccess: (id, level) => console.log('Update access:', id, level),
  },
};

export const AllPlatforms: Story = {
  args: {
    credentials: [
      {
        id: 'cred-1',
        name: 'Twitter Official',
        platform: 'twitter',
        sharedBy: 'user-1',
        sharedByName: 'Admin',
        sharedAt: '2024-01-01T00:00:00Z',
        accessLevel: 'full',
        lastUsed: new Date().toISOString(),
      },
      {
        id: 'cred-2',
        name: 'Bluesky Team',
        platform: 'bluesky',
        sharedBy: 'user-1',
        sharedByName: 'Admin',
        sharedAt: '2024-01-01T00:00:00Z',
        accessLevel: 'read_only',
        lastUsed: new Date().toISOString(),
      },
      {
        id: 'cred-3',
        name: 'Mastodon Instance',
        platform: 'mastodon',
        sharedBy: 'user-1',
        sharedByName: 'Admin',
        sharedAt: '2024-01-01T00:00:00Z',
        accessLevel: 'full',
        lastUsed: new Date().toISOString(),
      },
      {
        id: 'cred-4',
        name: 'Instagram Business',
        platform: 'instagram',
        sharedBy: 'user-1',
        sharedByName: 'Admin',
        sharedAt: '2024-01-01T00:00:00Z',
        accessLevel: 'read_only',
        lastUsed: new Date().toISOString(),
      },
    ],
    currentUserRole: 'admin',
    onShare: (id, level) => console.log('Share:', id, level),
    onRevoke: (id) => console.log('Revoke:', id),
    onUpdateAccess: (id, level) => console.log('Update access:', id, level),
  },
};

export const SingleCredential: Story = {
  args: {
    credentials: [mockCredentials[0]],
    currentUserRole: 'admin',
    onShare: (id, level) => console.log('Share:', id, level),
    onRevoke: (id) => console.log('Revoke:', id),
    onUpdateAccess: (id, level) => console.log('Update access:', id, level),
  },
};
