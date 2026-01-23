import type { Meta, StoryObj } from '@storybook/react';
import { RolePermissions } from './RolePermissions';

const meta: Meta<typeof RolePermissions> = {
  title: 'Workspace/RolePermissions',
  component: RolePermissions,
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj<typeof RolePermissions>;

export const Default: Story = {};
