import type { Meta, StoryObj } from '@storybook/react';
import { ToastProvider, useToast, toast } from './Toast';
import type { ToastPosition } from './types';
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
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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

// Toast with action button
const WithActionDemo = () => {
  const { addToast } = useToast();

  return (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      <Button
        onClick={() =>
          addToast({
            type: 'info',
            title: 'New update available',
            message: 'A new version of ChirpSyncer is ready.',
            action: {
              label: 'Update now',
              onClick: () => console.log('Update clicked'),
            },
            duration: 0,
          })
        }
      >
        With Action Button
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          addToast({
            type: 'error',
            title: 'Connection lost',
            message: 'Unable to sync with Twitter.',
            action: {
              label: 'Retry',
              onClick: () => console.log('Retry clicked'),
            },
          })
        }
      >
        Error with Retry
      </Button>
    </div>
  );
};

export const WithAction: StoryObj = {
  render: () => <WithActionDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Toasts can include an action button for quick user interactions.',
      },
    },
  },
};

// Non-dismissible toast
const NonDismissibleDemo = () => {
  const { addToast, removeToast } = useToast();

  return (
    <Button
      onClick={() => {
        const id = addToast({
          type: 'warning',
          title: 'Uploading...',
          message: 'Please wait while your file is being uploaded.',
          dismissible: false,
          duration: 0,
        });
        // Simulate upload completion
        setTimeout(() => {
          removeToast(id);
          addToast({
            type: 'success',
            title: 'Upload complete!',
            message: 'Your file has been uploaded successfully.',
          });
        }, 3000);
      }}
    >
      Start Upload (Non-dismissible)
    </Button>
  );
};

export const NonDismissible: StoryObj = {
  render: () => <NonDismissibleDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Toasts can be made non-dismissible for important ongoing operations.',
      },
    },
  },
};

// Convenience helpers demo
const ConvenienceHelpersDemo = () => {
  const { addToast } = useToast();

  return (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      <Button variant="primary" onClick={() => addToast(toast.success('Operation completed'))}>
        toast.success()
      </Button>
      <Button variant="danger" onClick={() => addToast(toast.error('Something failed', { message: 'Please try again later' }))}>
        toast.error()
      </Button>
      <Button variant="outline" onClick={() => addToast(toast.warning('Heads up!'))}>
        toast.warning()
      </Button>
      <Button variant="ghost" onClick={() => addToast(toast.info('FYI'))}>
        toast.info()
      </Button>
    </div>
  );
};

export const ConvenienceHelpers: StoryObj = {
  render: () => <ConvenienceHelpersDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Use the `toast.success()`, `toast.error()`, `toast.warning()`, and `toast.info()` helpers for cleaner code.',
      },
    },
  },
};

// Position variants (need separate providers)
const PositionWrapper = ({ position, children }: { position: ToastPosition; children: React.ReactNode }) => (
  <ToastProvider position={position}>
    {children}
  </ToastProvider>
);

const PositionDemo = ({ position }: { position: ToastPosition }) => {
  const { addToast } = useToast();

  return (
    <Button
      onClick={() =>
        addToast({
          type: 'info',
          title: `Toast at ${position}`,
          message: `This toast appears at the ${position} position.`,
        })
      }
    >
      Show Toast ({position})
    </Button>
  );
};

export const TopRight: StoryObj = {
  render: () => (
    <PositionWrapper position="top-right">
      <PositionDemo position="top-right" />
    </PositionWrapper>
  ),
  decorators: [], // Override default decorator
};

export const TopLeft: StoryObj = {
  render: () => (
    <PositionWrapper position="top-left">
      <PositionDemo position="top-left" />
    </PositionWrapper>
  ),
  decorators: [],
};

export const BottomRight: StoryObj = {
  render: () => (
    <PositionWrapper position="bottom-right">
      <PositionDemo position="bottom-right" />
    </PositionWrapper>
  ),
  decorators: [],
};

export const BottomLeft: StoryObj = {
  render: () => (
    <PositionWrapper position="bottom-left">
      <PositionDemo position="bottom-left" />
    </PositionWrapper>
  ),
  decorators: [],
};

export const TopCenter: StoryObj = {
  render: () => (
    <PositionWrapper position="top-center">
      <PositionDemo position="top-center" />
    </PositionWrapper>
  ),
  decorators: [],
};

export const BottomCenter: StoryObj = {
  render: () => (
    <PositionWrapper position="bottom-center">
      <PositionDemo position="bottom-center" />
    </PositionWrapper>
  ),
  decorators: [],
};

// With onDismiss callback
const WithCallbackDemo = () => {
  const { addToast } = useToast();

  return (
    <Button
      onClick={() =>
        addToast({
          type: 'info',
          title: 'Notification',
          message: 'Click X to see the callback in console.',
          onDismiss: () => console.log('Toast was dismissed!'),
        })
      }
    >
      With onDismiss callback
    </Button>
  );
};

export const WithCallback: StoryObj = {
  render: () => <WithCallbackDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Listen to toast dismissal with the `onDismiss` callback.',
      },
    },
  },
};
