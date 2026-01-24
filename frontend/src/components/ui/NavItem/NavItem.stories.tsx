import type { Meta, StoryObj } from '@storybook/react';
import styled from 'styled-components';
import {
  Home,
  Settings,
  Bell,
  Users,
  BarChart2,
  Calendar,
  Mail,
  HelpCircle,
} from 'lucide-react';
import { NavItem } from './NavItem';

const meta: Meta<typeof NavItem> = {
  title: 'UI/NavItem',
  component: NavItem,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    active: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '240px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof NavItem>;

const BadgeElement = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background-color: ${({ theme }) => theme.colors.danger[500]};
  color: white;
  font-size: 11px;
  font-weight: 600;
  border-radius: 10px;
`;

export const Default: Story = {
  args: {
    children: 'Dashboard',
    icon: <Home size={18} />,
  },
};

export const Active: Story = {
  args: {
    children: 'Dashboard',
    icon: <Home size={18} />,
    active: true,
  },
};

export const Inactive: Story = {
  args: {
    children: 'Settings',
    icon: <Settings size={18} />,
    active: false,
  },
};

export const Disabled: Story = {
  args: {
    children: 'Analytics',
    icon: <BarChart2 size={18} />,
    disabled: true,
  },
};

export const WithBadge: Story = {
  args: {
    children: 'Notifications',
    icon: <Bell size={18} />,
    badge: <BadgeElement>5</BadgeElement>,
  },
};

export const WithCustomIconColor: Story = {
  args: {
    children: 'Messages',
    icon: <Mail size={18} />,
    iconColor: '#3b82f6',
  },
};

export const WithoutIcon: Story = {
  args: {
    children: 'Help Center',
  },
};

export const NavigationSidebar: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <NavItem icon={<Home size={18} />} active>
        Dashboard
      </NavItem>
      <NavItem icon={<BarChart2 size={18} />}>Analytics</NavItem>
      <NavItem icon={<Users size={18} />}>Team</NavItem>
      <NavItem icon={<Calendar size={18} />}>Schedule</NavItem>
      <NavItem icon={<Mail size={18} />} badge={<BadgeElement>3</BadgeElement>}>
        Messages
      </NavItem>
      <NavItem icon={<Bell size={18} />} badge={<BadgeElement>12</BadgeElement>}>
        Notifications
      </NavItem>
      <NavItem icon={<Settings size={18} />}>Settings</NavItem>
      <NavItem icon={<HelpCircle size={18} />}>Help</NavItem>
    </div>
  ),
};

export const ActiveStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <NavItem icon={<Home size={18} />} active>
        Active Item
      </NavItem>
      <NavItem icon={<Settings size={18} />}>Inactive Item</NavItem>
      <NavItem icon={<Users size={18} />} disabled>
        Disabled Item
      </NavItem>
    </div>
  ),
};
