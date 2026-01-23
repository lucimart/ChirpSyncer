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
import { Button, Card, Modal, Input, PageHeader, EmptyState as UiEmptyState } from '@/components/ui';
import { api } from '@/lib/api';

const HeaderActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: ${({ theme }) => theme.spacing[6]};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const CollectionsSidebar = styled.div``;

const SidebarTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const CollectionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const CollectionItem = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  background-color: ${({ $active, theme }) =>
    $active ? theme.colors.primary[50] : 'transparent'};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ $active, theme }) =>
      $active ? theme.colors.primary[50] : theme.colors.background.secondary};
  }
`;

const CollectionIcon = styled.div<{ $color?: string }>`
  color: ${({ $color, theme }) => $color ?? theme.colors.text.secondary};
`;

const CollectionName = styled.span<{ $active: boolean }>`
  flex: 1;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ $active, theme }) =>
    $active ? theme.fontWeights.medium : theme.fontWeights.normal};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary[700] : theme.colors.text.primary};
`;

const CollectionCount = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
  background-color: ${({ theme }) => theme.colors.background.tertiary};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  border-radius: ${({ theme }) => theme.borderRadius.full};
`;

const BookmarksList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
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

const AuthorAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.colors.primary[100]};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.primary[700]};
`;

const AuthorDetails = styled.div``;

const AuthorName = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const AuthorHandle = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const BookmarkActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.colors.background.secondary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const BookmarkContent = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.base};
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.6;
`;

const BookmarkMeta = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: ${({ theme }) => theme.spacing[3]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const MetaStats = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const MetaStat = styled.span`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const MetaDate = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const PlatformBadge = styled.span<{ $platform: string }>`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  background-color: ${({ $platform, theme }) =>
    $platform === 'twitter' ? '#1DA1F2' : '#0085FF'};
  color: white;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[10]};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
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

interface CollectionItem {
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

  const { data: collections } = useQuery<CollectionItem[]>({
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
      }>).map((item) => {
        const savedAt = new Date(item.saved_at * 1000);
        return {
          id: item.id,
          content: item.notes || item.tweet_id,
          author_name: 'Saved Post',
          author_handle: item.tweet_id,
          platform: 'unknown',
          likes: 0,
          comments: 0,
          saved_at: savedAt.toISOString(),
          original_date: savedAt.toISOString().split('T')[0],
          collection_id: item.collection_id,
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div>
      <PageHeader
        title="Bookmarks"
        description="Save and organize your favorite posts across platforms"
        actions={
          <HeaderActions>
            <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
              <FolderPlus size={18} />
              New Collection
            </Button>
          </HeaderActions>
        }
      />

      <ContentGrid>
        <CollectionsSidebar>
          <SidebarTitle>Collections</SidebarTitle>
          <CollectionsList>
            {collections?.map((collection) => (
              <CollectionItem
                key={collection.id}
                $active={activeCollection === collection.id}
                onClick={() =>
                  setActiveCollection(
                    collection.id === 'all' ? null : collection.id
                  )
                }
              >
                <CollectionIcon
                  $color={collection.id === 'all' ? undefined : collection.color}
                >
                  {collection.id === 'all' ? (
                    <Bookmark size={18} />
                  ) : (
                    <Folder size={18} />
                  )}
                </CollectionIcon>
                <CollectionName $active={activeCollection === collection.id}>
                  {collection.name}
                </CollectionName>
                <CollectionCount>{collection.count}</CollectionCount>
              </CollectionItem>
            ))}
          </CollectionsList>
        </CollectionsSidebar>

        <div>
          {isLoading ? (
            <Card padding="lg">
              <EmptyState>Loading bookmarks...</EmptyState>
            </Card>
          ) : bookmarks && bookmarks.length > 0 ? (
            <BookmarksList>
              {bookmarks.map((bookmark) => (
                <BookmarkCard key={bookmark.id} padding="md">
                  <BookmarkHeader>
                    <AuthorInfo>
                      <AuthorAvatar>
                        {getInitials(bookmark.author_name)}
                      </AuthorAvatar>
                      <AuthorDetails>
                        <AuthorName>{bookmark.author_name}</AuthorName>
                        <AuthorHandle>{bookmark.author_handle}</AuthorHandle>
                      </AuthorDetails>
                    </AuthorInfo>
                    <BookmarkActions>
                      <PlatformBadge $platform={bookmark.platform}>
                        {bookmark.platform === 'twitter' ? 'Twitter' : 'Bluesky'}
                      </PlatformBadge>
                      <ActionButton>
                        <ExternalLink size={16} />
                      </ActionButton>
                      <ActionButton
                        onClick={() => {
                          api.deleteBookmark(bookmark.id).then(() => {
                            queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
                          });
                        }}
                      >
                        <Trash2 size={16} />
                      </ActionButton>
                    </BookmarkActions>
                  </BookmarkHeader>

                  <BookmarkContent>{bookmark.content}</BookmarkContent>

                  <BookmarkMeta>
                    <MetaStats>
                      <MetaStat>
                        <Heart size={14} />
                        {bookmark.likes.toLocaleString()}
                      </MetaStat>
                      <MetaStat>
                        <MessageCircle size={14} />
                        {bookmark.comments}
                      </MetaStat>
                    </MetaStats>
                    <MetaDate>Saved {bookmark.original_date}</MetaDate>
                  </BookmarkMeta>
                </BookmarkCard>
              ))}
            </BookmarksList>
          ) : (
            <Card padding="lg">
              <EmptyState>
                No bookmarks yet. Save your favorite posts to see them here.
              </EmptyState>
            </Card>
          )}
        </div>
      </ContentGrid>

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
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              Color
            </label>
            <ColorPicker>
              {COLORS.map((color) => (
                <ColorOption
                  key={color}
                  $color={color}
                  $selected={collectionColor === color}
                  onClick={(e) => {
                    e.preventDefault();
                    setCollectionColor(color);
                  }}
                />
              ))}
            </ColorPicker>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
