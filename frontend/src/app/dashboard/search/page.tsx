'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import {
  Search as SearchIcon,
  Filter,
  Image as ImageIcon,
  Download,
  ChevronLeft,
  ChevronRight,
  Hash,
  User,
} from 'lucide-react';
import { Button, Card, Input } from '@/components/ui';
import { api, SearchResultItem } from '@/lib/api';
import type { SearchFilters } from '@/types';

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

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[6]};
`;

const PageButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  padding: ${({ theme }) => `0 ${theme.spacing[2]}`};
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary[600] : theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background-color: ${({ $active, theme }) =>
    $active ? theme.colors.primary[600] : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? 'white' : theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  cursor: pointer;

  &:hover:not(:disabled) {
    background-color: ${({ $active, theme }) =>
      $active ? theme.colors.primary[700] : theme.colors.background.secondary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ResultCheckbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
  margin-right: ${({ theme }) => theme.spacing[3]};
`;

const ResultCardWrapper = styled.div`
  display: flex;
  align-items: flex-start;
`;

const ResultCardContent = styled.div`
  flex: 1;
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
              <ImageIcon size={16} />
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
          <FilterGroup>
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
          </FilterGroup>
          <FilterGroup>
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
          </FilterGroup>
          <FilterGroup>
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
          </FilterGroup>
          <FilterGroup>
            <FilterLabel style={{ marginBottom: '4px', display: 'block' }}>Platform</FilterLabel>
            <select
              value={filters.platform || ''}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  platform: (e.target.value as 'twitter' | 'bluesky') || undefined,
                }))
              }
              style={{
                width: '100%',
                height: '40px',
                padding: '8px 12px',
                fontSize: '14px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                backgroundColor: 'white',
              }}
            >
              <option value="">All platforms</option>
              <option value="twitter">Twitter</option>
              <option value="bluesky">Bluesky</option>
            </select>
          </FilterGroup>
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
          <EmptyState>
            Enter a search term to find posts across your synced accounts
          </EmptyState>
        </Card>
      ) : isLoading ? (
        <Card padding="lg">
          <EmptyState>Searching...</EmptyState>
        </Card>
      ) : paginatedResults && paginatedResults.length > 0 ? (
        <>
          <ResultsList>
            {paginatedResults.map((result) => (
              <ResultCard key={result.id} padding="md">
                <ResultCardWrapper>
                  <ResultCheckbox
                    type="checkbox"
                    checked={selectedIds.has(result.id)}
                    onChange={() => handleSelectResult(result.id)}
                  />
                  <ResultCardContent>
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
                  </ResultCardContent>
                </ResultCardWrapper>
              </ResultCard>
            ))}
          </ResultsList>

          {totalPages > 1 && (
            <Pagination>
              <PageButton
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={16} />
              </PageButton>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <PageButton
                    key={pageNum}
                    $active={currentPage === pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </PageButton>
                );
              })}
              <PageButton
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={16} />
              </PageButton>
            </Pagination>
          )}
        </>
      ) : (
        <Card padding="lg">
          <EmptyState>No results found for &quot;{query}&quot;</EmptyState>
        </Card>
      )}
    </div>
  );
}
