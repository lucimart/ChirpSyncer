import type { Meta, StoryObj } from '@storybook/react';
import styled from 'styled-components';
import { Label } from './Label';

const meta: Meta<typeof Label> = {
  title: 'UI/Label',
  component: Label,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    spacing: {
      control: 'select',
      options: ['none', 'sm', 'md'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Label>;

export const Default: Story = {
  args: {
    children: 'Email address',
  },
};

export const WithHtmlFor: Story = {
  args: {
    children: 'Username',
    htmlFor: 'username-input',
  },
};

export const NoSpacing: Story = {
  args: {
    children: 'No bottom margin',
    spacing: 'none',
  },
};

export const SmallSpacing: Story = {
  args: {
    children: 'Small bottom margin',
    spacing: 'sm',
  },
};

export const MediumSpacing: Story = {
  args: {
    children: 'Medium bottom margin',
    spacing: 'md',
  },
};

const RequiredIndicator = styled.span`
  color: ${({ theme }) => theme.colors.danger[500]};
  margin-left: 4px;
`;

export const WithRequiredIndicator: Story = {
  render: () => (
    <Label>
      Email address
      <RequiredIndicator>*</RequiredIndicator>
    </Label>
  ),
};

const Input = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 6px;
  font-size: 14px;
`;

const FormGroup = styled.div`
  width: 300px;
`;

export const WithInput: Story = {
  render: () => (
    <FormGroup>
      <Label htmlFor="email">Email address</Label>
      <Input id="email" type="email" placeholder="you@example.com" />
    </FormGroup>
  ),
};

export const AllSpacingVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <FormGroup>
        <Label spacing="none">No spacing (none)</Label>
        <Input placeholder="Input field" />
      </FormGroup>
      <FormGroup>
        <Label spacing="sm">Small spacing (sm)</Label>
        <Input placeholder="Input field" />
      </FormGroup>
      <FormGroup>
        <Label spacing="md">Medium spacing (md)</Label>
        <Input placeholder="Input field" />
      </FormGroup>
    </div>
  ),
};
