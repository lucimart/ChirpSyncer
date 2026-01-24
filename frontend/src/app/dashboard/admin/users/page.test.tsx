import type { ReactElement } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/styles/ThemeContext';
import AdminUsersPage from './page';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/dashboard/admin/users',
}));

// Mock api
const mockGetAdminUsers = jest.fn();
const mockDeleteAdminUser = jest.fn();
const mockToggleUserActive = jest.fn();
const mockToggleUserAdmin = jest.fn();

jest.mock('@/lib/api', () => ({
  api: {
    getAdminUsers: (params: unknown) => mockGetAdminUsers(params),
    deleteAdminUser: (id: string) => mockDeleteAdminUser(id),
    toggleUserActive: (id: string) => mockToggleUserActive(id),
    toggleUserAdmin: (id: string) => mockToggleUserAdmin(id),
  },
}));

const mockUsers = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@example.com',
    is_active: true,
    is_admin: true,
    created_at: '2024-01-01T00:00:00Z',
    last_login: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    username: 'testuser',
    email: 'test@example.com',
    is_active: true,
    is_admin: false,
    created_at: '2024-01-05T00:00:00Z',
    last_login: null,
  },
  {
    id: '3',
    username: 'inactive',
    email: 'inactive@example.com',
    is_active: false,
    is_admin: false,
    created_at: '2024-01-10T00:00:00Z',
    last_login: '2024-01-12T10:00:00Z',
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

describe('AdminUsersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAdminUsers.mockResolvedValue({
      success: true,
      data: mockUsers,
    });
    mockDeleteAdminUser.mockResolvedValue({ success: true });
    mockToggleUserActive.mockResolvedValue({
      success: true,
      data: { ...mockUsers[1], is_active: false },
    });
    mockToggleUserAdmin.mockResolvedValue({
      success: true,
      data: { ...mockUsers[1], is_admin: true },
    });
  });

  it('renders page header', () => {
    renderWithProviders(<AdminUsersPage />);

    expect(screen.getByText('User Management')).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderWithProviders(<AdminUsersPage />);

    expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument();
  });

  it('displays users in table', async () => {
    renderWithProviders(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('inactive')).toBeInTheDocument();
    });
  });

  it('displays user emails', async () => {
    renderWithProviders(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText('admin@example.com')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  it('displays status badges', async () => {
    renderWithProviders(<AdminUsersPage />);

    await waitFor(() => {
      const activeBadges = screen.getAllByText('Active');
      const inactiveBadge = screen.getByText('Inactive');
      expect(activeBadges.length).toBe(2);
      expect(inactiveBadge).toBeInTheDocument();
    });
  });

  it('displays role badges', async () => {
    renderWithProviders(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText(/Admin/)).toBeInTheDocument();
      const userBadges = screen.getAllByText('User');
      expect(userBadges.length).toBe(2);
    });
  });

  it('displays formatted dates', async () => {
    renderWithProviders(<AdminUsersPage />);

    await waitFor(() => {
      // Check for date format (depends on locale)
      expect(screen.getByText('Never')).toBeInTheDocument(); // For null last_login
    });
  });

  it('filters users by search', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search users...');
    await user.type(searchInput, 'test');

    await waitFor(() => {
      expect(mockGetAdminUsers).toHaveBeenCalledWith({ search: 'test' });
    });
  });

  it('opens delete confirmation modal', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument();
    });

    // Find delete buttons by title - they should be in the DOM after data loads
    await waitFor(() => {
      expect(screen.getAllByTitle('Delete user').length).toBeGreaterThan(0);
    });

    const deleteButtons = screen.getAllByTitle('Delete user');
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete user/)).toBeInTheDocument();
    });
  });

  it('closes delete modal on cancel', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getAllByTitle('Delete user').length).toBeGreaterThan(0);
    });

    const deleteButtons = screen.getAllByTitle('Delete user');
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('deletes user on confirmation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getAllByTitle('Delete user').length).toBeGreaterThan(0);
    });

    const deleteButtons = screen.getAllByTitle('Delete user');
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog');
    const confirmButton = within(dialog).getByRole('button', { name: /delete user/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockDeleteAdminUser).toHaveBeenCalledWith('1');
    });
  });

  it('toggles user active status', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    const deactivateButtons = screen.getAllByTitle('Deactivate user');
    await user.click(deactivateButtons[0]);

    await waitFor(() => {
      expect(mockToggleUserActive).toHaveBeenCalledWith('1');
    });
  });

  it('toggles user admin status', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    const makeAdminButtons = screen.getAllByTitle('Make admin');
    await user.click(makeAdminButtons[0]);

    await waitFor(() => {
      expect(mockToggleUserAdmin).toHaveBeenCalled();
    });
  });

  it('shows loading state', () => {
    mockGetAdminUsers.mockReturnValue(new Promise(() => {})); // Never resolves
    renderWithProviders(<AdminUsersPage />);

    expect(screen.getByText('Loading users...')).toBeInTheDocument();
  });

  it('shows error state', async () => {
    mockGetAdminUsers.mockResolvedValue({
      success: false,
      error: 'Failed to fetch users',
    });

    renderWithProviders(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText(/Error loading users/)).toBeInTheDocument();
    });
  });

  it('shows empty state when no users', async () => {
    mockGetAdminUsers.mockResolvedValue({
      success: true,
      data: [],
    });

    renderWithProviders(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
  });

  it('shows filtered empty state', async () => {
    mockGetAdminUsers.mockResolvedValue({
      success: true,
      data: [],
    });

    const user = userEvent.setup();
    renderWithProviders(<AdminUsersPage />);

    const searchInput = screen.getByPlaceholderText('Search users...');
    await user.type(searchInput, 'nonexistent');

    await waitFor(() => {
      expect(screen.getByText(/No users found matching "nonexistent"/)).toBeInTheDocument();
    });
  });

  it('has accessible table headers', async () => {
    renderWithProviders(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText('Username')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Role')).toBeInTheDocument();
      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('Last Login')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });
  });

  it('has accessible action buttons with titles', async () => {
    renderWithProviders(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument();
    });

    expect(screen.getAllByTitle('Deactivate user').length).toBeGreaterThan(0);
    expect(screen.getAllByTitle('Delete user').length).toBeGreaterThan(0);
  });
});
