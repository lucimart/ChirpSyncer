import type { Meta, StoryObj } from '@storybook/react';
import { useEffect } from 'react';
import { CommandPalette } from './CommandPalette';

const meta: Meta<typeof CommandPalette> = {
  title: 'UI/CommandPalette',
  component: CommandPalette,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Global command palette for quick navigation and actions. Press Ctrl+K (or Cmd+K on Mac) to open.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CommandPalette>;

// Helper to show keyboard hint
const KeyboardHint = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    gap: '16px',
    color: '#666',
    fontFamily: 'system-ui, sans-serif',
  }}>
    <p>Press <kbd style={{
      padding: '4px 8px',
      background: '#f0f0f0',
      borderRadius: '4px',
      border: '1px solid #ccc',
    }}>Ctrl</kbd> + <kbd style={{
      padding: '4px 8px',
      background: '#f0f0f0',
      borderRadius: '4px',
      border: '1px solid #ccc',
    }}>K</kbd> to open Command Palette</p>
    <p style={{ fontSize: '14px', color: '#999' }}>
      (or Cmd+K on Mac)
    </p>
  </div>
);

export const Default: Story = {
  render: () => (
    <>
      <KeyboardHint />
      <CommandPalette />
    </>
  ),
};

// Auto-open variant for documentation
const AutoOpenDemo = () => {
  useEffect(() => {
    // Simulate Ctrl+K after mount
    const timer = setTimeout(() => {
      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <KeyboardHint />
      <CommandPalette />
    </>
  );
};

export const AutoOpen: Story = {
  render: () => <AutoOpenDemo />,
  parameters: {
    docs: {
      description: {
        story: 'This story auto-opens the command palette for demonstration purposes.',
      },
    },
  },
};
