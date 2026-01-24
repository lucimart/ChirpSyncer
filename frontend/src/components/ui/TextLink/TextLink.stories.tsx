import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { TextLink } from './TextLink';

const meta: Meta<typeof TextLink> = {
  title: 'UI/TextLink',
  component: TextLink,
  parameters: {
    layout: 'centered',
  },
  args: {
    href: '#',
    children: 'Link text',
    size: 'sm',
    align: 'left',
    block: false,
  },
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['xs', 'sm', 'md'],
    },
    align: {
      control: { type: 'select' },
      options: ['left', 'center', 'right'],
    },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof TextLink>;

export const Default: Story = {
  args: {
    children: 'Click here',
    href: '#',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('link', { name: /click here/i })).toBeInTheDocument();
  },
};

export const ExtraSmall: Story = {
  args: {
    children: 'Extra small link',
    size: 'xs',
    href: '#',
  },
};

export const Small: Story = {
  args: {
    children: 'Small link',
    size: 'sm',
    href: '#',
  },
};

export const Medium: Story = {
  args: {
    children: 'Medium link',
    size: 'md',
    href: '#',
  },
};

export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-start' }}>
      <TextLink href="#" size="xs">
        Extra small (xs)
      </TextLink>
      <TextLink href="#" size="sm">
        Small (sm) - Default
      </TextLink>
      <TextLink href="#" size="md">
        Medium (md)
      </TextLink>
    </div>
  ),
};

export const BlockDisplay: Story = {
  args: {
    children: 'Block link',
    block: true,
    href: '#',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '300px', border: '1px dashed #ccc', padding: '8px' }}>
        <Story />
      </div>
    ),
  ],
};

export const CenterAligned: Story = {
  args: {
    children: 'Centered link',
    block: true,
    align: 'center',
    href: '#',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '300px', border: '1px dashed #ccc', padding: '8px' }}>
        <Story />
      </div>
    ),
  ],
};

export const RightAligned: Story = {
  args: {
    children: 'Right aligned link',
    block: true,
    align: 'right',
    href: '#',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '300px', border: '1px dashed #ccc', padding: '8px' }}>
        <Story />
      </div>
    ),
  ],
};

export const InlineWithText: Story = {
  render: () => (
    <p style={{ maxWidth: '400px' }}>
      This is a paragraph with an <TextLink href="#">inline link</TextLink> embedded within the text.
      You can also have <TextLink href="#" size="xs">smaller links</TextLink> or{' '}
      <TextLink href="#" size="md">larger links</TextLink> as needed.
    </p>
  ),
};

export const Navigation: Story = {
  render: () => (
    <nav style={{ display: 'flex', gap: '16px' }}>
      <TextLink href="#">Home</TextLink>
      <TextLink href="#">About</TextLink>
      <TextLink href="#">Services</TextLink>
      <TextLink href="#">Contact</TextLink>
    </nav>
  ),
};

export const FooterLinks: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <TextLink href="#" size="xs">
        Privacy Policy
      </TextLink>
      <TextLink href="#" size="xs">
        Terms of Service
      </TextLink>
      <TextLink href="#" size="xs">
        Cookie Settings
      </TextLink>
    </div>
  ),
};
