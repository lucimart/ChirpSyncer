'use client';

import styled from 'styled-components';
import { useState, useEffect, useMemo } from 'react';
import { BarChart3, List, TrendingUp, Search } from 'lucide-react';
import { Input, Modal, EmptyState } from '@/components/ui';

interface WidgetPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: 'stats' | 'chart' | 'list') => void;
}

interface WidgetOption {
  type: 'stats' | 'chart' | 'list';
  title: string;
  description: string;
  icon: React.ReactNode;
  keywords: string[];
}

const widgetOptions: WidgetOption[] = [
  {
    type: 'stats',
    title: 'Stats',
    description: 'View key metrics and statistics',
    icon: <TrendingUp size={24} />,
    keywords: ['stats', 'statistics', 'metrics', 'key', 'numbers'],
  },
  {
    type: 'chart',
    title: 'Graphs',
    description: 'Data chart and visualization',
    icon: <BarChart3 size={24} />,
    keywords: ['chart', 'visualization', 'graph', 'data', 'visual'],
  },
  {
    type: 'list',
    title: 'Feed',
    description: 'Activity list and recent items',
    icon: <List size={24} />,
    keywords: ['list', 'activity', 'recent', 'items', 'feed'],
  },
];

const SearchContainer = styled.div`
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[6]}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const StyledSearchInput = styled(Input)`
  & input {
    background-color: ${({ theme }) => theme.colors.background.secondary};
  }
`;

const OptionsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
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
    background-color: ${({ theme }) => theme.colors.primary[50]};
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
  background-color: ${({ theme }) => theme.colors.primary[100]};
  color: ${({ theme }) => theme.colors.primary[600]};
  flex-shrink: 0;
`;

const OptionContent = styled.div`
  flex: 1;
`;

const OptionTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing[1]} 0;
`;

const OptionDescription = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
  line-height: 1.5;
`;


export const WidgetPicker = ({ isOpen, onClose, onSelect }: WidgetPickerProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) {
      return widgetOptions;
    }

    const query = searchQuery.toLowerCase();
    return widgetOptions.filter(
      (option) =>
        option.title.toLowerCase().includes(query) ||
        option.description.toLowerCase().includes(query) ||
        option.keywords.some((keyword) => keyword.includes(query))
    );
  }, [searchQuery]);

  const handleSelect = (type: 'stats' | 'chart' | 'list') => {
    onSelect(type);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Widget"
      size="md"
    >
      <SearchContainer>
        <StyledSearchInput
          startIcon={<Search size={18} />}
          data-testid="widget-search"
          type="text"
          placeholder="Search widgets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
        />
      </SearchContainer>

      <div style={{ padding: '16px' }}>
        {filteredOptions.length > 0 ? (
          <OptionsGrid>
            {filteredOptions.map((option) => (
              <OptionCard
                key={option.type}
                data-testid={`widget-option-${option.type}`}
                onClick={() => handleSelect(option.type)}
              >
                <IconWrapper>{option.icon}</IconWrapper>
                <OptionContent>
                  <OptionTitle>{option.title}</OptionTitle>
                  <OptionDescription>{option.description}</OptionDescription>
                </OptionContent>
              </OptionCard>
            ))}
          </OptionsGrid>
        ) : (
          <EmptyState title="No widgets match your search" size="sm" />
        )}
      </div>
    </Modal>
  );
};
