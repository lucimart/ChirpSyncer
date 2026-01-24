'use client';

import { useState, useMemo, useCallback, memo, type FC, type ChangeEvent } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { Stack, Select, Button, EmptyState } from '@/components/ui';
import { SyncPreviewItem } from '../SyncPreviewItem';
import type { SyncPreviewItemData } from '@/lib/api';

const SelectedCount = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const ItemList = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const ItemWrapper = styled(motion.div)``;

const listVariants = {
  visible: {
    transition: { staggerChildren: 0.03 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, x: -20 },
};
import {
  type FilterOptions,
  type PlatformFilter,
  type DateFilter,
  PLATFORM_FILTER_OPTIONS,
  DATE_FILTER_OPTIONS,
  isWithinDateRange,
} from '../types';

export interface SyncPreviewListProps {
  items: SyncPreviewItemData[];
  onToggleItem: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onFilter?: (filters: FilterOptions) => void;
}

export const SyncPreviewList: FC<SyncPreviewListProps> = memo(({
  items,
  onToggleItem,
  onSelectAll,
  onDeselectAll,
  onFilter,
}) => {
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesPlatform =
        platformFilter === 'all' || item.sourcePlatform === platformFilter;
      const matchesDate = isWithinDateRange(item.timestamp, dateFilter);
      return matchesPlatform && matchesDate;
    });
  }, [items, platformFilter, dateFilter]);

  const { selectedCount, allSelected, noneSelected } = useMemo(() => {
    const count = items.filter((item) => item.selected).length;
    return {
      selectedCount: count,
      allSelected: items.length > 0 && count === items.length,
      noneSelected: count === 0,
    };
  }, [items]);

  const handlePlatformChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value as PlatformFilter;
      setPlatformFilter(value);
      onFilter?.({ platform: value, date: dateFilter });
    },
    [dateFilter, onFilter]
  );

  const handleDateChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value as DateFilter;
      setDateFilter(value);
      onFilter?.({ platform: platformFilter, date: value });
    },
    [platformFilter, onFilter]
  );

  if (items.length === 0) {
    return (
      <Stack gap={4} data-testid="sync-preview-list">
        <EmptyState
          icon={RefreshCw}
          title="No items to sync"
          description="No items available for synchronization"
          data-testid="sync-preview-empty"
        />
      </Stack>
    );
  }

  return (
    <Stack gap={4} data-testid="sync-preview-list">
      <Stack direction="row" align="center" justify="between" wrap gap={3}>
        <Stack direction="row" align="center" gap={3}>
          <Select
            data-testid="platform-filter"
            value={platformFilter}
            onChange={handlePlatformChange}
            options={PLATFORM_FILTER_OPTIONS}
            aria-label="Filter by platform"
          />
          <Select
            data-testid="date-filter"
            value={dateFilter}
            onChange={handleDateChange}
            options={DATE_FILTER_OPTIONS}
            aria-label="Filter by date"
          />
        </Stack>
        <Stack direction="row" align="center" gap={2}>
          <SelectedCount data-testid="selected-count">
            {selectedCount} selected
          </SelectedCount>
          <Button
            variant="secondary"
            size="sm"
            onClick={onSelectAll}
            disabled={allSelected}
            aria-label="Select All"
          >
            Select All
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onDeselectAll}
            disabled={noneSelected}
            aria-label="Deselect All"
          >
            Deselect All
          </Button>
        </Stack>
      </Stack>
      <ItemList
        variants={listVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item) => (
            <ItemWrapper
              key={item.id}
              variants={itemVariants}
              exit="exit"
              layout
              transition={{ duration: 0.15 }}
            >
              <SyncPreviewItem
                item={item}
                onToggle={onToggleItem}
              />
            </ItemWrapper>
          ))}
        </AnimatePresence>
      </ItemList>
    </Stack>
  );
});

SyncPreviewList.displayName = 'SyncPreviewList';
