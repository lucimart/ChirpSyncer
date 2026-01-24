import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  args: {
    padding: 'md',
    hoverable: false,
  },
  argTypes: {
    padding: {
      control: { type: 'select' },
      options: ['none', 'sm', 'md', 'lg'],
    },
    hoverable: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: (args) => (
    <Card {...args}>
      <div style={{ minHeight: 80 }}>Basic content</div>
    </Card>
  ),
};

export const WithHeaderFooter: Story = {
  render: (args) => (
    <Card {...args}>
      <Card.Header>
        <Card.Title>Card title</Card.Title>
        <Card.Description>Supporting description.</Card.Description>
      </Card.Header>
      <Card.Content>
        <div style={{ minHeight: 80 }}>Card content body</div>
      </Card.Content>
      <Card.Footer>
        <button type="button">Cancel</button>
        <button type="button">Save</button>
      </Card.Footer>
    </Card>
  ),
};

export const Hoverable: Story = {
  args: {
    hoverable: true,
  },
  render: (args) => (
    <Card {...args}>
      <div style={{ minHeight: 80 }}>Hover me</div>
    </Card>
  ),
};
