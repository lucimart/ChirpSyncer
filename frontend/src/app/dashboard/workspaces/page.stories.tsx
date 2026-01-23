import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WorkspacesPage from './page';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Infinity },
  },
});

const meta: Meta<typeof WorkspacesPage> = {
  title: 'Pages/Dashboard/Workspaces',
  component: WorkspacesPage,
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
      <QueryClientProvider client={queryClient}>
        <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof WorkspacesPage>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Workspaces')).toBeInTheDocument();
    await expect(
      canvas.getByText(
        'Collaborate with your team, share credentials, and manage roles.'
      )
    ).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: /new workspace/i })
    ).toBeInTheDocument();
  },
};

export const SettingsTab: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Settings')).toBeInTheDocument();
    await expect(canvas.getByText('Workspace Settings')).toBeInTheDocument();
  },
};

export const MembersTab: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByText('Members'));

    // Members tab should be active
  },
};

export const CredentialsTab: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByText('Shared Credentials'));

    // Credentials tab should be active
  },
};

export const ActivityTab: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByText('Activity'));

    // Activity tab should be active
  },
};

export const WithCreateModal: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      canvas.getByRole('button', { name: /new workspace/i })
    );

    await expect(canvas.getByText('Create Workspace')).toBeInTheDocument();
    await expect(canvas.getByLabelText('Workspace Name')).toBeInTheDocument();
    await expect(canvas.getByLabelText('Workspace Type')).toBeInTheDocument();
  },
};

export const FilledModalForm: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      canvas.getByRole('button', { name: /new workspace/i })
    );

    await userEvent.type(
      canvas.getByLabelText('Workspace Name'),
      'Marketing Team'
    );

    await expect(canvas.getByLabelText('Workspace Name')).toHaveValue(
      'Marketing Team'
    );
  },
};

export const MobileView: Story = {
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
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

    await expect(
      canvas.getByRole('button', { name: /new workspace/i })
    ).toBeEnabled();

    // Check tab navigation is accessible
    await expect(canvas.getByText('Settings')).toBeInTheDocument();
    await expect(canvas.getByText('Members')).toBeInTheDocument();
    await expect(canvas.getByText('Shared Credentials')).toBeInTheDocument();
    await expect(canvas.getByText('Activity')).toBeInTheDocument();
  },
};
