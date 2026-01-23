'use client';

import { useCallback, useMemo, type FC, type KeyboardEvent } from 'react';
import styled from 'styled-components';
import { Button, Stack, SmallText, Caption, EmptyState } from '../../ui';
import { STATUS_COLORS, type StatusType } from '../types';

export interface ListItem {
  id: string;
  title: string;
  subtitle?: string;
  status?: StatusType;
}

export interface ListWidgetProps {
  items: ListItem[];
  title: string;
  onItemClick: (item: ListItem) => void;
  maxItems?: number;
  onViewAll?: () => void;
}

// Styled components
const ListItemContainer = styled.div<{ $status?: ListItem['status'] }>`
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background-color: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme }) => theme.colors.background.tertiary};
    border-color: ${({ theme }) => theme.colors.border.default};
  }

  ${({ $status, theme }) => {
    if (!$status) return '';
    const colorKey = STATUS_COLORS[$status];
    if (!colorKey) return '';

    const colors = theme.colors as Record<string, Record<string, string>>;
    const borderColor = colors[colorKey.border]?.[500];
    const bgColor = colors[colorKey.bg]?.[50];

    return `
      border-left: 3px solid ${borderColor};

      &:hover {
        background-color: ${bgColor};
      }
    `;
  }}
`;

export const ListWidget: FC<ListWidgetProps> = ({
  items,
  onItemClick,
  maxItems,
  onViewAll,
}) => {
  const displayItems = useMemo(
    () => (maxItems ? items.slice(0, maxItems) : items),
    [items, maxItems]
  );

  const hasMore = useMemo(
    () => maxItems !== undefined && items.length > maxItems,
    [items.length, maxItems]
  );

  const handleItemClick = useCallback(
    (item: ListItem) => {
      onItemClick(item);
    },
    [onItemClick]
  );

  const handleKeyDown = useCallback(
    (item: ListItem) => (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onItemClick(item);
      }
    },
    [onItemClick]
  );

  if (items.length === 0) {
    return (
      <Stack data-testid="list-widget" style={{ width: '100%' }}>
        <EmptyState title="No items to display" size="sm" data-testid="list-empty" />
      </Stack>
    );
  }

  return (
    <Stack data-testid="list-widget" style={{ width: '100%' }}>
      <Stack gap={2}>
        {displayItems.map((item) => (
          <ListItemContainer
            key={item.id}
            data-testid={`list-item-${item.id}`}
            data-status={item.status}
            $status={item.status}
            role="button"
            tabIndex={0}
            onClick={() => handleItemClick(item)}
            onKeyDown={handleKeyDown(item)}
          >
            <SmallText style={{ fontWeight: 500 }}>{item.title}</SmallText>
            {item.subtitle && <Caption style={{ marginTop: '4px' }}>{item.subtitle}</Caption>}
          </ListItemContainer>
        ))}
      </Stack>
      {hasMore && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          fullWidth
          onClick={onViewAll}
          style={{ marginTop: '12px' }}
        >
          View all
        </Button>
      )}
    </Stack>
  );
};

export default ListWidget;
