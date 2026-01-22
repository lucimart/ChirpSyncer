import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { DangerConfirm } from './DangerConfirm';
import { Button } from '../Button';

const meta: Meta<typeof DangerConfirm> = {
  title: 'UI/DangerConfirm',
  component: DangerConfirm,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof DangerConfirm>;

const DangerConfirmDemo = (args: React.ComponentProps<typeof DangerConfirm>) => {
  const [isOpen, setIsOpen] = useState(false);
  const [lastReason, setLastReason] = useState<string | null>(null);

  return (
    <div>
      <Button variant="danger" onClick={() => setIsOpen(true)}>
        Delete Account
      </Button>
      {lastReason && (
        <p style={{ marginTop: '16px', color: '#666' }}>
          Last confirmed with reason: "{lastReason}"
        </p>
      )}
      <DangerConfirm
        {...args}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={(reason) => {
          setLastReason(reason);
          setIsOpen(false);
        }}
      />
    </div>
  );
};

export const Default: Story = {
  render: (args) => <DangerConfirmDemo {...args} />,
  args: {
    title: 'Delete Account',
    description:
      'This action will permanently delete your account and all associated data. This cannot be undone.',
    confirmPhrase: 'delete my account',
    requireReason: true,
  },
};

export const WithoutReason: Story = {
  render: (args) => <DangerConfirmDemo {...args} />,
  args: {
    title: 'Reset All Settings',
    description:
      'This will reset all your settings to their default values.',
    confirmPhrase: 'reset settings',
    requireReason: false,
  },
};

export const Loading: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleConfirm = () => {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        setIsOpen(false);
      }, 2000);
    };

    return (
      <div>
        <Button variant="danger" onClick={() => setIsOpen(true)}>
          Delete Project
        </Button>
        <DangerConfirm
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onConfirm={handleConfirm}
          title="Delete Project"
          description="This will delete the project and all its files."
          confirmPhrase="delete project"
          isLoading={isLoading}
        />
      </div>
    );
  },
};

export const CustomPhrase: Story = {
  render: (args) => <DangerConfirmDemo {...args} />,
  args: {
    title: 'Revoke API Keys',
    description:
      'This will immediately revoke all API keys. Any applications using these keys will stop working.',
    confirmPhrase: 'I understand the consequences',
    requireReason: true,
  },
};

export const DataDeletion: Story = {
  render: (args) => <DangerConfirmDemo {...args} />,
  args: {
    title: 'Delete All Sync History',
    description:
      'This will permanently delete your entire sync history including all logs and analytics data.',
    confirmPhrase: 'delete all history',
    requireReason: true,
  },
};
