import type { Meta, StoryObj } from '@storybook/react';
import { WorkspaceSwitcher, type Workspace } from './WorkspaceSwitcher';

const meta: Meta<typeof WorkspaceSwitcher> = {
  title: 'Workspace/WorkspaceSwitcher',
  component: WorkspaceSwitcher,
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof WorkspaceSwitcher>;

const mockWorkspaces: Workspace[] = [
  {
    id: 'ws-1',
    name: 'Personal',
    type: 'personal',
    ownerId: 'user-1',
    memberCount: 1,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'ws-2',
    name: 'Marketing Team',
    type: 'team',
    ownerId: 'user-1',
    memberCount: 5,
    createdAt: '2024-02-01T00:00:00Z',
  },
  {
    id: 'ws-3',
    name: 'Engineering',
    type: 'team',
    ownerId: 'user-2',
    memberCount: 12,
    createdAt: '2024-03-01T00:00:00Z',
  },
];

export const Default: Story = {
  args: {
    workspaces: mockWorkspaces,
    currentWorkspace: mockWorkspaces[0],
    onSwitch: (id) => console.log('Switch to:', id),
    onCreateWorkspace: () => console.log('Create workspace'),
  },
};

export const TeamWorkspaceSelected: Story = {
  args: {
    workspaces: mockWorkspaces,
    currentWorkspace: mockWorkspaces[1],
    onSwitch: (id) => console.log('Switch to:', id),
    onCreateWorkspace: () => console.log('Create workspace'),
  },
};

export const SingleWorkspace: Story = {
  args: {
    workspaces: [mockWorkspaces[0]],
    currentWorkspace: mockWorkspaces[0],
    onSwitch: (id) => console.log('Switch to:', id),
    onCreateWorkspace: () => console.log('Create workspace'),
  },
};

export const ManyWorkspaces: Story = {
  args: {
    workspaces: [
      ...mockWorkspaces,
      {
        id: 'ws-4',
        name: 'Design Team',
        type: 'team',
        ownerId: 'user-1',
        memberCount: 8,
        createdAt: '2024-04-01T00:00:00Z',
      },
      {
        id: 'ws-5',
        name: 'Sales',
        type: 'team',
        ownerId: 'user-2',
        memberCount: 15,
        createdAt: '2024-05-01T00:00:00Z',
      },
      {
        id: 'ws-6',
        name: 'Support',
        type: 'team',
        ownerId: 'user-3',
        memberCount: 20,
        createdAt: '2024-06-01T00:00:00Z',
      },
      {
        id: 'ws-7',
        name: 'Product',
        type: 'team',
        ownerId: 'user-1',
        memberCount: 7,
        createdAt: '2024-07-01T00:00:00Z',
      },
    ],
    currentWorkspace: mockWorkspaces[0],
    onSwitch: (id) => console.log('Switch to:', id),
    onCreateWorkspace: () => console.log('Create workspace'),
  },
};

export const LongWorkspaceName: Story = {
  args: {
    workspaces: [
      {
        id: 'ws-long',
        name: 'This Is A Very Long Workspace Name That Might Overflow',
        type: 'team',
        ownerId: 'user-1',
        memberCount: 3,
        createdAt: '2024-01-01T00:00:00Z',
      },
      ...mockWorkspaces,
    ],
    currentWorkspace: {
      id: 'ws-long',
      name: 'This Is A Very Long Workspace Name That Might Overflow',
      type: 'team',
      ownerId: 'user-1',
      memberCount: 3,
      createdAt: '2024-01-01T00:00:00Z',
    },
    onSwitch: (id) => console.log('Switch to:', id),
    onCreateWorkspace: () => console.log('Create workspace'),
  },
};

export const SingleMemberTeam: Story = {
  args: {
    workspaces: [
      {
        id: 'ws-single',
        name: 'Solo Team',
        type: 'team',
        ownerId: 'user-1',
        memberCount: 1,
        createdAt: '2024-01-01T00:00:00Z',
      },
    ],
    currentWorkspace: {
      id: 'ws-single',
      name: 'Solo Team',
      type: 'team',
      ownerId: 'user-1',
      memberCount: 1,
      createdAt: '2024-01-01T00:00:00Z',
    },
    onSwitch: (id) => console.log('Switch to:', id),
    onCreateWorkspace: () => console.log('Create workspace'),
  },
};
