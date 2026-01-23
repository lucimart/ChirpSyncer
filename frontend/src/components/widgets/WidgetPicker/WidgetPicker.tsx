'use client';

import { useState, useEffect, useMemo, useCallback, type FC, type ChangeEvent } from 'react';
import styled from 'styled-components';
import { BarChart3, List, TrendingUp, Search } from 'lucide-react';
import { Input, Modal, Stack, SmallText, Caption, EmptyState } from '@/components/ui';
import type { WidgetType, WidgetOption } from '../types';

type SelectableWidgetType = Exclude<WidgetType, 'custom'>;

interface WidgetPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: SelectableWidgetType) => void;
}

const ICON_SIZE = 24;

const WIDGET_OPTIONS: readonly WidgetOption[] = [
  {
    type: 'stats',
    title: 'Stats',
    description: 'View key metrics and statistics',
    Icon: TrendingUp,
    keywords: ['stats', 'statistics', 'metrics', 'key', 'numbers'],
  },
  {
    type: 'chart',
    title: 'Graphs',
    description: 'Data chart and visualization',
    Icon: BarChart3,
    keywords: ['chart', 'visualization', 'graph', 'data', 'visual'],
  },
  {
    type: 'list',
    title: 'Feed',
    description: 'Activity list and recent items',
    Icon: List,
    keywords: ['list', 'activity', 'recent', 'items', 'feed'],
  },
] as const;

const SearchWrapper = styled.div`
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[6]}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const OptionCard = styled.button`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[4]};
  background-color: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary[500]};
    background-color: ${({ theme }) => theme.colors.surface.primary.bg};
    transform: translateY(-1px);
    box-shadow: ${({ theme }) => theme.shadows.md};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary[100]};
  }
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background-color: ${({ theme }) => theme.colors.surface.primary.bg};
  color: ${({ theme }) => theme.colors.surface.primary.text};
  flex-shrink: 0;
`;


export const WidgetPicker: FC<WidgetPickerProps> = ({ isOpen, onClose, onSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) {
      return WIDGET_OPTIONS;
    }

    const query = searchQuery.toLowerCase();
    return WIDGET_OPTIONS.filter(
      (option) =>
        option.title.toLowerCase().includes(query) ||
        option.description.toLowerCase().includes(query) ||
        option.keywords.some((keyword) => keyword.includes(query))
    );
  }, [searchQuery]);

  const handleSelect = useCallback(
    (type: SelectableWidgetType) => {
      onSelect(type);
      onClose();
    },
    [onSelect, onClose]
  );

  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Widget"
      size="md"
      data-testid="widget-picker"
    >
      <SearchWrapper>
        <Input
          startIcon={<Search size={18} />}
          data-testid="widget-search"
          type="text"
          placeholder="Search widgets..."
          value={searchQuery}
          onChange={handleSearchChange}
          autoFocus
        />
      </SearchWrapper>

      <div style={{ padding: '16px' }}>
        {filteredOptions.length > 0 ? (
          <Stack gap={3}>
            {filteredOptions.map((option) => (
              <OptionCard
                key={option.type}
                data-testid={`widget-option-${option.type}`}
                onClick={() => handleSelect(option.type as SelectableWidgetType)}
              >
                <IconWrapper>
                  <option.Icon size={ICON_SIZE} />
                </IconWrapper>
                <Stack gap={1} style={{ flex: 1 }}>
                  <SmallText style={{ fontWeight: 600 }}>{option.title}</SmallText>
                  <Caption style={{ lineHeight: 1.5 }}>{option.description}</Caption>
                </Stack>
              </OptionCard>
            ))}
          </Stack>
        ) : (
          <EmptyState title="No widgets match your search" size="sm" />
        )}
      </div>
    </Modal>
  );
};
