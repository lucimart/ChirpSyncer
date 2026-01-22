import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  args: {
    children: 'Primary Action',
    variant: 'primary',
    size: 'md',
    isLoading: false,
    fullWidth: false,
    disabled: false,
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    children: 'Primary Action',
    variant: 'primary',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /primary action/i })).toBeEnabled();
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary Action',
    variant: 'secondary',
  },
};

export const Ghost: Story = {
  args: {
    children: 'Ghost Action',
    variant: 'ghost',
  },
};

export const Danger: Story = {
  args: {
    children: 'Delete',
    variant: 'danger',
  },
};

export const Loading: Story = {
  args: {
    children: 'Saving',
    isLoading: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: /saving/i })).toBeDisabled();
  },
};

export const FullWidth: Story = {
  args: {
    children: 'Full Width',
    fullWidth: true,
  },
};
