'use client';

import React from 'react';
import styled from 'styled-components';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui';

// Types
export interface ListItem {
  id: string;
  title: string;
  subtitle?: string;
  status?: 'success' | 'warning' | 'error' | 'info';
}

export interface ListWidgetProps {
  items: ListItem[];
  title: string;
  onItemClick: (item: ListItem) => void;
  maxItems?: number;
}

// Styled components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const ListItemContainer = styled.li<{ $status?: ListItem['status'] }>`
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

    const statusColors: Record<string, { bg: string; border: string }> = {
      success: {
        bg: theme.colors.success[50],
        border: theme.colors.success[500],
      },
      warning: {
        bg: theme.colors.warning[50],
        border: theme.colors.warning[500],
      },
      error: {
        bg: theme.colors.danger[50],
        border: theme.colors.danger[500],
      },
      info: {
        bg: theme.colors.primary[50],
        border: theme.colors.primary[500],
      },
    };

    const colors = statusColors[$status];
    if (!colors) return '';

    return `
      border-left: 3px solid ${colors.border};

      &:hover {
        background-color: ${colors.bg};
      }
    `;
  }}
`;

const ItemTitle = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ItemSubtitle = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const ViewAllButton = styled(Button)`
  margin-top: ${({ theme }) => theme.spacing[3]};
  width: 100%; /* ListWidget ViewAllButton seemed to be full width implicitly? No, it was display:flex and align-items:center/justify-center. But List is flex-col. ViewAllButton was a button. Default width auto. */
  /* Re-reading ViewAllButton: display: flex. parent is Container (flex-col). align-self: stretch (default). So full width. */
  /* ui/Button is inline-flex. I should probably add fullWidth prop usage or width: 100% here */
`;

export const ListWidget: React.FC<ListWidgetProps> = ({
  items,
  title,
  onItemClick,
  maxItems,
}) => {
  const displayItems = maxItems ? items.slice(0, maxItems) : items;
  const hasMore = maxItems !== undefined && items.length > maxItems;

  if (items.length === 0) {
    return (
      <Container data-testid="list-widget">
        <EmptyState title="No items to display" size="sm" data-testid="list-empty" />
      </Container>
    );
  }

  return (
    <Container data-testid="list-widget">
      <List>
        {displayItems.map((item) => (
          <ListItemContainer
            key={item.id}
            data-testid={`list-item-${item.id}`}
            data-status={item.status}
            $status={item.status}
            onClick={() => onItemClick(item)}
          >
            <ItemTitle>{item.title}</ItemTitle>
            {item.subtitle && <ItemSubtitle>{item.subtitle}</ItemSubtitle>}
          </ListItemContainer>
        ))}
      </List>
      {hasMore && (
        <ViewAllButton type="button" variant="outline" size="sm" fullWidth>
          View all
        </ViewAllButton>
      )}
    </Container>
  );
};

export default ListWidget;
