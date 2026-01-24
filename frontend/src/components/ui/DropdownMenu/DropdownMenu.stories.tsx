import type { Meta, StoryObj } from '@storybook/react';
import { DropdownMenu } from './DropdownMenu';
import { Button, IconButton } from '@/components/ui';
import {
  MoreHorizontal,
  Edit,
  Copy,
  Trash2,
  Share2,
  Download,
  Settings,
  User,
  LogOut,
  Flag,
  Ban,
  ExternalLink,
  Link,
} from 'lucide-react';

const meta: Meta<typeof DropdownMenu> = {
  title: 'UI/DropdownMenu',
  component: DropdownMenu,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'An accessible dropdown menu with keyboard navigation and animations.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof DropdownMenu>;

const defaultItems = [
  { id: 'edit', label: 'Edit', icon: Edit, onClick: () => console.log('Edit clicked') },
  { id: 'copy', label: 'Copy', icon: Copy, onClick: () => console.log('Copy clicked') },
  { id: 'share', label: 'Share', icon: Share2, onClick: () => console.log('Share clicked') },
  { id: 'delete', label: 'Delete', icon: Trash2, onClick: () => console.log('Delete clicked'), danger: true },
];

export const Default: Story = {
  args: {
    trigger: (
      <IconButton aria-label="More options">
        <MoreHorizontal size={18} />
      </IconButton>
    ),
    items: defaultItems,
  },
};

export const WithButton: Story = {
  args: {
    trigger: <Button variant="secondary">Options</Button>,
    items: defaultItems,
  },
};

export const AlignLeft: Story = {
  args: {
    trigger: <Button variant="secondary">Menu (Left)</Button>,
    items: defaultItems,
    align: 'left',
  },
};

export const WithDisabledItems: Story = {
  args: {
    trigger: (
      <IconButton aria-label="More options">
        <MoreHorizontal size={18} />
      </IconButton>
    ),
    items: [
      { id: 'edit', label: 'Edit', icon: Edit, onClick: () => console.log('Edit') },
      { id: 'copy', label: 'Copy', icon: Copy, onClick: () => console.log('Copy'), disabled: true },
      { id: 'share', label: 'Share', icon: Share2, onClick: () => console.log('Share') },
      { id: 'delete', label: 'Delete', icon: Trash2, onClick: () => console.log('Delete'), disabled: true, danger: true },
    ],
  },
};

export const UserMenu: Story = {
  args: {
    trigger: <Button variant="ghost">John Doe</Button>,
    items: [
      { id: 'profile', label: 'Profile', icon: User, onClick: () => console.log('Profile') },
      { id: 'settings', label: 'Settings', icon: Settings, onClick: () => console.log('Settings') },
      { id: 'download', label: 'Download data', icon: Download, onClick: () => console.log('Download') },
      { id: 'logout', label: 'Log out', icon: LogOut, onClick: () => console.log('Logout'), danger: true },
    ],
    align: 'right',
  },
};

export const PostActions: Story = {
  args: {
    trigger: (
      <IconButton aria-label="Post options" variant="ghost" size="sm">
        <MoreHorizontal size={16} />
      </IconButton>
    ),
    items: [
      { id: 'copy-link', label: 'Copy link', icon: Link, onClick: () => console.log('Copy link') },
      { id: 'share', label: 'Share', icon: Share2, onClick: () => console.log('Share') },
      { id: 'open', label: 'Open in new tab', icon: ExternalLink, onClick: () => console.log('Open') },
      { id: 'report', label: 'Report post', icon: Flag, onClick: () => console.log('Report'), danger: true },
      { id: 'block', label: 'Block user', icon: Ban, onClick: () => console.log('Block'), danger: true },
    ],
  },
};

export const ManyItems: Story = {
  args: {
    trigger: <Button variant="secondary">Many Options</Button>,
    items: [
      { id: '1', label: 'Option 1', icon: Edit, onClick: () => {} },
      { id: '2', label: 'Option 2', icon: Copy, onClick: () => {} },
      { id: '3', label: 'Option 3', icon: Share2, onClick: () => {} },
      { id: '4', label: 'Option 4', icon: Download, onClick: () => {} },
      { id: '5', label: 'Option 5', icon: Settings, onClick: () => {} },
      { id: '6', label: 'Option 6', icon: User, onClick: () => {} },
      { id: '7', label: 'Dangerous Action', icon: Trash2, onClick: () => {}, danger: true },
    ],
  },
};
