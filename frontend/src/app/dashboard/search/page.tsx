'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import {
  Search as SearchIcon,
  Filter,
  Image,
  Heart,
  Repeat,
} from 'lucide-react';
import { Button, Card, Input } from '@/components/ui';
import type { SearchResult, SearchFilters } from '@/types';

const PageHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const PageDescription = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const SearchContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const SearchInputWrapper = styled.div`
  flex: 1;
  position: relative;
`;

const SearchInputIcon = styled.div`
  position: absolute;
  left: ${({ theme }) => theme.spacing[3]};
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const StyledSearchInput = styled.input`
  width: 100%;
  height: 44px;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  padding-left: ${({ theme }) => theme.spacing[10]};
  font-size: ${({ theme }) => theme.fontSizes.base};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background-color: ${({ theme }) => theme.colors.background.primary};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary[100]};
  }
`;

const FiltersCard = styled(Card)<{ $visible: boolean }>`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  display: ${({ $visible }) => ($visible ? 'block' : 'none')};
`;

const FiltersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
`;

const FilterGroup = styled.div``;

const FilterLabel = styled.label`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  cursor: pointer;
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
`;

const ResultsInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const ResultsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const ResultCard = styled(Card)`
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary[300]};
  }
`;

const ResultHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const ResultPlatform = styled.span<{ $platform: string }>`
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  background-color: ${({ $platform }) =>
    $platform === 'twitter' ? '#E8F5FD' : '#E8F0FF'};
  color: ${({ $platform }) => ($platform === 'twitter' ? '#1DA1F2' : '#0085FF')};
`;

const ResultDate = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const ResultContent = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.base};
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.5;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const HighlightedText = styled.mark`
  background-color: ${({ theme }) => theme.colors.warning[100]};
  color: inherit;
  padding: 0 2px;
  border-radius: 2px;
`;

const ResultMeta = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const MetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[10]};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

// Safe text highlighting without dangerouslySetInnerHTML
function HighlightedContent({ content, query }: { content: string; query: string }) {
  if (!query) return <>{content}</>;

  const parts = content.split(new RegExp(`(${query})`, 'gi'));

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <HighlightedText key={index}>{part}</HighlightedText>
        ) : (
          part
        )
      )}
    </>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    has_media: false,
    min_likes: undefined,
  });

  const { data: results, isLoading } = useQuery<SearchResult[]>({
    queryKey: ['search', query, filters],
    queryFn: async () => {
      if (!query.trim()) return [];
      // Mock data
      await new Promise((resolve) => setTimeout(resolve, 500));
      return [
        {
          id: '1',
          content:
            'Just launched our new feature for automatic tweet cleanup! Check it out at chirpsyncer.com',
          created_at: new Date().toISOString(),
          platform: 'twitter',
          likes: 42,
          retweets: 12,
          has_media: true,
        },
        {
          id: '2',
          content:
            'The best way to manage your social media presence across multiple platforms.',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          platform: 'bluesky',
          likes: 28,
          retweets: 5,
          has_media: false,
        },
        {
          id: '3',
          content:
            'New analytics dashboard is live! Track your engagement metrics in real-time.',
          created_at: new Date(Date.now() - 172800000).toISOString(),
          platform: 'twitter',
          likes: 156,
          retweets: 34,
          has_media: true,
        },
      ].filter((r) => {
        if (filters.has_media && !r.has_media) return false;
        if (filters.min_likes && r.likes < filters.min_likes) return false;
        return r.content.toLowerCase().includes(query.toLowerCase());
      });
    },
    enabled: query.length > 0,
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div>
      <PageHeader>
        <PageTitle>Search</PageTitle>
        <PageDescription>
          Search through your synced posts across all platforms
        </PageDescription>
      </PageHeader>

      <SearchContainer>
        <SearchInputWrapper>
          <SearchInputIcon>
            <SearchIcon size={20} />
          </SearchInputIcon>
          <StyledSearchInput
            type="text"
            placeholder="Search posts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </SearchInputWrapper>
        <Button
          variant={showFilters ? 'primary' : 'secondary'}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={18} />
          Filters
        </Button>
      </SearchContainer>

      <FiltersCard $visible={showFilters} padding="md">
        <FiltersGrid>
          <FilterGroup>
            <FilterLabel>
              <Checkbox
                type="checkbox"
                checked={filters.has_media}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, has_media: e.target.checked }))
                }
              />
              <Image size={16} />
              Has media
            </FilterLabel>
          </FilterGroup>
          <FilterGroup>
            <Input
              label="Minimum likes"
              type="number"
              value={filters.min_likes || ''}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  min_likes: e.target.value ? parseInt(e.target.value) : undefined,
                }))
              }
              placeholder="0"
            />
          </FilterGroup>
        </FiltersGrid>
      </FiltersCard>

      {query && (
        <ResultsInfo>
          <span>
            {isLoading
              ? 'Searching...'
              : `${results?.length ?? 0} results for "${query}"`}
          </span>
        </ResultsInfo>
      )}

      {!query ? (
        <Card padding="lg">
          <EmptyState>
            Enter a search term to find posts across your synced accounts
          </EmptyState>
        </Card>
      ) : isLoading ? (
        <Card padding="lg">
          <EmptyState>Searching...</EmptyState>
        </Card>
      ) : results && results.length > 0 ? (
        <ResultsList>
          {results.map((result) => (
            <ResultCard key={result.id} padding="md">
              <ResultHeader>
                <ResultPlatform $platform={result.platform}>
                  {result.platform}
                </ResultPlatform>
                <ResultDate>{formatDate(result.created_at)}</ResultDate>
              </ResultHeader>
              <ResultContent>
                <HighlightedContent content={result.content} query={query} />
              </ResultContent>
              <ResultMeta>
                <MetaItem>
                  <Heart size={14} />
                  {result.likes}
                </MetaItem>
                <MetaItem>
                  <Repeat size={14} />
                  {result.retweets}
                </MetaItem>
                {result.has_media && (
                  <MetaItem>
                    <Image size={14} />
                    Media
                  </MetaItem>
                )}
              </ResultMeta>
            </ResultCard>
          ))}
        </ResultsList>
      ) : (
        <Card padding="lg">
          <EmptyState>No results found for &quot;{query}&quot;</EmptyState>
        </Card>
      )}
    </div>
  );
}
