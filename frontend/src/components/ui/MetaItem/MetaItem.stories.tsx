import type { Meta, StoryObj } from '@storybook/react';
import { Clock, MapPin, User, Calendar, Eye, Heart } from 'lucide-react';
import { MetaItem } from './MetaItem';

const meta: Meta<typeof MetaItem> = {
  title: 'UI/MetaItem',
  component: MetaItem,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['inline', 'text'],
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md'],
    },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'tertiary'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof MetaItem>;

export const Default: Story = {
  args: {
    children: (
      <>
        <Clock size={14} />
        5 min ago
      </>
    ),
  },
};

export const TextOnly: Story = {
  args: {
    variant: 'text',
    children: '5 min ago',
  },
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <MapPin size={14} />
        San Francisco, CA
      </>
    ),
  },
};

export const ExtraSmall: Story = {
  args: {
    size: 'xs',
    children: (
      <>
        <Clock size={12} />
        5 min ago
      </>
    ),
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    children: (
      <>
        <Clock size={14} />
        5 min ago
      </>
    ),
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
    children: (
      <>
        <Clock size={16} />
        5 min ago
      </>
    ),
  },
};

export const PrimaryColor: Story = {
  args: {
    color: 'primary',
    children: (
      <>
        <User size={14} />
        John Doe
      </>
    ),
  },
};

export const SecondaryColor: Story = {
  args: {
    color: 'secondary',
    children: (
      <>
        <Calendar size={14} />
        Jan 15, 2024
      </>
    ),
  },
};

export const TertiaryColor: Story = {
  args: {
    color: 'tertiary',
    children: (
      <>
        <Clock size={14} />
        5 min ago
      </>
    ),
  },
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <MetaItem size="xs">
        <Clock size={12} />
        Extra small (xs)
      </MetaItem>
      <MetaItem size="sm">
        <Clock size={14} />
        Small (sm)
      </MetaItem>
      <MetaItem size="md">
        <Clock size={16} />
        Medium (md)
      </MetaItem>
    </div>
  ),
};

export const AllColors: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <MetaItem color="primary">
        <User size={14} />
        Primary color
      </MetaItem>
      <MetaItem color="secondary">
        <Calendar size={14} />
        Secondary color
      </MetaItem>
      <MetaItem color="tertiary">
        <Clock size={14} />
        Tertiary color
      </MetaItem>
    </div>
  ),
};

export const MetadataRow: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <MetaItem size="sm" color="secondary">
        <Eye size={14} />
        1.2K views
      </MetaItem>
      <MetaItem size="sm" color="secondary">
        <Heart size={14} />
        348 likes
      </MetaItem>
      <MetaItem size="sm" color="tertiary">
        <Clock size={14} />
        2 hours ago
      </MetaItem>
    </div>
  ),
};
