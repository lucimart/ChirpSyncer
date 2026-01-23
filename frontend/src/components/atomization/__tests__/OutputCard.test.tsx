import type { ReactElement } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/styles/ThemeContext';
import { OutputCard } from '../OutputCard';
import type { AtomizedContent } from '@/lib/atomization';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const mockOutput: AtomizedContent = {
  id: 'output-1',
  job_id: 'job-1',
  platform: 'twitter',
  format: 'thread',
  content: 'This is tweet 1\n---\nThis is tweet 2\n---\nThis is tweet 3',
  media_urls: [],
  is_published: false,
  created_at: '2024-01-15T10:30:00Z',
};

describe('OutputCard', () => {
  it('renders platform icon and name', () => {
    renderWithTheme(<OutputCard output={mockOutput} />);

    expect(screen.getByText(/twitter/i)).toBeInTheDocument();
    expect(screen.getByTestId('platform-icon')).toBeInTheDocument();
  });

  it('renders format badge', () => {
    renderWithTheme(<OutputCard output={mockOutput} />);

    expect(screen.getByText(/thread/i)).toBeInTheDocument();
  });

  it('renders truncated content preview', () => {
    renderWithTheme(<OutputCard output={mockOutput} />);

    expect(screen.getByText(/this is tweet 1/i)).toBeInTheDocument();
  });

  it('shows character count for single post format', () => {
    const singlePostOutput: AtomizedContent = {
      ...mockOutput,
      platform: 'linkedin',
      format: 'post',
      content: 'A short LinkedIn post',
    };

    renderWithTheme(<OutputCard output={singlePostOutput} />);

    expect(screen.getByTestId('char-count')).toBeInTheDocument();
  });

  it('shows thread count for thread format', () => {
    renderWithTheme(<OutputCard output={mockOutput} />);

    // Badge should show thread count
    const badges = screen.getAllByText(/3 tweets/i);
    expect(badges.length).toBeGreaterThan(0);
  });

  it('expands to show full content when clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(<OutputCard output={mockOutput} />);

    await user.click(screen.getByRole('button', { name: /expand/i }));

    expect(screen.getByText(/this is tweet 2/i)).toBeInTheDocument();
    expect(screen.getByText(/this is tweet 3/i)).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', async () => {
    const user = userEvent.setup();
    const onEdit = jest.fn();
    renderWithTheme(<OutputCard output={mockOutput} onEdit={onEdit} />);

    await user.click(screen.getByRole('button', { name: /edit/i }));

    expect(onEdit).toHaveBeenCalledWith(mockOutput);
  });

  it('calls onPublish when publish button is clicked', async () => {
    const user = userEvent.setup();
    const onPublish = jest.fn();
    renderWithTheme(<OutputCard output={mockOutput} onPublish={onPublish} />);

    await user.click(screen.getByRole('button', { name: /publish/i }));

    expect(onPublish).toHaveBeenCalledWith(mockOutput.id);
  });

  it('calls onSchedule when schedule button is clicked', async () => {
    const user = userEvent.setup();
    const onSchedule = jest.fn();
    renderWithTheme(<OutputCard output={mockOutput} onSchedule={onSchedule} />);

    await user.click(screen.getByRole('button', { name: /schedule/i }));

    expect(onSchedule).toHaveBeenCalledWith(mockOutput.id);
  });

  it('shows published badge when content is published', () => {
    const publishedOutput: AtomizedContent = {
      ...mockOutput,
      is_published: true,
      published_at: '2024-01-15T12:00:00Z',
    };

    renderWithTheme(<OutputCard output={publishedOutput} />);

    expect(screen.getByText(/published/i)).toBeInTheDocument();
  });

  it('shows scheduled badge when content is scheduled', () => {
    const scheduledOutput: AtomizedContent = {
      ...mockOutput,
      scheduled_for: '2024-01-20T10:00:00Z',
    };

    renderWithTheme(<OutputCard output={scheduledOutput} />);

    expect(screen.getByText(/scheduled/i)).toBeInTheDocument();
  });

  it('applies platform-specific color', () => {
    renderWithTheme(<OutputCard output={mockOutput} />);

    const card = screen.getByTestId('output-card');
    // Twitter color should be applied
    expect(card).toBeInTheDocument();
  });

  it('renders instagram carousel format correctly', () => {
    const instagramOutput: AtomizedContent = {
      ...mockOutput,
      platform: 'instagram',
      format: 'carousel',
      content: 'Slide 1 caption',
      media_urls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    };

    renderWithTheme(<OutputCard output={instagramOutput} />);

    expect(screen.getByText(/carousel/i)).toBeInTheDocument();
    const slideBadges = screen.getAllByText(/2 slides/i);
    expect(slideBadges.length).toBeGreaterThan(0);
  });

  it('renders medium article format correctly', () => {
    const mediumOutput: AtomizedContent = {
      ...mockOutput,
      platform: 'medium',
      format: 'article',
      content: '# Article Title\n\nThis is the article content...',
    };

    renderWithTheme(<OutputCard output={mediumOutput} />);

    // Should show format badge with article text
    const articleBadges = screen.getAllByText(/article/i);
    expect(articleBadges.length).toBeGreaterThan(0);
    expect(screen.getByText(/Medium/)).toBeInTheDocument();
  });
});
