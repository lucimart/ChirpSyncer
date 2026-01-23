import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/styles/ThemeContext';
import { BlueskyPost } from './BlueskyPost';
import type { ATProtoPost } from '@/lib/bluesky';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const mockPost: ATProtoPost = {
  uri: 'at://did:plc:example123/app.bsky.feed.post/abc123',
  cid: 'bafyreid123',
  author: {
    did: 'did:plc:example123',
    handle: 'testuser.bsky.social',
    displayName: 'Test User',
    followersCount: 150,
    followsCount: 75,
    postsCount: 320,
    indexedAt: '2024-01-15T10:30:00Z',
    avatar: 'https://example.com/avatar.jpg',
  },
  record: {
    $type: 'app.bsky.feed.post',
    text: 'Hello Bluesky! This is a test post.',
    createdAt: '2024-01-15T10:30:00Z',
  },
  replyCount: 5,
  repostCount: 10,
  likeCount: 25,
  quoteCount: 2,
  indexedAt: '2024-01-15T10:30:00Z',
};

describe('BlueskyPost', () => {
  it('renders post text', () => {
    renderWithTheme(<BlueskyPost post={mockPost} />);
    expect(screen.getByText('Hello Bluesky! This is a test post.')).toBeInTheDocument();
  });

  it('renders author display name', () => {
    renderWithTheme(<BlueskyPost post={mockPost} />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('renders author handle', () => {
    renderWithTheme(<BlueskyPost post={mockPost} />);
    expect(screen.getByText('@testuser.bsky.social')).toBeInTheDocument();
  });

  it('uses handle as display name when displayName is missing', () => {
    const postWithoutDisplayName: ATProtoPost = {
      ...mockPost,
      author: {
        ...mockPost.author,
        displayName: undefined,
      },
    };
    renderWithTheme(<BlueskyPost post={postWithoutDisplayName} />);
    const handleElements = screen.getAllByText(/testuser.bsky.social/);
    expect(handleElements.length).toBeGreaterThan(0);
  });

  it('calls onReply when reply button is clicked', async () => {
    const user = userEvent.setup();
    const handleReply = jest.fn();
    renderWithTheme(<BlueskyPost post={mockPost} onReply={handleReply} />);

    const replyButton = screen.getAllByRole('button')[0];
    await user.click(replyButton);
    expect(handleReply).toHaveBeenCalledWith(mockPost);
  });

  it('calls onLike when like button is clicked', async () => {
    const user = userEvent.setup();
    const handleLike = jest.fn();
    renderWithTheme(<BlueskyPost post={mockPost} onLike={handleLike} />);

    const buttons = screen.getAllByRole('button');
    const likeButton = buttons[2];
    await user.click(likeButton);
    expect(handleLike).toHaveBeenCalledWith(mockPost);
  });

  it('calls onRepost when repost button is clicked', async () => {
    const user = userEvent.setup();
    const handleRepost = jest.fn();
    renderWithTheme(<BlueskyPost post={mockPost} onRepost={handleRepost} />);

    const buttons = screen.getAllByRole('button');
    const repostButton = buttons[1];
    await user.click(repostButton);
    expect(handleRepost).toHaveBeenCalledWith(mockPost);
  });

  it('calls onQuote when quote button is clicked', async () => {
    const user = userEvent.setup();
    const handleQuote = jest.fn();
    renderWithTheme(<BlueskyPost post={mockPost} onQuote={handleQuote} />);

    const buttons = screen.getAllByRole('button');
    const quoteButton = buttons[3];
    await user.click(quoteButton);
    expect(handleQuote).toHaveBeenCalledWith(mockPost);
  });

  it('renders images when embed contains images', () => {
    const postWithImages: ATProtoPost = {
      ...mockPost,
      embed: {
        $type: 'app.bsky.embed.images#view',
        images: [
          { thumb: 'https://example.com/thumb1.jpg', fullsize: 'https://example.com/image1.jpg', alt: 'Test image' },
        ],
      },
    };
    renderWithTheme(<BlueskyPost post={postWithImages} />);
    expect(screen.getByAltText('Test image')).toBeInTheDocument();
  });

  it('renders external embed when present', () => {
    const postWithEmbed: ATProtoPost = {
      ...mockPost,
      embed: {
        $type: 'app.bsky.embed.external#view',
        external: {
          uri: 'https://example.com/article',
          title: 'Example Article',
          description: 'An interesting article',
          thumb: 'https://example.com/thumb.jpg',
        },
      },
    };
    renderWithTheme(<BlueskyPost post={postWithEmbed} />);
    expect(screen.getByText('Example Article')).toBeInTheDocument();
    expect(screen.getByText('An interesting article')).toBeInTheDocument();
  });

  it('renders labels when present', () => {
    const postWithLabels: ATProtoPost = {
      ...mockPost,
      labels: [
        { src: 'did:plc:mod', uri: mockPost.uri, val: 'nsfw', cts: '2024-01-15T10:30:00Z' },
      ],
    };
    renderWithTheme(<BlueskyPost post={postWithLabels} />);
    expect(screen.getByText('nsfw')).toBeInTheDocument();
  });

  it('formats large numbers correctly', () => {
    const postWithHighCounts: ATProtoPost = {
      ...mockPost,
      likeCount: 1500,
      repostCount: 2500000,
    };
    renderWithTheme(<BlueskyPost post={postWithHighCounts} />);
    expect(screen.getByText('1.5K')).toBeInTheDocument();
    expect(screen.getByText('2.5M')).toBeInTheDocument();
  });
});
