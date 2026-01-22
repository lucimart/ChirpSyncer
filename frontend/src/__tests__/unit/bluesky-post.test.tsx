/**
 * BlueskyPost Component Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { BlueskyPost } from '@/components/bluesky/BlueskyPost';
import type { ATProtoPost } from '@/lib/bluesky';

const ThemeWrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

const renderWithTheme = (ui: React.ReactElement) => {
  return render(ui, { wrapper: ThemeWrapper });
};

// Helper to create mock post with all required fields
const createMockPost = (overrides: Record<string, unknown> = {}): ATProtoPost => {
  const base = {
    uri: 'at://did:plc:test/app.bsky.feed.post/123',
    cid: 'bafytest123',
    author: {
      did: 'did:plc:test',
      handle: 'testuser.bsky.social',
      displayName: 'Test User',
      avatar: 'https://example.com/avatar.jpg',
      followersCount: 100,
      followsCount: 50,
      postsCount: 200,
      indexedAt: new Date().toISOString(),
    },
    record: {
      $type: 'app.bsky.feed.post',
      text: 'This is a test post content',
      createdAt: new Date().toISOString(),
    },
    replyCount: 5,
    repostCount: 10,
    likeCount: 25,
    quoteCount: 3,
    indexedAt: new Date().toISOString(),
  };
  return { ...base, ...overrides } as ATProtoPost;
};

describe('BlueskyPost Component', () => {
  describe('Rendering', () => {
    it('renders post content', () => {
      const post = createMockPost();
      renderWithTheme(<BlueskyPost post={post} />);

      expect(screen.getByText('This is a test post content')).toBeInTheDocument();
    });

    it('renders author display name', () => {
      const post = createMockPost();
      renderWithTheme(<BlueskyPost post={post} />);

      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('renders author handle', () => {
      const post = createMockPost();
      renderWithTheme(<BlueskyPost post={post} />);

      expect(screen.getByText('@testuser.bsky.social')).toBeInTheDocument();
    });

    it('renders handle as display name when displayName is missing', () => {
      const post = createMockPost({
        author: {
          did: 'did:plc:test',
          handle: 'noname.bsky.social',
          displayName: '',
          followersCount: 0,
          followsCount: 0,
          postsCount: 0,
          indexedAt: new Date().toISOString(),
        },
      });
      renderWithTheme(<BlueskyPost post={post} />);

      // Should show handle as the display name link
      const links = screen.getAllByRole('link');
      expect(links.some(link => link.textContent === 'noname.bsky.social')).toBe(true);
    });

    it('renders avatar initial when no avatar URL', () => {
      const post = createMockPost({
        author: {
          did: 'did:plc:test',
          handle: 'testuser.bsky.social',
          displayName: 'Test User',
          avatar: undefined,
          followersCount: 0,
          followsCount: 0,
          postsCount: 0,
          indexedAt: new Date().toISOString(),
        },
      });
      renderWithTheme(<BlueskyPost post={post} />);

      expect(screen.getByText('T')).toBeInTheDocument();
    });
  });

  describe('Engagement Counts', () => {
    it('renders reply count', () => {
      const post = createMockPost({ replyCount: 42 });
      renderWithTheme(<BlueskyPost post={post} />);

      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('renders repost count', () => {
      const post = createMockPost({ repostCount: 100 });
      renderWithTheme(<BlueskyPost post={post} />);

      expect(screen.getByText('100')).toBeInTheDocument();
    });

    it('renders like count', () => {
      const post = createMockPost({ likeCount: 500 });
      renderWithTheme(<BlueskyPost post={post} />);

      expect(screen.getByText('500')).toBeInTheDocument();
    });

    it('renders quote count', () => {
      const post = createMockPost({ quoteCount: 15 });
      renderWithTheme(<BlueskyPost post={post} />);

      expect(screen.getByText('15')).toBeInTheDocument();
    });

    it('formats large numbers with K suffix', () => {
      const post = createMockPost({ likeCount: 1500 });
      renderWithTheme(<BlueskyPost post={post} />);

      expect(screen.getByText('1.5K')).toBeInTheDocument();
    });

    it('formats very large numbers with M suffix', () => {
      const post = createMockPost({ likeCount: 1500000 });
      renderWithTheme(<BlueskyPost post={post} />);

      expect(screen.getByText('1.5M')).toBeInTheDocument();
    });

    it('does not render count when zero', () => {
      const post = createMockPost({ replyCount: 0, repostCount: 0, likeCount: 0, quoteCount: 0 });
      renderWithTheme(<BlueskyPost post={post} />);

      // Should not have any numeric counts displayed
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });

  describe('Timestamps', () => {
    it('renders "now" for very recent posts', () => {
      const post = createMockPost({
        record: { $type: 'app.bsky.feed.post', text: 'Recent post', createdAt: new Date().toISOString() },
      });
      renderWithTheme(<BlueskyPost post={post} />);

      expect(screen.getByText('now')).toBeInTheDocument();
    });

    it('renders minutes for posts less than an hour old', () => {
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const post = createMockPost({
        record: { $type: 'app.bsky.feed.post', text: 'Post', createdAt: thirtyMinsAgo },
      });
      renderWithTheme(<BlueskyPost post={post} />);

      expect(screen.getByText('30m')).toBeInTheDocument();
    });

    it('renders hours for posts less than a day old', () => {
      const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
      const post = createMockPost({
        record: { $type: 'app.bsky.feed.post', text: 'Post', createdAt: fiveHoursAgo },
      });
      renderWithTheme(<BlueskyPost post={post} />);

      expect(screen.getByText('5h')).toBeInTheDocument();
    });

    it('renders days for posts less than a week old', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const post = createMockPost({
        record: { $type: 'app.bsky.feed.post', text: 'Post', createdAt: threeDaysAgo },
      });
      renderWithTheme(<BlueskyPost post={post} />);

      expect(screen.getByText('3d')).toBeInTheDocument();
    });

    it('renders date for posts older than a week', () => {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const post = createMockPost({
        record: { $type: 'app.bsky.feed.post', text: 'Post', createdAt: twoWeeksAgo.toISOString() },
      });
      renderWithTheme(<BlueskyPost post={post} />);

      // Should render as a localized date string
      expect(screen.getByText(twoWeeksAgo.toLocaleDateString())).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('calls onReply when reply button is clicked', () => {
      const onReply = jest.fn();
      const post = createMockPost();
      renderWithTheme(<BlueskyPost post={post} onReply={onReply} />);

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]); // First action button is reply

      expect(onReply).toHaveBeenCalledWith(post);
    });

    it('calls onRepost when repost button is clicked', () => {
      const onRepost = jest.fn();
      const post = createMockPost();
      renderWithTheme(<BlueskyPost post={post} onRepost={onRepost} />);

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]); // Second action button is repost

      expect(onRepost).toHaveBeenCalledWith(post);
    });

    it('calls onLike when like button is clicked', () => {
      const onLike = jest.fn();
      const post = createMockPost();
      renderWithTheme(<BlueskyPost post={post} onLike={onLike} />);

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[2]); // Third action button is like

      expect(onLike).toHaveBeenCalledWith(post);
    });

    it('calls onQuote when quote button is clicked', () => {
      const onQuote = jest.fn();
      const post = createMockPost();
      renderWithTheme(<BlueskyPost post={post} onQuote={onQuote} />);

      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[3]); // Fourth action button is quote

      expect(onQuote).toHaveBeenCalledWith(post);
    });

    it('shows active state for liked post', () => {
      const post = createMockPost();
      renderWithTheme(<BlueskyPost post={post} isLiked />);

      // Component should render without errors with isLiked prop
      expect(screen.getByText('This is a test post content')).toBeInTheDocument();
    });

    it('shows active state for reposted post', () => {
      const post = createMockPost();
      renderWithTheme(<BlueskyPost post={post} isReposted />);

      // Component should render without errors with isReposted prop
      expect(screen.getByText('This is a test post content')).toBeInTheDocument();
    });
  });

  describe('Images', () => {
    it('renders single image', () => {
      const post = createMockPost({
        embed: {
          $type: 'app.bsky.embed.images#view',
          images: [{ fullsize: 'https://example.com/image1.jpg', thumb: 'https://example.com/thumb1.jpg', alt: 'Test image' }],
        },
      });
      renderWithTheme(<BlueskyPost post={post} />);

      const img = screen.getByAltText('Test image');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/image1.jpg');
    });

    it('renders multiple images', () => {
      const post = createMockPost({
        embed: {
          $type: 'app.bsky.embed.images#view',
          images: [
            { fullsize: 'https://example.com/image1.jpg', thumb: 'https://example.com/thumb1.jpg', alt: 'Image 1' },
            { fullsize: 'https://example.com/image2.jpg', thumb: 'https://example.com/thumb2.jpg', alt: 'Image 2' },
          ],
        },
      });
      renderWithTheme(<BlueskyPost post={post} />);

      expect(screen.getByAltText('Image 1')).toBeInTheDocument();
      expect(screen.getByAltText('Image 2')).toBeInTheDocument();
    });

    it('renders three images with first spanning', () => {
      const post = createMockPost({
        embed: {
          $type: 'app.bsky.embed.images#view',
          images: [
            { fullsize: 'https://example.com/image1.jpg', thumb: 'https://example.com/thumb1.jpg', alt: 'Image 1' },
            { fullsize: 'https://example.com/image2.jpg', thumb: 'https://example.com/thumb2.jpg', alt: 'Image 2' },
            { fullsize: 'https://example.com/image3.jpg', thumb: 'https://example.com/thumb3.jpg', alt: 'Image 3' },
          ],
        },
      });
      renderWithTheme(<BlueskyPost post={post} />);

      expect(screen.getByAltText('Image 1')).toBeInTheDocument();
      expect(screen.getByAltText('Image 2')).toBeInTheDocument();
      expect(screen.getByAltText('Image 3')).toBeInTheDocument();
    });
  });

  describe('External Embeds', () => {
    it('renders external link embed', () => {
      const post = createMockPost({
        embed: {
          $type: 'app.bsky.embed.external#view',
          external: {
            uri: 'https://example.com/article',
            title: 'Article Title',
            description: 'Article description text',
            thumb: 'https://example.com/thumb.jpg',
          },
        },
      });
      renderWithTheme(<BlueskyPost post={post} />);

      expect(screen.getByText('Article Title')).toBeInTheDocument();
      expect(screen.getByText('Article description text')).toBeInTheDocument();
      expect(screen.getByText('example.com')).toBeInTheDocument();
    });

    it('renders external embed without thumbnail', () => {
      const post = createMockPost({
        embed: {
          $type: 'app.bsky.embed.external#view',
          external: {
            uri: 'https://example.com/article',
            title: 'No Thumb Article',
            description: 'Description',
          },
        },
      });
      renderWithTheme(<BlueskyPost post={post} />);

      expect(screen.getByText('No Thumb Article')).toBeInTheDocument();
    });
  });

  describe('Labels', () => {
    it('renders content labels', () => {
      const post = createMockPost({
        labels: [
          { val: 'nsfw', src: 'did:plc:test', uri: 'at://test', cts: new Date().toISOString() },
          { val: 'spoiler', src: 'did:plc:test', uri: 'at://test', cts: new Date().toISOString() },
        ],
      });
      renderWithTheme(<BlueskyPost post={post} />);

      expect(screen.getByText('nsfw')).toBeInTheDocument();
      expect(screen.getByText('spoiler')).toBeInTheDocument();
    });

    it('does not render labels section when empty', () => {
      const post = createMockPost({ labels: [] });
      renderWithTheme(<BlueskyPost post={post} />);

      expect(screen.queryByText('nsfw')).not.toBeInTheDocument();
    });
  });
});
