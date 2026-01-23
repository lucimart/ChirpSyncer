import type { Meta, StoryObj } from '@storybook/react';
import { WorkspaceSettings } from './WorkspaceSettings';
import type { Workspace } from '../WorkspaceSwitcher';

const meta: Meta<typeof WorkspaceSettings> = {
  title: 'Workspace/WorkspaceSettings',
  component: WorkspaceSettings,
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj<typeof WorkspaceSettings>;

const teamWorkspace: Workspace = {
  id: 'ws-1',
  name: 'Marketing Team',
  type: 'team',
  ownerId: 'user-1',
  memberCount: 5,
  createdAt: '2024-01-01T00:00:00Z',
};

const personalWorkspace: Workspace = {
  id: 'ws-2',
  name: 'Personal Workspace',
  type: 'personal',
  ownerId: 'user-1',
  memberCount: 1,
  createdAt: '2024-01-01T00:00:00Z',
};

export const AdminOwner: Story = {
  args: {
    workspace: teamWorkspace,
    currentUserRole: 'admin',
    isOwner: true,
    onUpdate: (updates) => console.log('Update:', updates),
    onDelete: () => console.log('Delete workspace'),
    onLeave: () => console.log('Leave workspace'),
  },
};

export const AdminNotOwner: Story = {
  args: {
    workspace: teamWorkspace,
    currentUserRole: 'admin',
    isOwner: false,
    onUpdate: (updates) => console.log('Update:', updates),
    onDelete: () => console.log('Delete workspace'),
    onLeave: () => console.log('Leave workspace'),
  },
};

export const EditorMember: Story = {
  args: {
    workspace: teamWorkspace,
    currentUserRole: 'editor',
    isOwner: false,
    onUpdate: (updates) => console.log('Update:', updates),
    onDelete: () => console.log('Delete workspace'),
    onLeave: () => console.log('Leave workspace'),
  },
};

export const ViewerMember: Story = {
  args: {
    workspace: teamWorkspace,
    currentUserRole: 'viewer',
    isOwner: false,
    onUpdate: (updates) => console.log('Update:', updates),
    onDelete: () => console.log('Delete workspace'),
    onLeave: () => console.log('Leave workspace'),
  },
};

export const PersonalWorkspaceOwner: Story = {
  args: {
    workspace: personalWorkspace,
    currentUserRole: 'admin',
    isOwner: true,
    onUpdate: (updates) => console.log('Update:', updates),
    onDelete: () => console.log('Delete workspace'),
    onLeave: () => console.log('Leave workspace'),
  },
};
