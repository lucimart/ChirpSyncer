import type { Meta, StoryObj } from '@storybook/react';
import { expect, within, userEvent } from '@storybook/test';
import { BlueskyPost } from './BlueskyPost';
import type { ATProtoPost } from '@/lib/bluesky';

const mockPost: ATProtoPost = {
  uri: 'at://did:plc:example123/app.bsky.feed.post/abc123',
  cid: 'bafyreid123',
  author: {
    did: 'did:plc:example123',
    handle: 'testuser.bsky.social',
    displayName: 'Test User',
    followersCount: 1250,
    followsCount: 320,
    postsCount: 890,
    indexedAt: new Date().toISOString(),
    avatar: 'https://i.pravatar.cc/150?u=testuser',
  },
  record: {
    $type: 'app.bsky.feed.post',
    text: 'Hello Bluesky! This is a test post with some content to showcase the component.',
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  },
  replyCount: 12,
  repostCount: 45,
  likeCount: 128,
  quoteCount: 8,
  indexedAt: new Date().toISOString(),
};

const meta: Meta<typeof BlueskyPost> = {
  title: 'Bluesky/BlueskyPost',
  component: BlueskyPost,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '600px', maxWidth: '100%' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    post: mockPost,
    isLiked: false,
    isReposted: false,
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof BlueskyPost>;

export const Default: Story = {
  args: {
    post: mockPost,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Test User')).toBeInTheDocument();
    await expect(canvas.getByText('@testuser.bsky.social')).toBeInTheDocument();
  },
};

export const WithLongText: Story = {
  args: {
    post: {
      ...mockPost,
      record: {
        ...mockPost.record,
        text: 'This is a much longer post that demonstrates how the component handles extended content. It includes multiple sentences and should wrap nicely within the container. The Bluesky platform supports up to 300 characters per post, which allows for more expressive content than some other platforms.',
      },
    },
  },
};

export const WithImages: Story = {
  args: {
    post: {
      ...mockPost,
      embed: {
        $type: 'app.bsky.embed.images#view',
        images: [
          {
            thumb: 'https://picsum.photos/200/200?random=1',
            fullsize: 'https://picsum.photos/800/600?random=1',
            alt: 'A beautiful landscape',
          },
        ],
      },
    },
  },
};

export const WithMultipleImages: Story = {
  args: {
    post: {
      ...mockPost,
      embed: {
        $type: 'app.bsky.embed.images#view',
        images: [
          { thumb: 'https://picsum.photos/200/200?random=1', fullsize: 'https://picsum.photos/800/600?random=1', alt: 'Image 1' },
          { thumb: 'https://picsum.photos/200/200?random=2', fullsize: 'https://picsum.photos/800/600?random=2', alt: 'Image 2' },
          { thumb: 'https://picsum.photos/200/200?random=3', fullsize: 'https://picsum.photos/800/600?random=3', alt: 'Image 3' },
        ],
      },
    },
  },
};

export const WithExternalEmbed: Story = {
  args: {
    post: {
      ...mockPost,
      record: {
        ...mockPost.record,
        text: 'Check out this interesting article!',
      },
      embed: {
        $type: 'app.bsky.embed.external#view',
        external: {
          uri: 'https://example.com/article',
          title: 'The Future of Decentralized Social Media',
          description: 'An in-depth look at how protocols like AT Protocol are reshaping the social media landscape.',
          thumb: 'https://picsum.photos/400/200?random=10',
        },
      },
    },
  },
};

export const WithLabels: Story = {
  args: {
    post: {
      ...mockPost,
      labels: [
        { src: 'did:plc:mod', uri: mockPost.uri, val: 'sensitive', cts: new Date().toISOString() },
        { src: 'did:plc:mod', uri: mockPost.uri, val: 'politics', cts: new Date().toISOString() },
      ],
    },
  },
};

export const Liked: Story = {
  args: {
    post: mockPost,
    isLiked: true,
  },
};

export const Reposted: Story = {
  args: {
    post: mockPost,
    isReposted: true,
  },
};

export const LikedAndReposted: Story = {
  args: {
    post: mockPost,
    isLiked: true,
    isReposted: true,
  },
};

export const HighEngagement: Story = {
  args: {
    post: {
      ...mockPost,
      replyCount: 1234,
      repostCount: 5678,
      likeCount: 12500,
      quoteCount: 890,
    },
  },
};

export const ViralPost: Story = {
  args: {
    post: {
      ...mockPost,
      author: {
        ...mockPost.author,
        displayName: 'Popular Creator',
        handle: 'creator.bsky.social',
        followersCount: 125000,
      },
      record: {
        ...mockPost.record,
        text: 'This post went viral! Sometimes the simplest thoughts resonate the most with people.',
      },
      replyCount: 8500,
      repostCount: 25000,
      likeCount: 150000,
      quoteCount: 3200,
    },
  },
};

export const NoDisplayName: Story = {
  args: {
    post: {
      ...mockPost,
      author: {
        ...mockPost.author,
        displayName: undefined,
      },
    },
  },
};

export const RecentPost: Story = {
  args: {
    post: {
      ...mockPost,
      record: {
        ...mockPost.record,
        createdAt: new Date(Date.now() - 30000).toISOString(), // 30 seconds ago
      },
    },
  },
};

export const OldPost: Story = {
  args: {
    post: {
      ...mockPost,
      record: {
        ...mockPost.record,
        createdAt: new Date(Date.now() - 7 * 24 * 3600000).toISOString(), // 7 days ago
      },
    },
  },
};

export const WithInteraction: Story = {
  args: {
    post: mockPost,
    onReply: () => console.log('Reply clicked'),
    onRepost: () => console.log('Repost clicked'),
    onLike: () => console.log('Like clicked'),
    onQuote: () => console.log('Quote clicked'),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const buttons = canvas.getAllByRole('button');

    // Click the like button (third action button)
    await userEvent.click(buttons[2]);
  },
};

export const NoEngagement: Story = {
  args: {
    post: {
      ...mockPost,
      replyCount: 0,
      repostCount: 0,
      likeCount: 0,
      quoteCount: 0,
    },
  },
};
