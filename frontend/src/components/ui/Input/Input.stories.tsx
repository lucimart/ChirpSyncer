import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  args: {
    label: 'Email',
    placeholder: 'name@company.com',
    fullWidth: false,
  },
  argTypes: {
    fullWidth: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof Input>;

export const Default: Story = {};

export const WithHint: Story = {
  args: {
    hint: 'We will never share your email.',
  },
};

export const WithError: Story = {
  args: {
    error: 'Email is required.',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const FullWidth: Story = {
  args: {
    fullWidth: true,
  },
};

export const Typing: Story = {
  args: {
    label: 'Username',
    placeholder: 'yourname',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('Username');
    await userEvent.type(input, 'sisyphus');
    await expect(input).toHaveValue('sisyphus');
  },
};
