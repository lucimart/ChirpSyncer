import type { Meta, StoryObj } from '@storybook/react';
import { OnboardingChecklist } from './OnboardingChecklist';
import { OnboardingProvider, OnboardingContext } from '../OnboardingProvider';
import type { OnboardingContextType } from '../OnboardingProvider';

interface StoryArgs {
  mockContext?: OnboardingContextType;
}

const meta: Meta<typeof OnboardingChecklist> = {
  title: 'Components/Onboarding/OnboardingChecklist',
  component: OnboardingChecklist,
  parameters: {
    layout: 'padded',
    nextjs: {
      appDirectory: true,
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story, context) => {
      const mockContextValue = (context.args as StoryArgs | undefined)?.mockContext;
      if (mockContextValue) {
        return (
          <OnboardingContext.Provider value={mockContextValue}>
            <div style={{ maxWidth: 400 }}>
              <Story />
            </div>
          </OnboardingContext.Provider>
        );
      }
      return (
        <OnboardingProvider>
          <div style={{ maxWidth: 400 }}>
            <Story />
          </div>
        </OnboardingProvider>
      );
    },
  ],
};

export default meta;

type Story = StoryObj<typeof OnboardingChecklist> & { args?: StoryArgs };

const createMockContext = (overrides: Partial<OnboardingContextType>): OnboardingContextType => ({
  steps: [
    {
      id: 'connect',
      title: 'Connect your accounts',
      description: 'Link your Twitter and Bluesky accounts to start syncing.',
      status: 'pending',
      icon: 'link',
      targetRoute: '/dashboard/credentials',
    },
    {
      id: 'sync',
      title: 'Run your first sync',
      description: 'Synchronize posts between your connected platforms.',
      status: 'pending',
      icon: 'sync',
      targetRoute: '/dashboard/sync',
    },
    {
      id: 'rules',
      title: 'Create a filter rule',
      description: 'Set up rules to control which posts get synced.',
      status: 'pending',
      icon: 'rule',
      targetRoute: '/dashboard/feed-lab',
    },
    {
      id: 'schedule',
      title: 'Schedule a post',
      description: 'Plan your content with our AI-powered scheduler.',
      status: 'pending',
      icon: 'calendar',
      targetRoute: '/dashboard/scheduler',
    },
    {
      id: 'analytics',
      title: 'View analytics',
      description: 'Track engagement and optimize your posting strategy.',
      status: 'pending',
      icon: 'chart',
      targetRoute: '/dashboard/analytics',
    },
  ],
  currentStep: null,
  progress: 0,
  isComplete: false,
  completeStep: () => {},
  skipOnboarding: () => {},
  ...overrides,
});

export const Default: Story = {
  args: {
    mockContext: createMockContext({
      progress: 0,
      currentStep: {
        id: 'connect',
        title: 'Connect your accounts',
        description: 'Link your Twitter and Bluesky accounts to start syncing.',
        status: 'current',
        icon: 'link',
        targetRoute: '/dashboard/credentials',
      },
      steps: [
        {
          id: 'connect',
          title: 'Connect your accounts',
          description: 'Link your Twitter and Bluesky accounts to start syncing.',
          status: 'current',
          icon: 'link',
          targetRoute: '/dashboard/credentials',
        },
        {
          id: 'sync',
          title: 'Run your first sync',
          description: 'Synchronize posts between your connected platforms.',
          status: 'pending',
          icon: 'sync',
          targetRoute: '/dashboard/sync',
        },
        {
          id: 'rules',
          title: 'Create a filter rule',
          description: 'Set up rules to control which posts get synced.',
          status: 'pending',
          icon: 'rule',
          targetRoute: '/dashboard/feed-lab',
        },
        {
          id: 'schedule',
          title: 'Schedule a post',
          description: 'Plan your content with our AI-powered scheduler.',
          status: 'pending',
          icon: 'calendar',
          targetRoute: '/dashboard/scheduler',
        },
        {
          id: 'analytics',
          title: 'View analytics',
          description: 'Track engagement and optimize your posting strategy.',
          status: 'pending',
          icon: 'chart',
          targetRoute: '/dashboard/analytics',
        },
      ],
    }),
  } as any,
};

export const PartialProgress: Story = {
  args: {
    mockContext: createMockContext({
      progress: 40,
      currentStep: {
        id: 'rules',
        title: 'Create a filter rule',
        description: 'Set up rules to control which posts get synced.',
        status: 'current',
        icon: 'rule',
        targetRoute: '/dashboard/feed-lab',
      },
      steps: [
        {
          id: 'connect',
          title: 'Connect your accounts',
          description: 'Link your Twitter and Bluesky accounts to start syncing.',
          status: 'completed',
          icon: 'link',
          targetRoute: '/dashboard/credentials',
        },
        {
          id: 'sync',
          title: 'Run your first sync',
          description: 'Synchronize posts between your connected platforms.',
          status: 'completed',
          icon: 'sync',
          targetRoute: '/dashboard/sync',
        },
        {
          id: 'rules',
          title: 'Create a filter rule',
          description: 'Set up rules to control which posts get synced.',
          status: 'current',
          icon: 'rule',
          targetRoute: '/dashboard/feed-lab',
        },
        {
          id: 'schedule',
          title: 'Schedule a post',
          description: 'Plan your content with our AI-powered scheduler.',
          status: 'pending',
          icon: 'calendar',
          targetRoute: '/dashboard/scheduler',
        },
        {
          id: 'analytics',
          title: 'View analytics',
          description: 'Track engagement and optimize your posting strategy.',
          status: 'pending',
          icon: 'chart',
          targetRoute: '/dashboard/analytics',
        },
      ],
    }),
  } as any,
};

export const NearComplete: Story = {
  args: {
    mockContext: createMockContext({
      progress: 80,
      currentStep: {
        id: 'analytics',
        title: 'View analytics',
        description: 'Track engagement and optimize your posting strategy.',
        status: 'current',
        icon: 'chart',
        targetRoute: '/dashboard/analytics',
      },
      steps: [
        {
          id: 'connect',
          title: 'Connect your accounts',
          description: 'Link your Twitter and Bluesky accounts to start syncing.',
          status: 'completed',
          icon: 'link',
          targetRoute: '/dashboard/credentials',
        },
        {
          id: 'sync',
          title: 'Run your first sync',
          description: 'Synchronize posts between your connected platforms.',
          status: 'completed',
          icon: 'sync',
          targetRoute: '/dashboard/sync',
        },
        {
          id: 'rules',
          title: 'Create a filter rule',
          description: 'Set up rules to control which posts get synced.',
          status: 'completed',
          icon: 'rule',
          targetRoute: '/dashboard/feed-lab',
        },
        {
          id: 'schedule',
          title: 'Schedule a post',
          description: 'Plan your content with our AI-powered scheduler.',
          status: 'completed',
          icon: 'calendar',
          targetRoute: '/dashboard/scheduler',
        },
        {
          id: 'analytics',
          title: 'View analytics',
          description: 'Track engagement and optimize your posting strategy.',
          status: 'current',
          icon: 'chart',
          targetRoute: '/dashboard/analytics',
        },
      ],
    }),
  } as any,
};

export const Completed: Story = {
  args: {
    mockContext: createMockContext({
      progress: 100,
      isComplete: true,
      currentStep: null,
      steps: [
        {
          id: 'connect',
          title: 'Connect your accounts',
          description: 'Link your Twitter and Bluesky accounts to start syncing.',
          status: 'completed',
          icon: 'link',
          targetRoute: '/dashboard/credentials',
        },
        {
          id: 'sync',
          title: 'Run your first sync',
          description: 'Synchronize posts between your connected platforms.',
          status: 'completed',
          icon: 'sync',
          targetRoute: '/dashboard/sync',
        },
        {
          id: 'rules',
          title: 'Create a filter rule',
          description: 'Set up rules to control which posts get synced.',
          status: 'completed',
          icon: 'rule',
          targetRoute: '/dashboard/feed-lab',
        },
        {
          id: 'schedule',
          title: 'Schedule a post',
          description: 'Plan your content with our AI-powered scheduler.',
          status: 'completed',
          icon: 'calendar',
          targetRoute: '/dashboard/scheduler',
        },
        {
          id: 'analytics',
          title: 'View analytics',
          description: 'Track engagement and optimize your posting strategy.',
          status: 'completed',
          icon: 'chart',
          targetRoute: '/dashboard/analytics',
        },
      ],
    }),
  } as any,
};
