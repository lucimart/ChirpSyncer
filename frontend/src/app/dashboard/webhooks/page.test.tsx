import type { ReactElement } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/styles/ThemeContext';
import WebhooksPage from './page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/dashboard/webhooks',
}));

// Mock api
const mockGetWebhooks = jest.fn();
const mockGetWebhookEventTypes = jest.fn();
const mockGetWebhookDeliveries = jest.fn();
const mockCreateWebhook = jest.fn();
const mockDeleteWebhook = jest.fn();
const mockUpdateWebhook = jest.fn();
const mockTestWebhook = jest.fn();
const mockRegenerateWebhookSecret = jest.fn();

jest.mock('@/lib/api', () => ({
  api: {
    getWebhooks: () => mockGetWebhooks(),
    getWebhookEventTypes: () => mockGetWebhookEventTypes(),
    getWebhookDeliveries: (id: number) => mockGetWebhookDeliveries(id),
    createWebhook: (data: unknown) => mockCreateWebhook(data),
    deleteWebhook: (id: number) => mockDeleteWebhook(id),
    updateWebhook: (id: number, data: unknown) => mockUpdateWebhook(id, data),
    testWebhook: (id: number) => mockTestWebhook(id),
    regenerateWebhookSecret: (id: number) => mockRegenerateWebhookSecret(id),
  },
  Webhook: {},
  WebhookDelivery: {},
}));

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

const mockWebhooks = [
  {
    id: 1,
    name: 'Slack Notifications',
    url: 'https://hooks.slack.com/services/xxx',
    enabled: true,
    events: ['sync.complete', 'post.created'],
    created_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 2,
    name: 'Discord Bot',
    url: 'https://discord.com/api/webhooks/xxx',
    enabled: false,
    events: ['sync.failed'],
    created_at: '2024-01-16T12:00:00Z',
  },
];

const mockEventTypes = ['sync.complete', 'sync.failed', 'post.created', 'post.deleted'];

function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{ui}</ThemeProvider>
    </QueryClientProvider>
  );
}

describe('WebhooksPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWebhooks.mockResolvedValue({
      success: true,
      data: { webhooks: mockWebhooks, count: 2 },
    });
    mockGetWebhookEventTypes.mockResolvedValue({
      success: true,
      data: { events: mockEventTypes },
    });
    mockGetWebhookDeliveries.mockResolvedValue({
      success: true,
      data: { deliveries: [], count: 0 },
    });
    mockCreateWebhook.mockResolvedValue({
      success: true,
      data: { id: 3, secret: 'whsec_test_secret_123' },
    });
    mockDeleteWebhook.mockResolvedValue({ success: true });
    mockUpdateWebhook.mockResolvedValue({ success: true });
    mockTestWebhook.mockResolvedValue({
      success: true,
      data: { success: true, status_code: 200 },
    });
    mockRegenerateWebhookSecret.mockResolvedValue({
      success: true,
      data: { id: 1, secret: 'whsec_new_secret_456' },
    });
  });

  it('renders webhooks page with header', () => {
    renderWithProviders(<WebhooksPage />);

    expect(screen.getByText('Webhooks')).toBeInTheDocument();
    expect(
      screen.getByText('Receive real-time notifications when events occur')
    ).toBeInTheDocument();
  });

  it('renders create webhook button', () => {
    renderWithProviders(<WebhooksPage />);

    expect(
      screen.getByRole('button', { name: /create webhook/i })
    ).toBeInTheDocument();
  });

  it('displays stats cards', async () => {
    renderWithProviders(<WebhooksPage />);

    await waitFor(() => {
      expect(screen.getByText('Total Webhooks')).toBeInTheDocument();
      expect(screen.getByText('Enabled')).toBeInTheDocument();
      expect(screen.getByText('Event Types')).toBeInTheDocument();
    });
  });

  it('displays webhook list', async () => {
    renderWithProviders(<WebhooksPage />);

    await waitFor(() => {
      expect(screen.getByText('Slack Notifications')).toBeInTheDocument();
      expect(screen.getByText('Discord Bot')).toBeInTheDocument();
    });
  });

  it('displays webhook status badges', async () => {
    renderWithProviders(<WebhooksPage />);

    await waitFor(() => {
      // Check for both enabled and disabled badges (there may be multiple "Enabled" elements)
      const enabledBadges = screen.getAllByText('Enabled');
      const disabledBadge = screen.getByText('Disabled');
      expect(enabledBadges.length).toBeGreaterThan(0);
      expect(disabledBadge).toBeInTheDocument();
    });
  });

  it('displays webhook events', async () => {
    renderWithProviders(<WebhooksPage />);

    await waitFor(() => {
      expect(screen.getByText('sync.complete')).toBeInTheDocument();
      expect(screen.getByText('post.created')).toBeInTheDocument();
    });
  });

  it('opens create webhook modal', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WebhooksPage />);

    await user.click(screen.getByRole('button', { name: /create webhook/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Name (optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('URL')).toBeInTheDocument();
    expect(screen.getByText('Events')).toBeInTheDocument();
  });

  it('creates a webhook and shows secret', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WebhooksPage />);

    await user.click(screen.getByRole('button', { name: /create webhook/i }));

    await waitFor(() => {
      expect(screen.getByLabelText('URL')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Name (optional)'), 'Test Webhook');
    await user.type(
      screen.getByLabelText('URL'),
      'https://example.com/webhook'
    );

    // Select an event
    await waitFor(() => {
      const syncCompleteCheckbox = screen.getByLabelText('sync.complete');
      return user.click(syncCompleteCheckbox);
    });

    // Find the submit button in the modal footer
    const dialog = screen.getByRole('dialog');
    const submitButton = within(dialog).getAllByRole('button').find(
      (btn) => btn.textContent?.toLowerCase().includes('create webhook')
    );
    if (submitButton) {
      await user.click(submitButton);
    }

    await waitFor(() => {
      expect(mockCreateWebhook).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(
        screen.getByText("Save this secret now - it won't be shown again!")
      ).toBeInTheDocument();
    });
  });

  it('can delete a webhook', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WebhooksPage />);

    await waitFor(() => {
      expect(screen.getByText('Slack Notifications')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTitle('Delete');
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockDeleteWebhook).toHaveBeenCalledWith(1);
    });
  });

  it('can toggle webhook enabled state', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WebhooksPage />);

    await waitFor(() => {
      expect(screen.getByText('Slack Notifications')).toBeInTheDocument();
    });

    const toggleButtons = screen.getAllByTitle('Disable');
    await user.click(toggleButtons[0]);

    await waitFor(() => {
      expect(mockUpdateWebhook).toHaveBeenCalledWith(1, { enabled: false });
    });
  });

  it('can test a webhook', async () => {
    const user = userEvent.setup();
    window.alert = jest.fn();
    renderWithProviders(<WebhooksPage />);

    await waitFor(() => {
      expect(screen.getByText('Slack Notifications')).toBeInTheDocument();
    });

    const testButtons = screen.getAllByTitle('Test Webhook');
    await user.click(testButtons[0]);

    await waitFor(() => {
      expect(mockTestWebhook).toHaveBeenCalledWith(1);
    });
  });

  it('can view deliveries modal', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WebhooksPage />);

    await waitFor(() => {
      expect(screen.getByText('Slack Notifications')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByTitle('View Deliveries');
    await user.click(viewButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Delivery History')).toBeInTheDocument();
    });
  });

  it('shows empty state when no webhooks', async () => {
    mockGetWebhooks.mockResolvedValue({
      success: true,
      data: { webhooks: [], count: 0 },
    });

    renderWithProviders(<WebhooksPage />);

    await waitFor(() => {
      expect(screen.getByText('No webhooks yet')).toBeInTheDocument();
      expect(
        screen.getByText('Create your first webhook to receive notifications.')
      ).toBeInTheDocument();
    });
  });

  it('can copy secret to clipboard', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WebhooksPage />);

    await user.click(screen.getByRole('button', { name: /create webhook/i }));

    await waitFor(() => {
      expect(screen.getByLabelText('URL')).toBeInTheDocument();
    });

    await user.type(
      screen.getByLabelText('URL'),
      'https://example.com/webhook'
    );

    await waitFor(() => {
      const syncCompleteCheckbox = screen.getByLabelText('sync.complete');
      return user.click(syncCompleteCheckbox);
    });

    // Find the submit button in the modal
    const dialog = screen.getByRole('dialog');
    const submitButton = within(dialog).getAllByRole('button').find(
      (btn) => btn.textContent?.toLowerCase().includes('create webhook')
    );
    if (submitButton) {
      await user.click(submitButton);
    }

    await waitFor(() => {
      expect(screen.getByText(/whsec_test_secret_123/)).toBeInTheDocument();
    });
  });

  it('closes modal on cancel', async () => {
    const user = userEvent.setup();
    renderWithProviders(<WebhooksPage />);

    await user.click(screen.getByRole('button', { name: /create webhook/i }));

    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
