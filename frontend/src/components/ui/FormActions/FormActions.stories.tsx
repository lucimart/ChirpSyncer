import type { Meta, StoryObj } from '@storybook/react';
import { FormActions } from './FormActions';

const meta: Meta<typeof FormActions> = {
  title: 'UI/FormActions',
  component: FormActions,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '400px', padding: '20px', background: '#f9fafb', borderRadius: '8px' }}>
        <div style={{ marginBottom: '8px' }}>Form content above...</div>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FormActions>;

const buttonStyle = {
  padding: '8px 16px',
  borderRadius: '4px',
  cursor: 'pointer',
};

const primaryButton = {
  ...buttonStyle,
  background: '#0066cc',
  color: 'white',
  border: 'none',
};

const secondaryButton = {
  ...buttonStyle,
  background: 'white',
  color: '#333',
  border: '1px solid #ccc',
};

export const Default: Story = {
  args: {
    children: (
      <>
        <button style={secondaryButton}>Cancel</button>
        <button style={primaryButton}>Save</button>
      </>
    ),
  },
};

export const AlignStart: Story = {
  args: {
    align: 'start',
    children: (
      <>
        <button style={primaryButton}>Submit</button>
      </>
    ),
  },
};

export const AlignCenter: Story = {
  args: {
    align: 'center',
    children: (
      <>
        <button style={primaryButton}>Confirm</button>
      </>
    ),
  },
};

export const AlignBetween: Story = {
  args: {
    align: 'between',
    children: (
      <>
        <button style={secondaryButton}>Back</button>
        <button style={primaryButton}>Next</button>
      </>
    ),
  },
};

export const WithoutBorder: Story = {
  args: {
    withBorder: false,
    children: (
      <>
        <button style={secondaryButton}>Cancel</button>
        <button style={primaryButton}>Save</button>
      </>
    ),
  },
};

export const MultipleButtons: Story = {
  args: {
    align: 'between',
    children: (
      <>
        <button style={{ ...secondaryButton, color: '#dc2626' }}>Delete</button>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={secondaryButton}>Cancel</button>
          <button style={primaryButton}>Save Changes</button>
        </div>
      </>
    ),
  },
};
