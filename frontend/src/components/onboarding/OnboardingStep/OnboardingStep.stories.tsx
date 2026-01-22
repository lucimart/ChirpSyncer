import type { Meta, StoryObj } from '@storybook/react';
import styled from 'styled-components';
import { OnboardingStep } from './OnboardingStep';

const meta: Meta<typeof OnboardingStep> = {
  title: 'Components/Onboarding/OnboardingStep',
  component: OnboardingStep,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['pending', 'current', 'completed'],
    },
    icon: {
      control: 'select',
      options: ['link', 'sync', 'rule', 'calendar', 'chart'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof OnboardingStep>;

const Container = styled.div`
  max-width: 400px;
`;

export const Default: Story = {
  args: {
    id: 'connect',
    title: 'Connect your accounts',
    description: 'Link your Twitter and Bluesky accounts to start syncing.',
    status: 'pending',
    icon: 'link',
  },
  render: (args) => (
    <Container>
      <OnboardingStep {...args} />
    </Container>
  ),
};

export const Current: Story = {
  args: {
    id: 'sync',
    title: 'Run your first sync',
    description: 'Synchronize posts between your connected platforms.',
    status: 'current',
    icon: 'sync',
    isCurrent: true,
  },
  render: (args) => (
    <Container>
      <OnboardingStep {...args} />
    </Container>
  ),
};

export const Completed: Story = {
  args: {
    id: 'connect',
    title: 'Connect your accounts',
    description: 'Link your Twitter and Bluesky accounts to start syncing.',
    status: 'completed',
    icon: 'link',
  },
  render: (args) => (
    <Container>
      <OnboardingStep {...args} />
    </Container>
  ),
};

export const Clickable: Story = {
  args: {
    id: 'rules',
    title: 'Create a filter rule',
    description: 'Set up rules to control which posts get synced.',
    status: 'pending',
    icon: 'rule',
    onClick: () => alert('Step clicked!'),
  },
  render: (args) => (
    <Container>
      <OnboardingStep {...args} />
    </Container>
  ),
};

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 400px;
`;

export const AllStates: Story = {
  render: () => (
    <Stack>
      <OnboardingStep
        id="connect"
        title="Connect your accounts"
        description="Link your Twitter and Bluesky accounts to start syncing."
        status="completed"
        icon="link"
      />
      <OnboardingStep
        id="sync"
        title="Run your first sync"
        description="Synchronize posts between your connected platforms."
        status="current"
        icon="sync"
        isCurrent
        onClick={() => {}}
      />
      <OnboardingStep
        id="rules"
        title="Create a filter rule"
        description="Set up rules to control which posts get synced."
        status="pending"
        icon="rule"
        onClick={() => {}}
      />
      <OnboardingStep
        id="schedule"
        title="Schedule a post"
        description="Plan your content with our AI-powered scheduler."
        status="pending"
        icon="calendar"
        onClick={() => {}}
      />
      <OnboardingStep
        id="analytics"
        title="View analytics"
        description="Track engagement and optimize your posting strategy."
        status="pending"
        icon="chart"
      />
    </Stack>
  ),
};

export const AllIcons: Story = {
  render: () => (
    <Stack>
      <OnboardingStep
        id="link"
        title="Link icon"
        description="Used for connection steps"
        status="pending"
        icon="link"
      />
      <OnboardingStep
        id="sync"
        title="Sync icon"
        description="Used for synchronization steps"
        status="pending"
        icon="sync"
      />
      <OnboardingStep
        id="rule"
        title="Rule icon"
        description="Used for filter/rule steps"
        status="pending"
        icon="rule"
      />
      <OnboardingStep
        id="calendar"
        title="Calendar icon"
        description="Used for scheduling steps"
        status="pending"
        icon="calendar"
      />
      <OnboardingStep
        id="chart"
        title="Chart icon"
        description="Used for analytics steps"
        status="pending"
        icon="chart"
      />
    </Stack>
  ),
};
