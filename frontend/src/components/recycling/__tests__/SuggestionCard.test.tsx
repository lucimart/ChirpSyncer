import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/styles/ThemeContext';
import { SuggestionCard } from '../SuggestionCard';
import type { RecycleSuggestion, ContentItem, PlatformType } from '@/lib/recycling';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const mockContent: ContentItem = {
  id: 'content-1',
  platform: 'twitter' as PlatformType,
  original_post_id: '123456789',
  content: 'This is a great post that should be recycled to other platforms!',
  engagement_score: 85,
  evergreen_score: 90,
  recycle_score: 88,
  tags: ['evergreen', 'tips'],
  recycle_count: 0,
  created_at: '2024-01-01T12:00:00Z',
};

const mockSuggestion: RecycleSuggestion = {
  id: 'suggestion-1',
  content_id: 'content-1',
  content: mockContent,
  suggested_platforms: ['bluesky'],
  suggested_at: '2024-01-15T10:00:00Z',
  status: 'pending',
};

describe('SuggestionCard', () => {
  it('renders content preview', () => {
    renderWithTheme(<SuggestionCard suggestion={mockSuggestion} />);

    expect(screen.getByText(/This is a great post that should be recycled/)).toBeInTheDocument();
  });

  it('shows suggested platforms', () => {
    renderWithTheme(<SuggestionCard suggestion={mockSuggestion} />);

    expect(screen.getByText(/bluesky/i)).toBeInTheDocument();
  });

  it('shows multiple suggested platforms', () => {
    const multiPlatformSuggestion: RecycleSuggestion = {
      ...mockSuggestion,
      suggested_platforms: ['twitter', 'bluesky'],
    };
    renderWithTheme(<SuggestionCard suggestion={multiPlatformSuggestion} />);

    // Source platform (twitter) + target platform (twitter) = 2 twitter badges
    const twitterBadges = screen.getAllByText(/Twitter/i);
    expect(twitterBadges.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/bluesky/i)).toBeInTheDocument();
  });

  it('displays recycle score', () => {
    renderWithTheme(<SuggestionCard suggestion={mockSuggestion} />);

    expect(screen.getByText('88')).toBeInTheDocument();
  });

  it('shows Accept button', () => {
    renderWithTheme(<SuggestionCard suggestion={mockSuggestion} />);

    expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
  });

  it('shows Dismiss button', () => {
    renderWithTheme(<SuggestionCard suggestion={mockSuggestion} />);

    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
  });

  it('calls onAccept when Accept button clicked', async () => {
    const onAccept = jest.fn();
    const user = userEvent.setup();
    renderWithTheme(<SuggestionCard suggestion={mockSuggestion} onAccept={onAccept} />);

    await user.click(screen.getByRole('button', { name: /accept/i }));

    expect(onAccept).toHaveBeenCalledWith('suggestion-1');
  });

  it('calls onDismiss when Dismiss button clicked', async () => {
    const onDismiss = jest.fn();
    const user = userEvent.setup();
    renderWithTheme(<SuggestionCard suggestion={mockSuggestion} onDismiss={onDismiss} />);

    await user.click(screen.getByRole('button', { name: /dismiss/i }));

    expect(onDismiss).toHaveBeenCalledWith('suggestion-1');
  });

  it('shows Schedule button', () => {
    renderWithTheme(<SuggestionCard suggestion={mockSuggestion} />);

    expect(screen.getByRole('button', { name: /schedule/i })).toBeInTheDocument();
  });

  it('calls onSchedule when Schedule button clicked', async () => {
    const onSchedule = jest.fn();
    const user = userEvent.setup();
    renderWithTheme(<SuggestionCard suggestion={mockSuggestion} onSchedule={onSchedule} />);

    await user.click(screen.getByRole('button', { name: /schedule/i }));

    expect(onSchedule).toHaveBeenCalledWith('suggestion-1');
  });

  it('displays source platform badge', () => {
    renderWithTheme(<SuggestionCard suggestion={mockSuggestion} />);

    expect(screen.getByTestId('source-platform')).toBeInTheDocument();
  });

  it('shows content tags', () => {
    renderWithTheme(<SuggestionCard suggestion={mockSuggestion} />);

    expect(screen.getByText('evergreen')).toBeInTheDocument();
    expect(screen.getByText('tips')).toBeInTheDocument();
  });

  it('shows suggested date', () => {
    renderWithTheme(<SuggestionCard suggestion={mockSuggestion} />);

    expect(screen.getByText(/suggested/i)).toBeInTheDocument();
  });

  it('shows accepted status badge when accepted', () => {
    const acceptedSuggestion: RecycleSuggestion = {
      ...mockSuggestion,
      status: 'accepted',
    };
    renderWithTheme(<SuggestionCard suggestion={acceptedSuggestion} />);

    expect(screen.getByText(/accepted/i)).toBeInTheDocument();
  });

  it('shows dismissed status badge when dismissed', () => {
    const dismissedSuggestion: RecycleSuggestion = {
      ...mockSuggestion,
      status: 'dismissed',
    };
    renderWithTheme(<SuggestionCard suggestion={dismissedSuggestion} />);

    expect(screen.getByText(/dismissed/i)).toBeInTheDocument();
  });

  it('hides action buttons when not pending', () => {
    const acceptedSuggestion: RecycleSuggestion = {
      ...mockSuggestion,
      status: 'accepted',
    };
    renderWithTheme(<SuggestionCard suggestion={acceptedSuggestion} />);

    expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    renderWithTheme(
      <SuggestionCard suggestion={mockSuggestion} className="custom-class" />
    );

    expect(screen.getByTestId('suggestion-card')).toHaveClass('custom-class');
  });

  it('renders arrow icon between platforms', () => {
    renderWithTheme(<SuggestionCard suggestion={mockSuggestion} />);

    expect(screen.getByTestId('platform-arrow')).toBeInTheDocument();
  });
});
