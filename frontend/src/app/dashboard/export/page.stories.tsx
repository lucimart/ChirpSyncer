import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ExportPage from './page';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Infinity },
  },
});

const meta: Meta<typeof ExportPage> = {
  title: 'Pages/Dashboard/Export',
  component: ExportPage,
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
type Story = StoryObj<typeof ExportPage>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText('Export Data')).toBeInTheDocument();
    await expect(canvas.getByText('Export Format')).toBeInTheDocument();
    await expect(canvas.getByText('JSON')).toBeInTheDocument();
    await expect(canvas.getByText('CSV')).toBeInTheDocument();
    await expect(canvas.getByText('Plain Text')).toBeInTheDocument();
  },
};

export const JsonSelected: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // JSON is selected by default
    await expect(canvas.getByText('JSON')).toBeInTheDocument();
    await expect(
      canvas.getByText('Machine-readable format, includes all metadata')
    ).toBeInTheDocument();
  },
};

export const CsvSelected: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const csvText = canvas.getByText('CSV');
    const csvCard = csvText.closest('div');
    if (csvCard) {
      await userEvent.click(csvCard);
    }
  },
};

export const WithOptionsModified: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Change date range
    const dateRangeSelect = canvas.getByLabelText('Date Range');
    await userEvent.selectOptions(dateRangeSelect, 'month');

    // Change platform
    const platformSelect = canvas.getByLabelText('Platform');
    await userEvent.selectOptions(platformSelect, 'twitter');

    // Toggle deleted posts
    const deletedCheckbox = canvas.getByLabelText('Deleted Posts History');
    await userEvent.click(deletedCheckbox);

    await expect(dateRangeSelect).toHaveValue('month');
    await expect(platformSelect).toHaveValue('twitter');
    await expect(deletedCheckbox).toBeChecked();
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

    await expect(canvas.getByLabelText('Date Range')).toBeInTheDocument();
    await expect(canvas.getByLabelText('Platform')).toBeInTheDocument();
    await expect(canvas.getByLabelText('Media URLs')).toBeInTheDocument();
    await expect(
      canvas.getByRole('button', { name: /start export/i })
    ).toBeEnabled();
  },
};
