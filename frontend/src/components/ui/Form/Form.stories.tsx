import type { Meta, StoryObj } from '@storybook/react';
import { Form } from './Form';

const meta: Meta<typeof Form> = {
  title: 'UI/Form',
  component: Form,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Form>;

const inputStyle = {
  width: '300px',
  padding: '8px 12px',
  border: '1px solid #ccc',
  borderRadius: '4px',
};

const buttonStyle = {
  padding: '10px 20px',
  background: '#0066cc',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
};

export const Default: Story = {
  args: {
    children: (
      <>
        <input type="text" placeholder="Name" style={inputStyle} />
        <input type="email" placeholder="Email" style={inputStyle} />
        <button type="submit" style={buttonStyle}>Submit</button>
      </>
    ),
  },
};

export const SmallGap: Story = {
  args: {
    gap: 'sm',
    children: (
      <>
        <input type="text" placeholder="First field" style={inputStyle} />
        <input type="text" placeholder="Second field" style={inputStyle} />
        <input type="text" placeholder="Third field" style={inputStyle} />
      </>
    ),
  },
};

export const LargeGap: Story = {
  args: {
    gap: 'lg',
    children: (
      <>
        <input type="text" placeholder="First field" style={inputStyle} />
        <input type="text" placeholder="Second field" style={inputStyle} />
        <input type="text" placeholder="Third field" style={inputStyle} />
      </>
    ),
  },
};

export const LoginForm: Story = {
  args: {
    children: (
      <>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Email</label>
          <input type="email" placeholder="you@example.com" style={inputStyle} />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>Password</label>
          <input type="password" placeholder="********" style={inputStyle} />
        </div>
        <button type="submit" style={buttonStyle}>Sign In</button>
      </>
    ),
  },
};
