import type { ReactElement } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/styles/ThemeContext';
import { NotificationBell } from '../NotificationBell';

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

function renderWithProviders(ui: ReactElement) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{ui}</ThemeProvider>
    </QueryClientProvider>
  );
}

const mockNotifications = [
  {
    id: 'notif-1',
    type: 'sync_completed',
    category: 'sync' as const,
    title: 'Sync Completed',
    message: 'Successfully synced 15 posts.',
    body: 'Successfully synced 15 posts.',
    priority: 2 as const,
    read: false,
    is_read: false,
    timestamp: '2024-01-15T10:30:00Z',
    created_at: '2024-01-15T10:30:00Z',
    severity: 'success' as const,
  },
  {
    id: 'notif-2',
    type: 'security_alert',
    category: 'security' as const,
    title: 'New Login',
    message: 'A new login was detected.',
    body: 'A new login was detected.',
    priority: 3 as const,
    read: false,
    is_read: false,
    timestamp: '2024-01-15T09:00:00Z',
    created_at: '2024-01-15T09:00:00Z',
    severity: 'warning' as const,
  },
  {
    id: 'notif-3',
    type: 'engagement',
    category: 'engagement' as const,
    title: 'Post Trending',
    message: 'Your post is gaining traction!',
    body: 'Your post is gaining traction!',
    priority: 2 as const,
    read: true,
    is_read: true,
    timestamp: '2024-01-14T15:00:00Z',
    created_at: '2024-01-14T15:00:00Z',
    severity: 'info' as const,
  },
];

// Mock the useNotifications hook
jest.mock('@/lib/notifications', () => ({
  useNotifications: jest.fn(() => ({
    data: {
      notifications: mockNotifications,
      total: 3,
      unread_count: 2,
      page: 1,
      has_more: false,
    },
    isLoading: false,
    error: null,
  })),
  useMarkNotificationRead: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
}));

describe('NotificationBell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders bell icon', () => {
    renderWithProviders(<NotificationBell />);

    expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
  });

  it('shows unread count badge when there are unread notifications', () => {
    renderWithProviders(<NotificationBell />);

    expect(screen.getByTestId('unread-badge')).toBeInTheDocument();
    expect(screen.getByTestId('unread-badge')).toHaveTextContent('2');
  });

  it('does not show badge when all notifications are read', () => {
    const { useNotifications } = require('@/lib/notifications');
    useNotifications.mockReturnValue({
      data: {
        notifications: mockNotifications.map((n) => ({ ...n, is_read: true, read: true })),
        total: 3,
        unread_count: 0,
        page: 1,
        has_more: false,
      },
      isLoading: false,
      error: null,
    });

    renderWithProviders(<NotificationBell />);

    expect(screen.queryByTestId('unread-badge')).not.toBeInTheDocument();
  });

  it('opens dropdown when bell is clicked', async () => {
    renderWithProviders(<NotificationBell />);

    const bell = screen.getByTestId('notification-bell');
    fireEvent.click(bell);

    await waitFor(() => {
      expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
    });
  });

  it('shows recent notifications in dropdown', async () => {
    renderWithProviders(<NotificationBell />);

    const bell = screen.getByTestId('notification-bell');
    fireEvent.click(bell);

    await waitFor(() => {
      expect(screen.getByText('Sync Completed')).toBeInTheDocument();
      expect(screen.getByText('New Login')).toBeInTheDocument();
    });
  });

  it('shows "View all" link in dropdown', async () => {
    renderWithProviders(<NotificationBell />);

    const bell = screen.getByTestId('notification-bell');
    fireEvent.click(bell);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /view all/i })).toBeInTheDocument();
    });
  });

  it('closes dropdown when clicking outside', async () => {
    renderWithProviders(<NotificationBell />);

    const bell = screen.getByTestId('notification-bell');
    fireEvent.click(bell);

    await waitFor(() => {
      expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
    });

    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
    });
  });

  it('shows loading state while fetching notifications', () => {
    const { useNotifications } = require('@/lib/notifications');
    useNotifications.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    renderWithProviders(<NotificationBell />);

    const bell = screen.getByTestId('notification-bell');
    fireEvent.click(bell);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('shows empty state when no notifications', async () => {
    const { useNotifications } = require('@/lib/notifications');
    useNotifications.mockReturnValue({
      data: {
        notifications: [],
        total: 0,
        unread_count: 0,
        page: 1,
        has_more: false,
      },
      isLoading: false,
      error: null,
    });

    renderWithProviders(<NotificationBell />);

    const bell = screen.getByTestId('notification-bell');
    fireEvent.click(bell);

    await waitFor(() => {
      expect(screen.getByText(/no notifications/i)).toBeInTheDocument();
    });
  });

  it('displays badge with 9+ for many unread notifications', () => {
    const { useNotifications } = require('@/lib/notifications');
    useNotifications.mockReturnValue({
      data: {
        notifications: [],
        total: 15,
        unread_count: 15,
        page: 1,
        has_more: false,
      },
      isLoading: false,
      error: null,
    });

    renderWithProviders(<NotificationBell />);

    expect(screen.getByTestId('unread-badge')).toHaveTextContent('9+');
  });

  it('has accessible label', () => {
    renderWithProviders(<NotificationBell />);

    const bell = screen.getByTestId('notification-bell');
    expect(bell).toHaveAttribute('aria-label', 'Notifications');
  });
});
