import type { Meta, StoryObj } from '@storybook/react';
import { Settings, Users, Folder, FileText, Home, Bell } from 'lucide-react';
import { CollapsibleMenu } from './CollapsibleMenu';

const meta: Meta<typeof CollapsibleMenu> = {
  title: 'UI/CollapsibleMenu',
  component: CollapsibleMenu,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CollapsibleMenu>;

const MenuItem = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      padding: '8px 12px',
      fontSize: '14px',
      color: '#374151',
      borderRadius: '6px',
      cursor: 'pointer',
    }}
  >
    {children}
  </div>
);

export const Default: Story = {
  args: {
    label: 'Settings',
    icon: Settings,
    children: (
      <>
        <MenuItem>General</MenuItem>
        <MenuItem>Security</MenuItem>
        <MenuItem>Notifications</MenuItem>
      </>
    ),
  },
};

export const DefaultOpen: Story = {
  args: {
    label: 'Users',
    icon: Users,
    defaultOpen: true,
    children: (
      <>
        <MenuItem>All Users</MenuItem>
        <MenuItem>Admins</MenuItem>
        <MenuItem>Pending</MenuItem>
      </>
    ),
  },
};

export const WithBadge: Story = {
  args: {
    label: 'Notifications',
    icon: Bell,
    badge: 5,
    children: (
      <>
        <MenuItem>Unread</MenuItem>
        <MenuItem>All</MenuItem>
        <MenuItem>Archived</MenuItem>
      </>
    ),
  },
};

export const WithoutIcon: Story = {
  args: {
    label: 'More Options',
    children: (
      <>
        <MenuItem>Option 1</MenuItem>
        <MenuItem>Option 2</MenuItem>
        <MenuItem>Option 3</MenuItem>
      </>
    ),
  },
};

export const NestedMenus: Story = {
  render: () => (
    <div style={{ width: '250px' }}>
      <CollapsibleMenu label="Dashboard" icon={Home} defaultOpen>
        <MenuItem>Overview</MenuItem>
        <MenuItem>Analytics</MenuItem>
      </CollapsibleMenu>
      <CollapsibleMenu label="Documents" icon={Folder}>
        <MenuItem>Recent</MenuItem>
        <MenuItem>Shared</MenuItem>
        <CollapsibleMenu label="Projects" icon={FileText}>
          <MenuItem>Project A</MenuItem>
          <MenuItem>Project B</MenuItem>
        </CollapsibleMenu>
      </CollapsibleMenu>
      <CollapsibleMenu label="Settings" icon={Settings}>
        <MenuItem>Profile</MenuItem>
        <MenuItem>Security</MenuItem>
        <MenuItem>Billing</MenuItem>
      </CollapsibleMenu>
    </div>
  ),
};

export const LargeBadge: Story = {
  args: {
    label: 'Messages',
    icon: Bell,
    badge: 99,
    children: (
      <>
        <MenuItem>Inbox</MenuItem>
        <MenuItem>Sent</MenuItem>
        <MenuItem>Drafts</MenuItem>
      </>
    ),
  },
};
