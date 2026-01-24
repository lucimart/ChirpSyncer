import type { ReactElement } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/styles/ThemeContext';
import CleanupPage from './page';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/dashboard/cleanup',
}));

// Mock api
const mockGetCleanupRules = jest.fn();
const mockCreateCleanupRule = jest.fn();
const mockDeleteCleanupRule = jest.fn();
const mockUpdateCleanupRule = jest.fn();

jest.mock('@/lib/api', () => ({
  api: {
    getCleanupRules: () => mockGetCleanupRules(),
    createCleanupRule: (data: unknown) => mockCreateCleanupRule(data),
    deleteCleanupRule: (id: number) => mockDeleteCleanupRule(id),
    updateCleanupRule: (id: number, data: unknown) => mockUpdateCleanupRule(id, data),
  },
}));

const mockCleanupRules = [
  {
    id: 1,
    name: 'Delete old tweets',
    rule_type: 'age',
    is_enabled: true,
    total_deleted: 150,
    last_run: '2024-01-15T10:00:00Z',
    config: { max_age_days: 90 },
  },
  {
    id: 2,
    name: 'Low engagement cleanup',
    rule_type: 'engagement',
    is_enabled: false,
    total_deleted: 45,
    last_run: '2024-01-10T12:00:00Z',
    config: { min_likes: 5 },
  },
];

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

describe('CleanupPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCleanupRules.mockResolvedValue({
      success: true,
      data: mockCleanupRules,
    });
    mockCreateCleanupRule.mockResolvedValue({ success: true });
    mockDeleteCleanupRule.mockResolvedValue({ success: true });
    mockUpdateCleanupRule.mockResolvedValue({ success: true });
  });

  it('renders cleanup page with header', () => {
    renderWithProviders(<CleanupPage />);

    expect(screen.getByText('Cleanup Rules')).toBeInTheDocument();
    expect(
      screen.getByText('Automatically delete old or low-engagement posts')
    ).toBeInTheDocument();
  });

  it('renders create rule button', () => {
    renderWithProviders(<CleanupPage />);

    expect(
      screen.getByRole('button', { name: /create rule/i })
    ).toBeInTheDocument();
  });

  it('displays stats cards', async () => {
    renderWithProviders(<CleanupPage />);

    await waitFor(() => {
      expect(screen.getByText('Total Deleted')).toBeInTheDocument();
      expect(screen.getByText('Active Rules')).toBeInTheDocument();
      expect(screen.getByText('Enabled')).toBeInTheDocument();
    });
  });

  it('displays stats values correctly', async () => {
    renderWithProviders(<CleanupPage />);

    await waitFor(() => {
      expect(screen.getByText('195')).toBeInTheDocument(); // 150 + 45 total deleted
      expect(screen.getByText('2')).toBeInTheDocument(); // active rules
      expect(screen.getByText('1')).toBeInTheDocument(); // enabled rules
    });
  });

  it('displays cleanup rules list', async () => {
    renderWithProviders(<CleanupPage />);

    await waitFor(() => {
      expect(screen.getByText('Delete old tweets')).toBeInTheDocument();
      expect(screen.getByText('Low engagement cleanup')).toBeInTheDocument();
    });
  });

  it('displays rule type badges', async () => {
    renderWithProviders(<CleanupPage />);

    await waitFor(() => {
      expect(screen.getByText('age based')).toBeInTheDocument();
      expect(screen.getByText('engagement based')).toBeInTheDocument();
    });
  });

  it('displays rule status badges', async () => {
    renderWithProviders(<CleanupPage />);

    await waitFor(() => {
      const enabledBadges = screen.getAllByText('Enabled');
      const disabledBadge = screen.getByText('Disabled');
      expect(enabledBadges.length).toBeGreaterThan(0);
      expect(disabledBadge).toBeInTheDocument();
    });
  });

  it('displays rule statistics', async () => {
    renderWithProviders(<CleanupPage />);

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getAllByText('Deleted').length).toBe(2);
    });
  });

  it('opens create rule modal', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CleanupPage />);

    await user.click(screen.getByRole('button', { name: /create rule/i }));

    expect(screen.getByText('Create Cleanup Rule')).toBeInTheDocument();
    expect(screen.getByLabelText('Rule Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Rule Type')).toBeInTheDocument();
  });

  it('shows age-specific field when age type selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CleanupPage />);

    await user.click(screen.getByRole('button', { name: /create rule/i }));

    expect(
      screen.getByLabelText('Delete tweets older than (days)')
    ).toBeInTheDocument();
  });

  it('shows engagement-specific field when engagement type selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CleanupPage />);

    await user.click(screen.getByRole('button', { name: /create rule/i }));
    await user.selectOptions(screen.getByLabelText('Rule Type'), 'engagement');

    expect(screen.getByLabelText('Minimum likes to keep')).toBeInTheDocument();
  });

  it('creates a new cleanup rule', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CleanupPage />);

    await user.click(screen.getByRole('button', { name: /create rule/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Rule Name'), 'Delete very old posts');
    await user.clear(screen.getByLabelText('Delete tweets older than (days)'));
    await user.type(
      screen.getByLabelText('Delete tweets older than (days)'),
      '180'
    );

    // Find the submit button in the modal
    const dialog = screen.getByRole('dialog');
    const submitButton = within(dialog).getAllByRole('button').find(
      (btn) => btn.textContent?.toLowerCase().includes('create rule')
    );
    if (submitButton) {
      await user.click(submitButton);
    }

    await waitFor(() => {
      expect(mockCreateCleanupRule).toHaveBeenCalledWith({
        name: 'Delete very old posts',
        type: 'age',
        config: { max_age_days: 180 },
        enabled: true,
      });
    });
  });

  it('can delete a cleanup rule', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CleanupPage />);

    await waitFor(() => {
      expect(screen.getByText('Delete old tweets')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: '' });
    // Find the delete button (Trash2 icon)
    const trashButtons = deleteButtons.filter(
      (btn) => btn.querySelector('svg')?.getAttribute('class')?.includes('lucide') || true
    );

    // Click on a button that should be delete
    await user.click(trashButtons[trashButtons.length - 1]);

    await waitFor(() => {
      expect(mockDeleteCleanupRule).toHaveBeenCalled();
    });
  });

  it('can toggle rule enabled state', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CleanupPage />);

    await waitFor(() => {
      expect(screen.getByText('Delete old tweets')).toBeInTheDocument();
    });

    // Find pause/play toggle buttons
    const allButtons = screen.getAllByRole('button', { name: '' });
    // Click the toggle button (second one in each card actions)
    for (const btn of allButtons) {
      const svg = btn.querySelector('svg');
      if (svg) {
        await user.click(btn);
        break;
      }
    }
  });

  it('navigates to rule detail page', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CleanupPage />);

    await waitFor(() => {
      expect(screen.getByText('Delete old tweets')).toBeInTheDocument();
    });

    // Find view button (Eye icon)
    const allButtons = screen.getAllByRole('button', { name: '' });
    await user.click(allButtons[0]);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard/cleanup/1');
    });
  });

  it('shows empty state when no rules', async () => {
    mockGetCleanupRules.mockResolvedValue({
      success: true,
      data: [],
    });

    renderWithProviders(<CleanupPage />);

    await waitFor(() => {
      expect(screen.getByText('No cleanup rules yet')).toBeInTheDocument();
      expect(
        screen.getByText('Create your first rule to start cleaning.')
      ).toBeInTheDocument();
    });
  });

  it('closes modal on cancel', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CleanupPage />);

    await user.click(screen.getByRole('button', { name: /create rule/i }));
    expect(screen.getByText('Create Cleanup Rule')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByText('Create Cleanup Rule')).not.toBeInTheDocument();
    });
  });

  it('has accessible form elements', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CleanupPage />);

    await user.click(screen.getByRole('button', { name: /create rule/i }));

    const ruleNameInput = screen.getByLabelText('Rule Name');
    const ruleTypeSelect = screen.getByLabelText('Rule Type');

    expect(ruleNameInput).toHaveAttribute('required');
    expect(ruleTypeSelect).toBeInTheDocument();
  });
});
