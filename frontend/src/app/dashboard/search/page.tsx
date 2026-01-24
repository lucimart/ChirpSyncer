'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import {
  Search as SearchIcon,
  Filter,
  Image as ImageIcon,
  Download,
  Hash,
  User,
} from 'lucide-react';
import { Button, Card, Input, PageHeader, EmptyState, Select, Pagination, MetaItem, Stack } from '@/components/ui';
import { api, SearchResultItem } from '@/lib/api';
import type { SearchFilters } from '@/types';

const SearchContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const SearchInputWrapper = styled.div`
  flex: 1;
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

const PaginationWrapper = styled.div`
  margin-top: ${({ theme }) => theme.spacing[6]};
`;

const ResultCheckbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
  margin-right: ${({ theme }) => theme.spacing[3]};
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

const PAGE_SIZE = 10;

interface ExtendedFilters extends SearchFilters {
  min_retweets?: number;
  date_from?: string;
  date_to?: string;
  platform?: 'twitter' | 'bluesky';
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ExtendedFilters>({
    has_media: false,
    min_likes: undefined,
    min_retweets: undefined,
    date_from: undefined,
    date_to: undefined,
    platform: undefined,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: results, isLoading } = useQuery<SearchResultItem[]>({
    queryKey: ['search', query, filters],
    queryFn: async () => {
      if (!query.trim()) return [];
      const response = await api.searchPosts({
        q: query,
        limit: 100,
        has_media: filters.has_media || undefined,
        min_likes: filters.min_likes,
        min_retweets: filters.min_retweets,
        date_from: filters.date_from,
        date_to: filters.date_to,
        platform: filters.platform,
      });
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Search failed');
      }
      return response.data.results;
    },
    enabled: query.length > 0,
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  // Pagination
  const totalResults = results?.length ?? 0;
  const totalPages = Math.ceil(totalResults / PAGE_SIZE);
  const paginatedResults = results?.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleSelectResult = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const handleExportSelected = () => {
    const selected = results?.filter((r) => selectedIds.has(r.id)) ?? [];
    const data = JSON.stringify(selected, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Search"
        description="Search through your synced posts across all platforms"
      />

      <SearchContainer>
        <SearchInputWrapper>
          <Input
            type="text"
            placeholder="Search posts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            startIcon={<SearchIcon size={20} />}
            fullWidth
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
          <div>
            <FilterLabel>
              <Checkbox
                type="checkbox"
                checked={filters.has_media}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, has_media: e.target.checked }))
                }
              />
              <ImageIcon size={16} />
              Has media
            </FilterLabel>
          </div>
          <div>
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
          </div>
          <div>
            <Input
              label="Minimum retweets"
              type="number"
              value={filters.min_retweets || ''}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  min_retweets: e.target.value ? parseInt(e.target.value) : undefined,
                }))
              }
              placeholder="0"
            />
          </div>
          <div>
            <Input
              label="From date"
              type="date"
              value={filters.date_from || ''}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  date_from: e.target.value || undefined,
                }))
              }
            />
          </div>
          <div>
            <Input
              label="To date"
              type="date"
              value={filters.date_to || ''}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  date_to: e.target.value || undefined,
                }))
              }
            />
          </div>
          <div>
            <Select
              label="Platform"
              value={filters.platform || ''}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  platform: (e.target.value as 'twitter' | 'bluesky') || undefined,
                }))
              }
              options={[
                { value: '', label: 'All platforms' },
                { value: 'twitter', label: 'Twitter' },
                { value: 'bluesky', label: 'Bluesky' },
              ]}
              fullWidth
            />
          </div>
        </FiltersGrid>
      </FiltersCard>

      {query && (
        <ResultsInfo>
          <span>
            {isLoading
              ? 'Searching...'
              : `${totalResults} results for "${query}"`}
          </span>
          {selectedIds.size > 0 && (
            <Button variant="secondary" size="sm" onClick={handleExportSelected}>
              <Download size={16} />
              Export {selectedIds.size} selected
            </Button>
          )}
        </ResultsInfo>
      )}

      {!query ? (
        <Card padding="lg">
          <EmptyState
            icon={SearchIcon}
            title="Search your synced posts"
            description="Enter a search term to find posts across your synced accounts"
          />
        </Card>
      ) : isLoading ? (
        <Card padding="lg">
          <EmptyState title="Searching..." />
        </Card>
      ) : paginatedResults && paginatedResults.length > 0 ? (
        <>
          <Stack gap={3}>
            {paginatedResults.map((result) => (
              <ResultCard key={result.id} padding="md">
                <Stack direction="row" align="start">
                  <ResultCheckbox
                    type="checkbox"
                    checked={selectedIds.has(result.id)}
                    onChange={() => handleSelectResult(result.id)}
                  />
                  <div style={{ flex: 1 }}>
                    <ResultHeader>
                      <ResultPlatform $platform={result.platform}>
                        {result.platform}
                      </ResultPlatform>
                      <MetaItem size="xs" color="tertiary">{formatDate(result.created_at)}</MetaItem>
                    </ResultHeader>
                    <ResultContent>
                      <HighlightedContent content={result.content} query={query} />
                    </ResultContent>
                    <ResultMeta>
                      {result.author && (
                        <MetaItem>
                          <User size={14} />
                          @{result.author}
                        </MetaItem>
                      )}
                      {result.hashtags && result.hashtags.length > 0 && (
                        <MetaItem>
                          <Hash size={14} />
                          {result.hashtags.slice(0, 3).join(', ')}
                        </MetaItem>
                      )}
                    </ResultMeta>
                  </div>
                </Stack>
              </ResultCard>
            ))}
          </Stack>

          <PaginationWrapper>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </PaginationWrapper>
        </>
      ) : (
        <Card padding="lg">
          <EmptyState title={`No results found for "${query}"`} />
        </Card>
      )}
    </div>
  );
}
