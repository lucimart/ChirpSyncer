'use client';

import { useState, useMemo } from 'react';
import styled from 'styled-components';
import { SyncPreviewItem } from './SyncPreviewItem';
import type { SyncPreviewItemData } from '@/lib/api';

interface FilterOptions {
  platform?: 'twitter' | 'bluesky' | 'all';
  date?: 'all' | '24h' | '7d' | '30d';
}

interface SyncPreviewListProps {
  items: SyncPreviewItemData[];
  onToggleItem: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onFilter?: (filters: FilterOptions) => void;
}

const ListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const FiltersRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const FilterSelect = styled.select`
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  min-width: 140px;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary[500]};
  }
`;

const ActionsRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const ActionButton = styled.button`
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[3]}`};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.fast};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.background.secondary};
    border-color: ${({ theme }) => theme.colors.border.dark};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SelectedCount = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ItemsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[12]};
  text-align: center;
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
`;

const EmptyTitle = styled.h3`
  margin: 0 0 ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const EmptyDescription = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

function isWithinDateRange(timestamp: string, range: string): boolean {
  if (range === 'all') return true;

  const itemDate = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - itemDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  switch (range) {
    case '24h':
      return diffHours <= 24;
    case '7d':
      return diffHours <= 24 * 7;
    case '30d':
      return diffHours <= 24 * 30;
    default:
      return true;
  }
}

export function SyncPreviewList({
  items,
  onToggleItem,
  onSelectAll,
  onDeselectAll,
  onFilter,
}: SyncPreviewListProps) {
  const [platformFilter, setPlatformFilter] = useState<'all' | 'twitter' | 'bluesky'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | '24h' | '7d' | '30d'>('all');

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesPlatform =
        platformFilter === 'all' || item.sourcePlatform === platformFilter;
      const matchesDate = isWithinDateRange(item.timestamp, dateFilter);
      return matchesPlatform && matchesDate;
    });
  }, [items, platformFilter, dateFilter]);

  const selectedCount = items.filter((item) => item.selected).length;
  const allSelected = items.length > 0 && selectedCount === items.length;
  const noneSelected = selectedCount === 0;

  const handlePlatformChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as 'all' | 'twitter' | 'bluesky';
    setPlatformFilter(value);
    onFilter?.({ platform: value === 'all' ? 'all' : value, date: dateFilter });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as 'all' | '24h' | '7d' | '30d';
    setDateFilter(value);
    onFilter?.({ platform: platformFilter, date: value });
  };

  if (items.length === 0) {
    return (
      <ListContainer data-testid="sync-preview-list">
        <EmptyState data-testid="sync-preview-empty">
          <EmptyTitle>No items to sync</EmptyTitle>
          <EmptyDescription>
            No items available for synchronization
          </EmptyDescription>
        </EmptyState>
      </ListContainer>
    );
  }

  return (
    <ListContainer data-testid="sync-preview-list">
      <Header>
        <FiltersRow>
          <FilterSelect
            data-testid="platform-filter"
            value={platformFilter}
            onChange={handlePlatformChange}
          >
            <option value="all">All Platforms</option>
            <option value="twitter">Twitter</option>
            <option value="bluesky">Bluesky</option>
          </FilterSelect>
          <FilterSelect
            data-testid="date-filter"
            value={dateFilter}
            onChange={handleDateChange}
          >
            <option value="all">All Time</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </FilterSelect>
        </FiltersRow>
        <ActionsRow>
          <SelectedCount data-testid="selected-count">
            {selectedCount} selected
          </SelectedCount>
          <ActionButton
            onClick={onSelectAll}
            disabled={allSelected}
            aria-label="Select All"
          >
            Select All
          </ActionButton>
          <ActionButton
            onClick={onDeselectAll}
            disabled={noneSelected}
            aria-label="Deselect All"
          >
            Deselect All
          </ActionButton>
        </ActionsRow>
      </Header>
      <ItemsList>
        {filteredItems.map((item) => (
          <SyncPreviewItem
            key={item.id}
            item={item}
            onToggle={onToggleItem}
          />
        ))}
      </ItemsList>
    </ListContainer>
  );
}
