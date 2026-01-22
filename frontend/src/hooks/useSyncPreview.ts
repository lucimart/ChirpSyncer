'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, SyncPreviewItemData, SyncPreviewData } from '@/lib/api';

export type { SyncPreviewItemData, SyncPreviewData };

export function useSyncPreview() {
  const [localItems, setLocalItems] = useState<SyncPreviewItemData[] | null>(null);

  const {
    data,
    isLoading,
    isError,
    isSuccess,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['syncPreview'],
    queryFn: async () => {
      const response = await api.getSyncPreview();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch sync preview');
      }
      return response.data!;
    },
  });

  // Initialize local items from API data when it arrives
  useEffect(() => {
    if (data?.items && localItems === null) {
      setLocalItems([...data.items]);
    }
  }, [data?.items, localItems]);

  // Use local items if modified, otherwise use data from API
  const items = useMemo(() => {
    if (localItems !== null) {
      return localItems;
    }
    return data?.items ?? [];
  }, [localItems, data?.items]);

  const toggleItem = useCallback((id: string) => {
    setLocalItems((prev) => {
      if (!prev) return prev;
      return prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      );
    });
  }, []);

  const selectAll = useCallback(() => {
    setLocalItems((prev) => {
      if (!prev) return prev;
      return prev.map((item) => ({ ...item, selected: true }));
    });
  }, []);

  const deselectAll = useCallback(() => {
    setLocalItems((prev) => {
      if (!prev) return prev;
      return prev.map((item) => ({ ...item, selected: false }));
    });
  }, []);

  const selectedItems = useMemo(() => {
    return items.filter((item) => item.selected);
  }, [items]);

  const selectedCount = selectedItems.length;
  const totalCount = data?.totalCount ?? items.length;
  const estimatedTime = data?.estimatedTime ?? 0;

  const error = queryError ? { message: (queryError as Error).message } : null;

  return {
    items,
    isLoading,
    isError,
    isSuccess,
    error,
    refetch: async () => {
      setLocalItems(null);
      const result = await refetch();
      if (result.data?.items) {
        setLocalItems([...result.data.items]);
      }
      return result;
    },
    toggleItem,
    selectAll,
    deselectAll,
    selectedItems,
    selectedCount,
    totalCount,
    estimatedTime,
  };
}

