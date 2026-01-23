import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { TextArea } from './TextArea';

const meta: Meta<typeof TextArea> = {
  title: 'UI/TextArea',
  component: TextArea,
  parameters: {
    layout: 'centered',
  },
  args: {
    placeholder: 'Enter your text...',
    fullWidth: false,
    disabled: false,
    minRows: 3,
  },
  argTypes: {
    label: { control: 'text' },
    error: { control: 'text' },
    helperText: { control: 'text' },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    minRows: { control: { type: 'number', min: 1, max: 20 } },
    maxRows: { control: { type: 'number', min: 1, max: 20 } },
    maxLength: { control: { type: 'number', min: 0 } },
    showCharCount: { control: 'boolean' },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '400px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof TextArea>;

export const Default: Story = {
  args: {
    placeholder: 'Enter your message...',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByPlaceholderText('Enter your message...')).toBeEnabled();
  },
};

export const WithLabel: Story = {
  args: {
    label: 'Description',
    placeholder: 'Enter a description...',
  },
};

export const WithError: Story = {
  args: {
    label: 'Comments',
    placeholder: 'Enter your comments...',
    error: 'This field is required',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Notes',
    placeholder: 'Cannot edit this field',
    disabled: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByPlaceholderText('Cannot edit this field')).toBeDisabled();
  },
};

export const WithValue: Story = {
  args: {
    label: 'Bio',
    defaultValue:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  },
};

export const SmallSize: Story = {
  args: {
    label: 'Short note',
    placeholder: 'Brief note...',
    size: 'sm',
    minRows: 2,
  },
};

export const LargeSize: Story = {
  args: {
    label: 'Detailed description',
    placeholder: 'Write a detailed description...',
    size: 'lg',
    minRows: 5,
  },
};

export const WithCharCount: Story = {
  args: {
    label: 'Bio',
    placeholder: 'Tell us about yourself...',
    showCharCount: true,
    maxLength: 280,
    helperText: 'Keep it brief and professional',
  },
};

export const AutoGrow: Story = {
  args: {
    label: 'Auto-growing textarea',
    placeholder: 'This textarea grows as you type...',
    minRows: 2,
    maxRows: 8,
  },
};

export const FullWidth: Story = {
  args: {
    label: 'Full width textarea',
    placeholder: 'Takes full container width...',
    fullWidth: true,
  },
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '400px' }}>
      <TextArea label="Default" placeholder="Default state..." />
      <TextArea label="With value" defaultValue="Some content here" />
      <TextArea label="With error" placeholder="Error state..." error="Please enter valid content" />
      <TextArea label="Disabled" placeholder="Disabled state..." disabled />
    </div>
  ),
};
