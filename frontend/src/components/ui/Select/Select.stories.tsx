import type { Meta, StoryObj } from '@storybook/react';
import { Select } from './Select';

const options = [
  { value: '', label: 'Select an option' },
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
];

const countryOptions = [
  { value: '', label: 'Select a country' },
  { value: 'us', label: 'United States' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'ca', label: 'Canada' },
  { value: 'au', label: 'Australia' },
  { value: 'de', label: 'Germany' },
];

const meta: Meta<typeof Select> = {
  title: 'UI/Select',
  component: Select,
  parameters: {
    layout: 'centered',
  },
  args: {
    options,
    fullWidth: false,
    disabled: false,
  },
  argTypes: {
    onChange: { action: 'changed' },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof Select>;

export const Default: Story = {
  args: {
    options,
  },
};

export const WithLabel: Story = {
  args: {
    options: countryOptions,
    label: 'Country',
  },
};

export const WithHint: Story = {
  args: {
    options: countryOptions,
    label: 'Country',
    hint: 'Select your country of residence',
  },
};

export const WithError: Story = {
  args: {
    options: countryOptions,
    label: 'Country',
    error: 'This field is required',
  },
};

export const Disabled: Story = {
  args: {
    options: countryOptions,
    label: 'Country',
    disabled: true,
  },
};

export const FullWidth: Story = {
  args: {
    options: countryOptions,
    label: 'Country',
    fullWidth: true,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '400px' }}>
        <Story />
      </div>
    ),
  ],
};

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '300px' }}>
      <Select options={countryOptions} label="Default" />
      <Select options={countryOptions} label="With Hint" hint="Select your country" />
      <Select options={countryOptions} label="With Error" error="This field is required" />
      <Select options={countryOptions} label="Disabled" disabled />
    </div>
  ),
};
