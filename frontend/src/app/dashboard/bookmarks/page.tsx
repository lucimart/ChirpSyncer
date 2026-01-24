'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import {
  Bookmark,
  FolderPlus,
  Folder,
  Heart,
  MessageCircle,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import {
  Button,
  Card,
  Modal,
  Input,
  PageHeader,
  EmptyState,
  Avatar,
  Spinner,
  Form,
  SidebarLayout,
  Stack,
  Badge,
  IconButton,
  NavItem,
  MetaItem,
  Label,
  Typography,
  Caption,
} from '@/components/ui';
import { api } from '@/lib/api';

const SidebarTitle = styled(Typography).attrs({
  variant: 'label',
  color: 'secondary',
  as: 'h3',
})`
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const BookmarkCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const BookmarkHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const AuthorInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const BookmarkContent = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.base};
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.6;
  margin: 0;
`;

const BookmarkMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: ${({ theme }) => theme.spacing[3]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const ColorPicker = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const ColorOption = styled.button<{ $color: string; $selected: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: ${({ $color }) => $color};
  border: 2px solid
    ${({ $selected, theme }) =>
      $selected ? theme.colors.text.primary : 'transparent'};
  cursor: pointer;
  transition: transform ${({ theme }) => theme.transitions.fast};

  &:hover {
    transform: scale(1.1);
  }
`;

interface CollectionData {
  id: number | 'all';
  name: string;
  color: string;
  count: number;
}

interface SavedTweet {
  id: number;
  content: string;
  author_name: string;
  author_handle: string;
  platform: 'twitter' | 'bluesky' | 'unknown';
  likes: number;
  comments: number;
  saved_at: string;
  original_date: string;
  collection_id: number | null;
  original_url?: string;
}

const COLORS = [
  '#3b82f6',
  '#ef4444',
  '#22c55e',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
];

export default function BookmarksPage() {
  const queryClient = useQueryClient();
  const [activeCollection, setActiveCollection] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [collectionName, setCollectionName] = useState('');
  const [collectionColor, setCollectionColor] = useState(COLORS[0]);

  const { data: collections } = useQuery<CollectionData[]>({
    queryKey: ['collections'],
    queryFn: async () => {
      const response = await api.getCollections();
      if (!response.success || !response.data) {
        return [{ id: 'all', name: 'All Bookmarks', color: '#6b7280', count: 0 }];
      }
      const base = response.data as Array<{ id: number; name: string }>;
      const items = base.map((collection, index) => ({
        id: collection.id,
        name: collection.name,
        color: COLORS[index % COLORS.length],
        count: 0,
      }));
      return [{ id: 'all', name: 'All Bookmarks', color: '#6b7280', count: 0 }, ...items];
    },
  });

  const { data: bookmarks, isLoading } = useQuery<SavedTweet[]>({
    queryKey: ['bookmarks', activeCollection],
    queryFn: async () => {
      const response = await api.getBookmarks(activeCollection ?? undefined);
      if (!response.success || !response.data) {
        return [];
      }
      return (response.data as Array<{
        id: number;
        tweet_id: string;
        collection_id: number | null;
        notes?: string | null;
        saved_at: number;
        platform?: 'twitter' | 'bluesky';
        original_url?: string;
      }>).map((item) => {
        const savedAt = new Date(item.saved_at * 1000);
        // Build original URL based on platform
        let originalUrl = item.original_url;
        if (!originalUrl && item.tweet_id) {
          if (item.platform === 'bluesky' || item.tweet_id.includes('bsky')) {
            originalUrl = `https://bsky.app/profile/${item.tweet_id}`;
          } else {
            // Default to Twitter/X
            originalUrl = `https://x.com/i/status/${item.tweet_id}`;
          }
        }
        return {
          id: item.id,
          content: item.notes || item.tweet_id,
          author_name: 'Saved Post',
          author_handle: item.tweet_id,
          platform: item.platform || 'unknown',
          likes: 0,
          comments: 0,
          saved_at: savedAt.toISOString(),
          original_date: savedAt.toISOString().split('T')[0],
          collection_id: item.collection_id,
          original_url: originalUrl,
        };
      });
    },
  });

  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    api.createCollection({ name: collectionName, description: null }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      setIsModalOpen(false);
      setCollectionName('');
      setCollectionColor(COLORS[0]);
    });
  };

  const sidebar = (
    <>
      <SidebarTitle>Collections</SidebarTitle>
      <Stack gap={1}>
        {collections?.map((collection) => (
          <NavItem
            key={collection.id}
            active={activeCollection === collection.id || (collection.id === 'all' && activeCollection === null)}
            icon={collection.id === 'all' ? <Bookmark size={18} /> : <Folder size={18} />}
            iconColor={collection.id === 'all' ? undefined : collection.color}
            badge={<Badge variant="count" size="xs">{collection.count}</Badge>}
            onClick={() =>
              setActiveCollection(collection.id === 'all' ? null : collection.id as number)
            }
          >
            {collection.name}
          </NavItem>
        ))}
      </Stack>
    </>
  );

  return (
    <div>
      <PageHeader
        title="Bookmarks"
        description="Save and organize your favorite posts across platforms"
        actions={
          <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
            <FolderPlus size={18} />
            New Collection
          </Button>
        }
      />

      <SidebarLayout
        sidebar={sidebar}
        sidebarPosition="left"
        sidebarWidth={280}
        gap={6}
        stackBelow={768}
      >
        {isLoading ? (
          <Card padding="lg" style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Spinner size="md" />
          </Card>
        ) : bookmarks && bookmarks.length > 0 ? (
          <Stack gap={4}>
            {bookmarks.map((bookmark) => (
              <BookmarkCard key={bookmark.id} padding="md">
                <BookmarkHeader>
                  <AuthorInfo>
                    <Avatar name={bookmark.author_name} size="md" />
                    <div>
                      <Typography variant="label">{bookmark.author_name}</Typography>
                      <Caption>{bookmark.author_handle}</Caption>
                    </div>
                  </AuthorInfo>
                  <Stack direction="row" gap={1} align="center">
                    {bookmark.platform !== 'unknown' && (
                      <Badge variant={bookmark.platform} size="xs">
                        {bookmark.platform === 'twitter' ? 'Twitter' : 'Bluesky'}
                      </Badge>
                    )}
                    <IconButton
                      aria-label="Open original"
                      onClick={() => {
                        if (bookmark.original_url) {
                          window.open(bookmark.original_url, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      disabled={!bookmark.original_url}
                    >
                      <ExternalLink size={16} />
                    </IconButton>
                    <IconButton
                      aria-label="Delete bookmark"
                      onClick={() => {
                        api.deleteBookmark(bookmark.id).then(() => {
                          queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
                        });
                      }}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </Stack>
                </BookmarkHeader>

                <BookmarkContent>{bookmark.content}</BookmarkContent>

                <BookmarkMeta>
                  <Stack direction="row" gap={4}>
                    <MetaItem size="sm" color="secondary">
                      <Heart size={14} />
                      {bookmark.likes.toLocaleString()}
                    </MetaItem>
                    <MetaItem size="sm" color="secondary">
                      <MessageCircle size={14} />
                      {bookmark.comments}
                    </MetaItem>
                  </Stack>
                  <Caption>Saved {bookmark.original_date}</Caption>
                </BookmarkMeta>
              </BookmarkCard>
            ))}
          </Stack>
        ) : (
          <EmptyState
            icon={Bookmark}
            title="No bookmarks yet"
            description="Save your favorite posts to see them here."
          />
        )}
      </SidebarLayout>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Collection"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCollection}>Create</Button>
          </>
        }
      >
        <Form onSubmit={handleCreateCollection}>
          <Input
            label="Collection Name"
            type="text"
            value={collectionName}
            onChange={(e) => setCollectionName(e.target.value)}
            placeholder="e.g., Read Later"
            required
            fullWidth
          />
          <div>
            <Label>Color</Label>
            <ColorPicker>
              {COLORS.map((color) => (
                <ColorOption
                  key={color}
                  type="button"
                  $color={color}
                  $selected={collectionColor === color}
                  onClick={() => setCollectionColor(color)}
                />
              ))}
            </ColorPicker>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
