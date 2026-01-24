import type { Meta, StoryObj } from '@storybook/react';
import { useState, useRef } from 'react';
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
      options: ['sm', 'md', 'lg', 'xl', 'full'],
    },
    closeOnOverlayClick: {
      control: 'boolean',
    },
    closeOnEscape: {
      control: 'boolean',
    },
    trapFocus: {
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

export const WithDescription: Story = {
  render: (args) => <ModalDemo {...args} />,
  args: {
    title: 'Delete Account',
    description: 'This action cannot be undone.',
    children: (
      <p>
        Are you sure you want to delete your account? All your data will be permanently removed.
      </p>
    ),
    footer: (
      <>
        <Button variant="ghost">Cancel</Button>
        <Button variant="danger">Delete Account</Button>
      </>
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

export const Medium: Story = {
  render: (args) => <ModalDemo {...args} />,
  args: {
    title: 'Medium Modal',
    size: 'md',
    children: <p>This is the default medium-sized modal.</p>,
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

export const ExtraLarge: Story = {
  render: (args) => <ModalDemo {...args} />,
  args: {
    title: 'Extra Large Modal',
    size: 'xl',
    children: (
      <div>
        <p>This extra large modal is great for displaying data tables or complex forms.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginTop: '16px' }}>
          <div style={{ padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>Column 1</div>
          <div style={{ padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>Column 2</div>
        </div>
      </div>
    ),
  },
};

export const FullWidth: Story = {
  render: (args) => <ModalDemo {...args} />,
  args: {
    title: 'Full Width Modal',
    size: 'full',
    children: (
      <p>This modal takes up almost the full width of the screen. Useful for image galleries or wide content.</p>
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

export const NoEscapeClose: Story = {
  render: (args) => <ModalDemo {...args} />,
  args: {
    title: 'Required Action',
    closeOnEscape: false,
    closeOnOverlayClick: false,
    children: (
      <p>
        This modal cannot be closed with Escape or by clicking outside.
        You must use the buttons to proceed.
      </p>
    ),
    footer: (
      <>
        <Button variant="primary">Accept and Continue</Button>
      </>
    ),
  },
};

// Focus trap demo
const FocusTrapDemo = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Focus Trap Demo"
        trapFocus={true}
      >
        <p>Try pressing Tab repeatedly. Focus will cycle through focusable elements within the modal.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
          <input type="text" placeholder="First input" style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          <input type="text" placeholder="Second input" style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
          <Button variant="secondary">A Button</Button>
          <a href="#test" style={{ color: 'blue', textDecoration: 'underline' }}>A Link</a>
        </div>
      </Modal>
    </>
  );
};

export const FocusTrap: Story = {
  render: () => <FocusTrapDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Focus is trapped within the modal. Tab cycles through focusable elements, and focus returns to the trigger button when the modal closes.',
      },
    },
  },
};

// Initial focus demo
const InitialFocusDemo = () => {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Initial Focus"
        initialFocusRef={inputRef}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button variant="primary">Submit</Button>
          </>
        }
      >
        <p>When this modal opens, the input field below receives focus automatically.</p>
        <input
          ref={inputRef}
          type="text"
          placeholder="I get focused automatically"
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', marginTop: '12px' }}
        />
      </Modal>
    </>
  );
};

export const InitialFocus: Story = {
  render: () => <InitialFocusDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Use initialFocusRef to specify which element should receive focus when the modal opens.',
      },
    },
  },
};

export const WithForm: Story = {
  render: (args) => <ModalDemo {...args} />,
  args: {
    title: 'Create New Item',
    description: 'Fill out the form below to create a new item.',
    children: (
      <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label htmlFor="name" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
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
          <label htmlFor="desc" style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
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

// Long content with scroll
export const LongContent: Story = {
  render: (args) => <ModalDemo {...args} />,
  args: {
    title: 'Terms and Conditions',
    children: (
      <div>
        {Array.from({ length: 20 }, (_, i) => (
          <p key={i} style={{ marginBottom: '12px' }}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
          </p>
        ))}
      </div>
    ),
    footer: (
      <>
        <Button variant="ghost">Decline</Button>
        <Button variant="primary">Accept</Button>
      </>
    ),
  },
};

// Confirmation modal
export const ConfirmationDialog: Story = {
  render: (args) => <ModalDemo {...args} />,
  args: {
    title: 'Delete Item',
    description: 'This action is permanent and cannot be reversed.',
    size: 'sm',
    children: (
      <p>
        Are you sure you want to delete <strong>&quot;Project Alpha&quot;</strong>? This will remove all associated data.
      </p>
    ),
    footer: (
      <>
        <Button variant="ghost">Cancel</Button>
        <Button variant="danger">Delete</Button>
      </>
    ),
  },
};
