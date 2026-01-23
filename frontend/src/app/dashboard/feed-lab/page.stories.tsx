import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import FeedLabPage from './page';

const meta: Meta<typeof FeedLabPage> = {
  title: 'Pages/Dashboard/FeedLab',
  component: FeedLabPage,
  parameters: {
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
      navigation: {
        push: () => {},
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '24px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FeedLabPage>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify page header is present
    await expect(canvas.getByText('Feed Lab')).toBeInTheDocument();

    // Verify tabs are present
    await expect(canvas.getByText('My Rules')).toBeInTheDocument();
    await expect(canvas.getByText('Create Rule')).toBeInTheDocument();
    await expect(canvas.getByText('Preview')).toBeInTheDocument();
    await expect(canvas.getByText('Recipes')).toBeInTheDocument();
  },
};

export const Loading: Story = {
  parameters: {
    mockData: {
      feedRules: { isLoading: true },
    },
    docs: {
      description: {
        story: 'Feed Lab page in loading state while fetching rules.',
      },
    },
  },
};

export const MobileView: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Feed Lab page on mobile devices with responsive tab navigation.',
      },
    },
  },
};

export const TabletView: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
};

export const CreateRuleTab: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Switch to Create Rule tab
    const createTab = canvas.getByText('Create Rule');
    await userEvent.click(createTab);

    // Verify create rule form is shown
    await expect(canvas.getByText('Create New Rule')).toBeInTheDocument();
  },
};

export const PreviewTab: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Switch to Preview tab
    const previewTab = canvas.getByText('Preview');
    await userEvent.click(previewTab);

    // Verify preview section is shown
    await expect(canvas.getByText('Feed Preview')).toBeInTheDocument();
  },
};

export const RecipesTab: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Switch to Recipes tab
    const recipesTab = canvas.getByText('Recipes');
    await userEvent.click(recipesTab);

    // Verify recipes gallery is shown
    await expect(canvas.getByText('Recipe Templates')).toBeInTheDocument();
  },
};

export const AccessibilityCheck: Story = {
  parameters: {
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: true },
          { id: 'label', enabled: true },
          { id: 'button-name', enabled: true },
        ],
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify tabs are keyboard accessible
    const tabs = canvas.getAllByRole('tab');
    await expect(tabs.length).toBeGreaterThanOrEqual(4);
  },
};
