import type { Meta, StoryObj } from '@storybook/react';
import { Tabs } from './Tabs';
import { useState } from 'react';
import { Settings, Users, Key, Activity } from 'lucide-react';

const meta: Meta<typeof Tabs> = {
  title: 'UI/Tabs',
  component: Tabs,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

const mockItems = [
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'credentials', label: 'Shared Credentials', icon: Key },
  { id: 'activity', label: 'Activity', icon: Activity },
];

const TabsWithState = ({ items = mockItems, variant = 'soft' }: any) => {
  const [active, setActive] = useState(items[0].id);
  return (
    <div>
      <Tabs items={items} value={active} onChange={setActive} variant={variant} />
      <div style={{ padding: '20px', border: '1px solid #eee', marginTop: '20px' }}>
        Content for {active}
      </div>
    </div>
  );
};

export const Soft: Story = {
  render: () => <TabsWithState variant="soft" />,
};

export const Accent: Story = {
  render: () => <TabsWithState variant="accent" />,
};

export const WithBadges: Story = {
  render: () => <TabsWithState items={[
    { id: 'inbox', label: 'Inbox', badge: 12 },
    { id: 'archived', label: 'Archived' },
    { id: 'spam', label: 'Spam', badge: '99+' },
  ]} />,
};

export const AccentWithBadges: Story = {
  render: () => <TabsWithState variant="accent" items={[
    { id: 'inbox', label: 'Inbox', badge: 12 },
    { id: 'archived', label: 'Archived' },
    { id: 'spam', label: 'Spam', badge: '99+' },
  ]} />,
};

export const CustomBadges: Story = {
  render: () => <TabsWithState items={[
    { id: 'inbox', label: 'Inbox', badge: 12, badgeVariant: 'status-danger' },
    { id: 'archived', label: 'Archived' },
    { id: 'spam', label: 'Spam', badge: '99+', badgeVariant: 'warning' },
  ]} />,
};

export const Simple: Story = {
  render: () => <TabsWithState items={[
    { id: 'tab1', label: 'Overview' },
    { id: 'tab2', label: 'Details' },
    { id: 'tab3', label: 'Reviews' },
  ]} />,
};
