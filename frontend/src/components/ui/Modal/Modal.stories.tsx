import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from '../Button';

const meta: Meta<typeof Modal> = {
  title: 'UI/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    closeOnOverlayClick: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

// Wrapper to make modal interactive in Storybook
const ModalDemo = (args: React.ComponentProps<typeof Modal>) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      <Modal {...args} isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export const Default: Story = {
  render: (args) => <ModalDemo {...args} />,
  args: {
    title: 'Modal Title',
    children: (
      <p>
        This is the modal content. You can put any content here including forms,
        text, or other components.
      </p>
    ),
  },
};

export const WithFooter: Story = {
  render: (args) => <ModalDemo {...args} />,
  args: {
    title: 'Confirm Action',
    children: <p>Are you sure you want to proceed with this action?</p>,
    footer: (
      <>
        <Button variant="ghost">Cancel</Button>
        <Button variant="primary">Confirm</Button>
      </>
    ),
  },
};

export const Small: Story = {
  render: (args) => <ModalDemo {...args} />,
  args: {
    title: 'Small Modal',
    size: 'sm',
    children: <p>This is a small modal for simple confirmations.</p>,
  },
};

export const Large: Story = {
  render: (args) => <ModalDemo {...args} />,
  args: {
    title: 'Large Modal',
    size: 'lg',
    children: (
      <div>
        <p>This is a large modal suitable for complex content.</p>
        <p>It can contain forms, tables, or detailed information.</p>
        <ul>
          <li>Feature 1</li>
          <li>Feature 2</li>
          <li>Feature 3</li>
        </ul>
      </div>
    ),
  },
};

export const NoTitle: Story = {
  render: (args) => <ModalDemo {...args} />,
  args: {
    children: (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <p>A modal without a title bar for custom layouts.</p>
        <Button variant="primary">Got it</Button>
      </div>
    ),
  },
};

export const NoOverlayClose: Story = {
  render: (args) => <ModalDemo {...args} />,
  args: {
    title: 'Important Notice',
    closeOnOverlayClick: false,
    children: (
      <p>
        This modal cannot be closed by clicking the overlay. Use the close button
        or press Escape.
      </p>
    ),
  },
};

export const WithForm: Story = {
  render: (args) => <ModalDemo {...args} />,
  args: {
    title: 'Create New Item',
    children: (
      <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label htmlFor="name" style={{ display: 'block', marginBottom: '4px' }}>
            Name
          </label>
          <input
            id="name"
            type="text"
            placeholder="Enter name"
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>
        <div>
          <label htmlFor="desc" style={{ display: 'block', marginBottom: '4px' }}>
            Description
          </label>
          <textarea
            id="desc"
            placeholder="Enter description"
            rows={3}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>
      </form>
    ),
    footer: (
      <>
        <Button variant="ghost">Cancel</Button>
        <Button variant="primary">Create</Button>
      </>
    ),
  },
};
