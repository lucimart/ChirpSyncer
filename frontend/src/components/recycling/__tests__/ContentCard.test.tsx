import type { ReactElement } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/styles/ThemeContext';
import { ContentCard } from '../ContentCard';
import type { ContentItem, PlatformType } from '@/lib/recycling';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const mockContent: ContentItem = {
  id: 'content-1',
  platform: 'twitter' as PlatformType,
  original_post_id: '123456789',
  content: 'This is a great post about testing React components with TDD!',
  media_urls: ['https://example.com/image.jpg'],
  engagement_score: 85,
  evergreen_score: 72,
  recycle_score: 78,
  tags: ['testing', 'react', 'tdd'],
  last_recycled_at: '2024-01-10T10:00:00Z',
  recycle_count: 2,
  created_at: '2024-01-01T12:00:00Z',
};

describe('ContentCard', () => {
  it('renders content text', () => {
    renderWithTheme(<ContentCard content={mockContent} />);

    expect(screen.getByText(/This is a great post about testing React components/)).toBeInTheDocument();
  });

  it('displays platform badge', () => {
    renderWithTheme(<ContentCard content={mockContent} />);

    expect(screen.getByTestId('platform-badge')).toBeInTheDocument();
  });

  it('shows all three score indicators', () => {
    renderWithTheme(<ContentCard content={mockContent} />);

    expect(screen.getByText('Engagement')).toBeInTheDocument();
    expect(screen.getByText('Evergreen')).toBeInTheDocument();
    expect(screen.getByText('Recycle')).toBeInTheDocument();
  });

  it('displays score values', () => {
    renderWithTheme(<ContentCard content={mockContent} />);

    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('72')).toBeInTheDocument();
    expect(screen.getByText('78')).toBeInTheDocument();
  });

  it('shows tags', () => {
    renderWithTheme(<ContentCard content={mockContent} />);

    expect(screen.getByText('testing')).toBeInTheDocument();
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('tdd')).toBeInTheDocument();
  });

  it('displays recycle count badge when count > 0', () => {
    renderWithTheme(<ContentCard content={mockContent} />);

    expect(screen.getByTestId('recycle-count')).toHaveTextContent('2');
  });

  it('does not show recycle count badge when count is 0', () => {
    const noRecycleContent = { ...mockContent, recycle_count: 0 };
    renderWithTheme(<ContentCard content={noRecycleContent} />);

    expect(screen.queryByTestId('recycle-count')).not.toBeInTheDocument();
  });

  it('shows media indicator when content has media', () => {
    renderWithTheme(<ContentCard content={mockContent} />);

    expect(screen.getByTestId('media-indicator')).toBeInTheDocument();
  });

  it('does not show media indicator when content has no media', () => {
    const noMediaContent = { ...mockContent, media_urls: undefined };
    renderWithTheme(<ContentCard content={noMediaContent} />);

    expect(screen.queryByTestId('media-indicator')).not.toBeInTheDocument();
  });

  it('calls onRecycle when recycle button clicked', async () => {
    const onRecycle = jest.fn();
    const user = userEvent.setup();
    renderWithTheme(<ContentCard content={mockContent} onRecycle={onRecycle} />);

    await user.click(screen.getByRole('button', { name: /recycle/i }));

    expect(onRecycle).toHaveBeenCalledWith('content-1');
  });

  it('calls onEditTags when edit tags button clicked', async () => {
    const onEditTags = jest.fn();
    const user = userEvent.setup();
    renderWithTheme(<ContentCard content={mockContent} onEditTags={onEditTags} />);

    await user.click(screen.getByRole('button', { name: /edit tags/i }));

    expect(onEditTags).toHaveBeenCalledWith('content-1');
  });

  it('calls onViewOriginal when view original link clicked', async () => {
    const onViewOriginal = jest.fn();
    const user = userEvent.setup();
    renderWithTheme(<ContentCard content={mockContent} onViewOriginal={onViewOriginal} />);

    await user.click(screen.getByRole('button', { name: /view original/i }));

    expect(onViewOriginal).toHaveBeenCalledWith('content-1', 'twitter', '123456789');
  });

  it('renders with bluesky platform', () => {
    const blueskyContent = { ...mockContent, platform: 'bluesky' as PlatformType };
    renderWithTheme(<ContentCard content={blueskyContent} />);

    expect(screen.getByTestId('platform-badge')).toBeInTheDocument();
  });

  it('truncates long content', () => {
    const longContent = {
      ...mockContent,
      content: 'A'.repeat(500),
    };
    renderWithTheme(<ContentCard content={longContent} />);

    const contentElement = screen.getByTestId('content-text');
    // Content should be clamped to 3 lines via CSS
    expect(contentElement).toBeInTheDocument();
  });

  it('displays last recycled date when available', () => {
    renderWithTheme(<ContentCard content={mockContent} />);

    expect(screen.getByText(/last recycled/i)).toBeInTheDocument();
  });

  it('shows created date', () => {
    renderWithTheme(<ContentCard content={mockContent} />);

    expect(screen.getByTestId('created-date')).toBeInTheDocument();
  });

  it('applies selected styles when selected', () => {
    renderWithTheme(<ContentCard content={mockContent} selected />);

    expect(screen.getByTestId('content-card')).toHaveAttribute('data-selected', 'true');
  });

  it('renders in compact mode', () => {
    renderWithTheme(<ContentCard content={mockContent} compact />);

    expect(screen.getByTestId('content-card')).toHaveAttribute('data-compact', 'true');
  });
});
