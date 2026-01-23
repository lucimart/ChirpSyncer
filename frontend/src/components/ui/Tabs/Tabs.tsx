import React from 'react';
import styled, { css } from 'styled-components';
import { Badge, BadgeProps } from '../Badge';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ElementType;
  badge?: string | number;
  badgeVariant?: BadgeProps['variant'];
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  variant?: 'soft' | 'accent';
}

const TabsContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[1]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  padding-bottom: ${({ theme }) => theme.spacing[1]};
  overflow-x: auto;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const softVariant = css<{ $active: boolean }>`
  background: ${({ $active, theme }) =>
    $active ? theme.colors.surface.primary.bg : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.surface.primary.text : theme.colors.text.secondary};

  &:hover {
    background: ${({ $active, theme }) =>
      $active ? theme.colors.surface.primarySubtle.bg : theme.colors.background.secondary};
    color: ${({ $active, theme }) =>
      $active ? theme.colors.surface.primary.text : theme.colors.text.primary};
  }
`;

const accentVariant = css<{ $active: boolean }>`
  background: transparent;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary[700] : theme.colors.text.secondary};
  position: relative;
  border-radius: 0;
  padding-bottom: ${({ theme }) => theme.spacing[3]};
  margin-bottom: -1px;

  &:after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background-color: ${({ $active, theme }) =>
      $active ? theme.colors.primary[700] : 'transparent'};
    transition: background-color ${({ theme }) => theme.transitions.fast};
  }

  &:hover {
    color: ${({ $active, theme }) =>
      $active ? theme.colors.primary[700] : theme.colors.text.primary};
    background: ${({ theme }) => theme.colors.background.secondary};
  }
`;

const TabButton = styled.button<{ $active: boolean; $variant: 'soft' | 'accent' }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]}`};
  border: none;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  white-space: nowrap;

  ${({ $variant }) => $variant === 'soft' ? softVariant : accentVariant}

  svg {
    width: 16px;
    height: 16px;
  }
`;

export const Tabs: React.FC<TabsProps> = ({
  items,
  value,
  onChange,
  className,
  variant = 'soft'
}) => {
  return (
    <TabsContainer className={className} role="tablist">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = value === item.id;

        // Determine badge variant based on tab variant
        const defaultBadgeVariant = variant === 'accent' ? 'status-primary' : 'primary';
        const badgeVariant = item.badgeVariant || defaultBadgeVariant;

        return (
          <TabButton
            key={item.id}
            $active={isActive}
            $variant={variant}
            onClick={() => onChange(item.id)}
            role="tab"
            aria-selected={isActive}
            id={`tab-${item.id}`}
          >
            {Icon && <Icon />}
            {item.label}
            {item.badge !== undefined && (
              <Badge variant={badgeVariant} size="sm" style={{ minWidth: variant === 'accent' ? '20px' : undefined }}>
                {item.badge}
              </Badge>
            )}
          </TabButton>
        );
      })}
    </TabsContainer>
  );
};
