import type { Meta, StoryObj } from '@storybook/react';
import { ToastProvider, useToast } from './Toast';
import { Button } from '../Button';

const meta: Meta = {
  title: 'UI/Toast',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
};

export default meta;

// Demo component that uses the toast hook
const ToastDemo = () => {
  const { addToast } = useToast();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Button
        variant="primary"
        onClick={() =>
          addToast({
            type: 'success',
            title: 'Success!',
            message: 'Your changes have been saved successfully.',
          })
        }
      >
        Show Success Toast
      </Button>

      <Button
        variant="danger"
        onClick={() =>
          addToast({
            type: 'error',
            title: 'Error',
            message: 'Something went wrong. Please try again.',
          })
        }
      >
        Show Error Toast
      </Button>

      <Button
        variant="outline"
        onClick={() =>
          addToast({
            type: 'warning',
            title: 'Warning',
            message: 'This action cannot be undone.',
          })
        }
      >
        Show Warning Toast
      </Button>

      <Button
        variant="ghost"
        onClick={() =>
          addToast({
            type: 'info',
            title: 'Information',
            message: 'Here is some helpful information.',
          })
        }
      >
        Show Info Toast
      </Button>
    </div>
  );
};

export const AllTypes: StoryObj = {
  render: () => <ToastDemo />,
};

const TitleOnlyDemo = () => {
  const { addToast } = useToast();

  return (
    <Button
      variant="primary"
      onClick={() =>
        addToast({
          type: 'success',
          title: 'Saved!',
        })
      }
    >
      Toast without message
    </Button>
  );
};

export const TitleOnly: StoryObj = {
  render: () => <TitleOnlyDemo />,
};

const CustomDurationDemo = () => {
  const { addToast } = useToast();

  return (
    <div style={{ display: 'flex', gap: '12px' }}>
      <Button
        onClick={() =>
          addToast({
            type: 'info',
            title: 'Quick toast',
            message: 'This will disappear in 2 seconds',
            duration: 2000,
          })
        }
      >
        2s duration
      </Button>
      <Button
        onClick={() =>
          addToast({
            type: 'warning',
            title: 'Persistent toast',
            message: 'This stays for 10 seconds',
            duration: 10000,
          })
        }
      >
        10s duration
      </Button>
      <Button
        onClick={() =>
          addToast({
            type: 'error',
            title: 'Manual dismiss only',
            message: 'Click X to dismiss',
            duration: 0,
          })
        }
      >
        No auto-dismiss
      </Button>
    </div>
  );
};

export const CustomDuration: StoryObj = {
  render: () => <CustomDurationDemo />,
};

const MultipleToastsDemo = () => {
  const { addToast } = useToast();

  return (
    <Button
      variant="primary"
      onClick={() => {
        addToast({ type: 'success', title: 'First toast' });
        setTimeout(() => addToast({ type: 'info', title: 'Second toast' }), 200);
        setTimeout(() => addToast({ type: 'warning', title: 'Third toast' }), 400);
      }}
    >
      Show multiple toasts
    </Button>
  );
};

export const MultipleToasts: StoryObj = {
  render: () => <MultipleToastsDemo />,
};
