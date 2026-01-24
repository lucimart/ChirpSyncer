import type { ReactElement } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { MessageCard } from '../MessageCard';
import type { UnifiedMessage } from '@/lib/inbox';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const mockMessage: UnifiedMessage = {
  id: 'msg-1',
  platform: 'twitter',
  message_type: 'mention',
  author_handle: '@johndoe',
  author_name: 'John Doe',
  author_avatar: 'https://example.com/avatar.jpg',
  content: 'Hey @user, check out this awesome feature!',
  original_url: 'https://twitter.com/johndoe/status/123',
  is_read: false,
  is_starred: false,
  is_archived: false,
  created_at: '2024-01-15T10:30:00Z',
};

describe('MessageCard', () => {
  it('renders message content', () => {
    renderWithTheme(<MessageCard message={mockMessage} />);

    expect(screen.getByText(/Hey @user, check out this awesome feature!/)).toBeInTheDocument();
  });

  it('renders author name and handle', () => {
    renderWithTheme(<MessageCard message={mockMessage} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('@johndoe')).toBeInTheDocument();
  });

  it('shows unread indicator for unread messages', () => {
    renderWithTheme(<MessageCard message={mockMessage} />);

    expect(screen.getByTestId('unread-indicator')).toBeInTheDocument();
  });

  it('does not show unread indicator for read messages', () => {
    const readMessage = { ...mockMessage, is_read: true };
    renderWithTheme(<MessageCard message={readMessage} />);

    expect(screen.queryByTestId('unread-indicator')).not.toBeInTheDocument();
  });

  it('shows star icon filled when starred', () => {
    const starredMessage = { ...mockMessage, is_starred: true };
    renderWithTheme(<MessageCard message={starredMessage} />);

    const starButton = screen.getByRole('button', { name: /unstar/i });
    expect(starButton).toBeInTheDocument();
  });

  it('shows star icon outlined when not starred', () => {
    renderWithTheme(<MessageCard message={mockMessage} />);

    const starButton = screen.getByRole('button', { name: /star/i });
    expect(starButton).toBeInTheDocument();
  });

  it('calls onMarkAsRead when mark as read button clicked', () => {
    const onMarkAsRead = jest.fn();
    renderWithTheme(<MessageCard message={mockMessage} onMarkAsRead={onMarkAsRead} />);

    const readButton = screen.getByRole('button', { name: /mark as read/i });
    fireEvent.click(readButton);

    expect(onMarkAsRead).toHaveBeenCalledWith('msg-1');
  });

  it('calls onToggleStar when star button clicked', () => {
    const onToggleStar = jest.fn();
    renderWithTheme(<MessageCard message={mockMessage} onToggleStar={onToggleStar} />);

    const starButton = screen.getByRole('button', { name: /star/i });
    fireEvent.click(starButton);

    expect(onToggleStar).toHaveBeenCalledWith('msg-1', true);
  });

  it('calls onArchive when archive button clicked', () => {
    const onArchive = jest.fn();
    renderWithTheme(<MessageCard message={mockMessage} onArchive={onArchive} />);

    const archiveButton = screen.getByRole('button', { name: /archive/i });
    fireEvent.click(archiveButton);

    expect(onArchive).toHaveBeenCalledWith('msg-1');
  });

  it('displays message type badge', () => {
    renderWithTheme(<MessageCard message={mockMessage} />);

    expect(screen.getByText(/mention/i)).toBeInTheDocument();
  });

  it('displays platform badge', () => {
    renderWithTheme(<MessageCard message={mockMessage} />);

    expect(screen.getByTestId('platform-badge')).toBeInTheDocument();
  });

  it('displays relative time', () => {
    renderWithTheme(<MessageCard message={mockMessage} />);

    // Should show some form of timestamp
    expect(screen.getByTestId('message-time')).toBeInTheDocument();
  });

  it('opens original URL when card clicked', () => {
    const onNavigate = jest.fn();
    renderWithTheme(<MessageCard message={mockMessage} onNavigate={onNavigate} />);

    const card = screen.getByTestId('message-card');
    fireEvent.click(card);

    expect(onNavigate).toHaveBeenCalledWith('https://twitter.com/johndoe/status/123');
  });

  it('renders different platform colors', () => {
    const blueskyMessage = { ...mockMessage, platform: 'bluesky' as const };
    renderWithTheme(<MessageCard message={blueskyMessage} />);

    expect(screen.getByTestId('platform-badge')).toBeInTheDocument();
  });

  it('handles messages without avatar', () => {
    const noAvatarMessage = { ...mockMessage, author_avatar: undefined };
    renderWithTheme(<MessageCard message={noAvatarMessage} />);

    // Should show fallback avatar with initials
    expect(screen.getByText('JD')).toBeInTheDocument();
  });
});
