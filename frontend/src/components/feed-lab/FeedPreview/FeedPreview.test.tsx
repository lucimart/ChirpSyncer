import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { FeedPreview } from './FeedPreview';

// Mock WhyAmISeeingThis component
jest.mock('../WhyAmISeeingThis', () => ({
  WhyAmISeeingThis: ({ postId }: { postId: string }) => (
    <div data-testid={`why-seeing-${postId}`}>Why Am I Seeing This?</div>
  ),
}));

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('FeedPreview', () => {
  const mockPosts = [
    {
      id: '1',
      content: 'First post content',
      author: '@user1',
      timestamp: '1 hour ago',
      score: 25,
      appliedRules: [
        { ruleId: 'r1', ruleName: 'Boost Rule', contribution: 25 },
      ],
    },
    {
      id: '2',
      content: 'Second post content',
      author: '@user2',
      timestamp: '2 hours ago',
      score: -10,
      appliedRules: [
        { ruleId: 'r2', ruleName: 'Demote Rule', contribution: -10 },
      ],
    },
    {
      id: '3',
      content: 'Third post content',
      author: '@user3',
      timestamp: '3 hours ago',
      score: 0,
      appliedRules: [],
    },
  ];

  const mockOnPostClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state when no posts', () => {
    renderWithTheme(<FeedPreview posts={[]} onPostClick={mockOnPostClick} />);
    expect(screen.getByText('No posts to display')).toBeInTheDocument();
  });

  it('renders all posts', () => {
    renderWithTheme(<FeedPreview posts={mockPosts} onPostClick={mockOnPostClick} />);

    expect(screen.getByText('First post content')).toBeInTheDocument();
    expect(screen.getByText('Second post content')).toBeInTheDocument();
    expect(screen.getByText('Third post content')).toBeInTheDocument();
  });

  it('displays author and timestamp for each post', () => {
    renderWithTheme(<FeedPreview posts={mockPosts} onPostClick={mockOnPostClick} />);

    expect(screen.getByText('@user1')).toBeInTheDocument();
    expect(screen.getByText('1 hour ago')).toBeInTheDocument();
    expect(screen.getByText('@user2')).toBeInTheDocument();
    expect(screen.getByText('2 hours ago')).toBeInTheDocument();
  });

  it('displays score badges for each post', () => {
    renderWithTheme(<FeedPreview posts={mockPosts} onPostClick={mockOnPostClick} />);

    expect(screen.getByTestId('score-badge-1')).toHaveTextContent('Score: 25');
    expect(screen.getByTestId('score-badge-2')).toHaveTextContent('Score: -10');
    expect(screen.getByTestId('score-badge-3')).toHaveTextContent('Score: 0');
  });

  it('sorts posts by score in descending order', () => {
    renderWithTheme(<FeedPreview posts={mockPosts} onPostClick={mockOnPostClick} />);

    const postElements = screen.getAllByTestId(/^post-preview-/);
    expect(postElements[0]).toHaveAttribute('data-testid', 'post-preview-1'); // score 25
    expect(postElements[1]).toHaveAttribute('data-testid', 'post-preview-3'); // score 0
    expect(postElements[2]).toHaveAttribute('data-testid', 'post-preview-2'); // score -10
  });

  it('calls onPostClick when a post is clicked', () => {
    renderWithTheme(<FeedPreview posts={mockPosts} onPostClick={mockOnPostClick} />);

    fireEvent.click(screen.getByTestId('post-preview-1'));
    expect(mockOnPostClick).toHaveBeenCalledWith(mockPosts[0]);
  });

  it('displays applied rules for posts with rules', () => {
    renderWithTheme(<FeedPreview posts={mockPosts} onPostClick={mockOnPostClick} />);

    expect(screen.getByText('Boost Rule: +25')).toBeInTheDocument();
    expect(screen.getByText('Demote Rule: -10')).toBeInTheDocument();
  });

  it('displays "No rules applied" for posts without rules', () => {
    renderWithTheme(<FeedPreview posts={mockPosts} onPostClick={mockOnPostClick} />);

    expect(screen.getByText('No rules applied')).toBeInTheDocument();
  });

  it('renders WhyAmISeeingThis component for each post', () => {
    renderWithTheme(<FeedPreview posts={mockPosts} onPostClick={mockOnPostClick} />);

    expect(screen.getByTestId('why-seeing-1')).toBeInTheDocument();
    expect(screen.getByTestId('why-seeing-2')).toBeInTheDocument();
    expect(screen.getByTestId('why-seeing-3')).toBeInTheDocument();
  });

  it('applies boosted styling to posts with positive scores', () => {
    renderWithTheme(<FeedPreview posts={mockPosts} onPostClick={mockOnPostClick} />);

    const boostedPost = screen.getByTestId('post-preview-1');
    expect(boostedPost).toHaveClass('boosted');
  });

  it('does not apply boosted styling to posts with zero or negative scores', () => {
    renderWithTheme(<FeedPreview posts={mockPosts} onPostClick={mockOnPostClick} />);

    const neutralPost = screen.getByTestId('post-preview-3');
    const demotedPost = screen.getByTestId('post-preview-2');

    expect(neutralPost).not.toHaveClass('boosted');
    expect(demotedPost).not.toHaveClass('boosted');
  });

  it('stops propagation when clicking WhyAmISeeingThis', () => {
    renderWithTheme(<FeedPreview posts={mockPosts} onPostClick={mockOnPostClick} />);

    const whySection = screen.getByTestId('why-seeing-1').parentElement;
    fireEvent.click(whySection!);

    expect(mockOnPostClick).not.toHaveBeenCalled();
  });
});
