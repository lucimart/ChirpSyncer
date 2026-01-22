import type { Meta, StoryObj } from '@storybook/react';
import { Inbox, Search, FileX, Users, Calendar, Database } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { Button } from '../Button';

const meta: Meta<typeof EmptyState> = {
  title: 'UI/EmptyState',
  component: EmptyState,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: {
    icon: Inbox,
    title: 'No items found',
    description: 'Get started by creating your first item.',
  },
};

export const WithAction: Story = {
  args: {
    icon: Inbox,
    title: 'No messages',
    description: 'Your inbox is empty. New messages will appear here.',
    action: <Button variant="primary">Compose Message</Button>,
  },
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <EmptyState
        icon={Inbox}
        title="Small"
        description="A compact empty state"
        size="sm"
      />
      <EmptyState
        icon={Inbox}
        title="Medium (default)"
        description="The standard empty state size"
        size="md"
      />
      <EmptyState
        icon={Inbox}
        title="Large"
        description="A prominent empty state for major sections"
        size="lg"
      />
    </div>
  ),
};

export const SearchResults: Story = {
  args: {
    icon: Search,
    title: 'No results found',
    description: 'Try adjusting your search terms or filters.',
    action: <Button variant="ghost">Clear filters</Button>,
  },
};

export const NoData: Story = {
  args: {
    icon: Database,
    title: 'No data available',
    description: 'Connect a data source to get started.',
    action: <Button variant="primary">Connect Source</Button>,
  },
};

export const NoUsers: Story = {
  args: {
    icon: Users,
    title: 'No team members',
    description: 'Invite colleagues to collaborate on this project.',
    action: <Button variant="primary">Invite Team</Button>,
  },
};

export const NoEvents: Story = {
  args: {
    icon: Calendar,
    title: 'No upcoming events',
    description: 'Schedule your first event to see it here.',
    action: <Button variant="primary">Create Event</Button>,
  },
};

export const FileNotFound: Story = {
  args: {
    icon: FileX,
    title: 'File not found',
    description: 'The file you\'re looking for doesn\'t exist or has been moved.',
    action: <Button variant="ghost">Go back</Button>,
  },
};

export const WithoutIcon: Story = {
  args: {
    title: 'Nothing here yet',
    description: 'Content will appear as you use the app.',
  },
};

export const WithoutDescription: Story = {
  args: {
    icon: Inbox,
    title: 'All caught up!',
  },
};

export const MinimalWithAction: Story = {
  args: {
    title: 'Create your first rule',
    action: <Button variant="primary">Get Started</Button>,
    size: 'sm',
  },
};
