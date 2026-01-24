import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { NostrConnect } from './NostrConnect';

const meta = {
  title: 'Connectors/NostrConnect',
  component: NostrConnect,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
A wizard-style component for connecting to Nostr, designed for users who may not be familiar with the protocol.

## Features
- **Educational intro**: Explains what Nostr is in simple terms
- **Two paths**: "I'm new" (generate keys) vs "I have an account" (import keys)
- **App-specific instructions**: Step-by-step guides for Damus, Amethyst, Primal
- **Visual relay selection**: Easy-to-use checkboxes with recommendations
- **Key validation**: Real-time feedback on key format
- **Security reminders**: Warns users to back up their private key
        `,
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 480, padding: 24, background: '#fff', borderRadius: 12 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NostrConnect>;

export default meta;
type Story = StoryObj<typeof meta>;

// Interactive wrapper component
function NostrConnectDemo() {
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [connected, setConnected] = useState(false);

  const handleConnect = () => {
    console.log('Connecting with credentials:', credentials);
    // Simulate connection
    setTimeout(() => setConnected(true), 1500);
  };

  if (connected) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <h3 style={{ color: '#22c55e' }}>Connected to Nostr!</h3>
        <p>Your identity is ready to sync.</p>
        <button onClick={() => setConnected(false)}>Reset Demo</button>
      </div>
    );
  }

  return (
    <NostrConnect
      credentials={credentials}
      onCredentialsChange={setCredentials}
      onConnect={handleConnect}
      isConnecting={false}
    />
  );
}

export const Default: Story = {
  args: {
    credentials: {},
    onCredentialsChange: () => {},
    onConnect: () => {},
    isConnecting: false,
  },
  render: (args) => <NostrConnectDemo />,
};

export const WithExistingKeys: Story = {
  args: {
    credentials: {
      private_key: 'nsec1vl029mgpspedva04g90vltkh6fvh240zqtv9k0t9af8935ke9laqsnlfe5',
    },
    onCredentialsChange: () => {},
    onConnect: () => {},
    isConnecting: false,
  },
};

export const Connecting: Story = {
  args: {
    credentials: {
      private_key: 'nsec1vl029mgpspedva04g90vltkh6fvh240zqtv9k0t9af8935ke9laqsnlfe5',
      relays: 'wss://relay.damus.io,wss://nos.lol',
    },
    onCredentialsChange: () => {},
    onConnect: () => {},
    isConnecting: true,
  },
};
