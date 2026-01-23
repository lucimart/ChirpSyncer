import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CleanupPreviewPage from './page';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Infinity },
  },
});

// Create a promise-wrapped params object for Next.js 15 compatibility
const createParams = (id: string) => Promise.resolve({ id });

const meta: Meta<typeof CleanupPreviewPage> = {
  title: 'Pages/Dashboard/Cleanup/Preview',
  component: CleanupPreviewPage,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
      navigation: {
        push: () => {},
        back: () => {},
      },
    },
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CleanupPreviewPage>;

export const Default: Story = {
  args: {
    params: createParams('1'),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Back to rules')).toBeInTheDocument();
    await expect(
      canvas.getByText('Preview tweets that match this rule before deleting')
    ).toBeInTheDocument();
  },
};

export const WithPreviewResults: Story = {
  args: {
    params: createParams('1'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Cleanup preview page showing matching tweets ready for deletion.',
      },
    },
  },
};

export const WithSelectedTweets: Story = {
  args: {
    params: createParams('1'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Cleanup preview with some tweets selected for deletion.',
      },
    },
  },
};

export const WithDeleteConfirmation: Story = {
  args: {
    params: createParams('1'),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for content to load then click delete
    const deleteButton = await canvas.findByRole('button', { name: /delete.*tweets/i });
    if (!(deleteButton as HTMLButtonElement).disabled) {
      await userEvent.click(deleteButton);

      await expect(canvas.getByText('Delete Tweets Permanently')).toBeInTheDocument();
    }
  },
};

export const ExecutionInProgress: Story = {
  args: {
    params: createParams('1'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the progress bar during cleanup execution.',
      },
    },
  },
};

export const ExecutionComplete: Story = {
  args: {
    params: createParams('1'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows the completed state after cleanup execution.',
      },
    },
  },
};

export const EmptyPreview: Story = {
  args: {
    params: createParams('999'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Cleanup preview when no tweets match the rule.',
      },
    },
  },
};

export const LoadingState: Story = {
  args: {
    params: createParams('1'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Cleanup preview page in loading state.',
      },
    },
  },
};

export const AgeBasedRule: Story = {
  args: {
    params: createParams('1'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Preview for an age-based cleanup rule (e.g., delete tweets older than 90 days).',
      },
    },
  },
};

export const EngagementBasedRule: Story = {
  args: {
    params: createParams('2'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Preview for an engagement-based cleanup rule (e.g., delete tweets with less than 5 likes).',
      },
    },
  },
};

export const MobileView: Story = {
  args: {
    params: createParams('1'),
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
};

export const TabletView: Story = {
  args: {
    params: createParams('1'),
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
};

export const AccessibilityCheck: Story = {
  args: {
    params: createParams('1'),
  },
  parameters: {
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'button-name', enabled: true },
          { id: 'table-duplicate-name', enabled: true },
        ],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Back button should be accessible
    await expect(canvas.getByText('Back to rules')).toBeInTheDocument();

    // Stats cards should be present
    await expect(canvas.getByText('Matching Tweets')).toBeInTheDocument();
    await expect(canvas.getByText('Selected')).toBeInTheDocument();
    await expect(canvas.getByText('Rule Criteria')).toBeInTheDocument();
  },
};
