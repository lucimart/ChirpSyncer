import type { Meta, StoryObj } from '@storybook/react';
import { MemberManagement, type WorkspaceMember } from './MemberManagement';

const meta: Meta<typeof MemberManagement> = {
  title: 'Workspace/MemberManagement',
  component: MemberManagement,
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj<typeof MemberManagement>;

const mockMembers: WorkspaceMember[] = [
  {
    id: 'member-1',
    userId: 'user-1',
    email: 'john@example.com',
    name: 'John Doe',
    role: 'admin',
    joinedAt: '2024-01-01T00:00:00Z',
    lastActive: new Date().toISOString(),
  },
  {
    id: 'member-2',
    userId: 'user-2',
    email: 'jane@example.com',
    name: 'Jane Smith',
    role: 'editor',
    joinedAt: '2024-02-01T00:00:00Z',
    lastActive: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'member-3',
    userId: 'user-3',
    email: 'bob@example.com',
    name: 'Bob Wilson',
    role: 'viewer',
    joinedAt: '2024-03-01T00:00:00Z',
    lastActive: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const AsAdmin: Story = {
  args: {
    members: mockMembers,
    currentUserId: 'user-1',
    currentUserRole: 'admin',
    onInvite: (data) => console.log('Invite:', data),
    onRemove: (id) => console.log('Remove:', id),
    onUpdateRole: (id, role) => console.log('Update role:', id, role),
  },
};

export const AsEditor: Story = {
  args: {
    members: mockMembers,
    currentUserId: 'user-2',
    currentUserRole: 'editor',
    onInvite: (data) => console.log('Invite:', data),
    onRemove: (id) => console.log('Remove:', id),
    onUpdateRole: (id, role) => console.log('Update role:', id, role),
  },
};

export const AsViewer: Story = {
  args: {
    members: mockMembers,
    currentUserId: 'user-3',
    currentUserRole: 'viewer',
    onInvite: (data) => console.log('Invite:', data),
    onRemove: (id) => console.log('Remove:', id),
    onUpdateRole: (id, role) => console.log('Update role:', id, role),
  },
};

export const SingleMember: Story = {
  args: {
    members: [mockMembers[0]],
    currentUserId: 'user-1',
    currentUserRole: 'admin',
    onInvite: (data) => console.log('Invite:', data),
    onRemove: (id) => console.log('Remove:', id),
    onUpdateRole: (id, role) => console.log('Update role:', id, role),
  },
};

export const LargeTeam: Story = {
  args: {
    members: [
      ...mockMembers,
      {
        id: 'member-4',
        userId: 'user-4',
        email: 'alice@example.com',
        name: 'Alice Johnson',
        role: 'editor',
        joinedAt: '2024-04-01T00:00:00Z',
        lastActive: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: 'member-5',
        userId: 'user-5',
        email: 'charlie@example.com',
        name: 'Charlie Brown',
        role: 'viewer',
        joinedAt: '2024-05-01T00:00:00Z',
        lastActive: new Date(Date.now() - 604800000).toISOString(),
      },
      {
        id: 'member-6',
        userId: 'user-6',
        email: 'diana@example.com',
        name: 'Diana Prince',
        role: 'admin',
        joinedAt: '2024-06-01T00:00:00Z',
        lastActive: new Date(Date.now() - 1800000).toISOString(),
      },
    ],
    currentUserId: 'user-1',
    currentUserRole: 'admin',
    onInvite: (data) => console.log('Invite:', data),
    onRemove: (id) => console.log('Remove:', id),
    onUpdateRole: (id, role) => console.log('Update role:', id, role),
  },
};
