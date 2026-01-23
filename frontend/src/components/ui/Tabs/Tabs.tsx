'use client';

import { memo, FC, useCallback, useRef, useId } from 'react';
import styled, { css } from 'styled-components';
import { motion, LayoutGroup, useReducedMotion } from 'framer-motion';
import { Badge } from '../Badge';
import {
  TabsProps,
  TabPanelProps,
  TabItem,
  TabVariant,
  TabSize,
  TAB_SIZES,
  TABS_ANIMATION,
} from './types';

const TabsContainer = styled.div<{ $fullWidth?: boolean }>`
  display: flex;
  gap: ${({ theme }) => theme.spacing[1]};
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  ${({ $fullWidth }) => $fullWidth && css`
    width: 100%;
    > * {
      flex: 1;
    }
  `}
`;

const TabsWrapper = styled.div<{ $variant: TabVariant }>`
  position: relative;

  ${({ $variant }) => $variant === 'accent' && css`
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
    padding-bottom: 1px;
  `}
`;

const TabButton = styled.button<{
  $active: boolean;
  $variant: TabVariant;
  $size: TabSize;
  $disabled?: boolean;
}>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ $size }) => TAB_SIZES[$size].padding};
  border: none;
  font-size: ${({ theme, $size }) => theme.fontSizes[TAB_SIZES[$size].fontSize as keyof typeof theme.fontSizes]};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  border-radius: ${({ theme, $variant }) =>
    $variant === 'accent' ? '0' : theme.borderRadius.md};
  cursor: ${({ $disabled }) => $disabled ? 'not-allowed' : 'pointer'};
  transition: color 0.15s ease, background-color 0.15s ease;
  white-space: nowrap;
  background: transparent;
  opacity: ${({ $disabled }) => $disabled ? 0.5 : 1};
  z-index: 1;

  ${({ $variant, $active, theme }) => {
    if ($variant === 'soft') {
      return css`
        color: ${$active
          ? (theme.colors.surface?.primary?.text ?? theme.colors.primary[800])
          : theme.colors.text.secondary};
        &:hover:not(:disabled) {
          color: ${$active
            ? (theme.colors.surface?.primary?.text ?? theme.colors.primary[800])
            : theme.colors.text.primary};
        }
      `;
    }
    if ($variant === 'pills') {
      return css`
        color: ${$active ? 'white' : theme.colors.text.secondary};
        &:hover:not(:disabled) {
          color: ${$active ? 'white' : theme.colors.text.primary};
        }
      `;
    }
    // accent
    return css`
      color: ${$active ? theme.colors.primary[700] : theme.colors.text.secondary};
      margin-bottom: -1px;
      &:hover:not(:disabled) {
        color: ${$active ? theme.colors.primary[700] : theme.colors.text.primary};
        background: ${theme.colors.background.secondary};
      }
    `;
  }}

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary[500]};
    outline-offset: 2px;
    z-index: 2;
  }

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
`;

const SoftIndicator = styled(motion.span)`
  position: absolute;
  inset: 0;
  background: ${({ theme }) => theme.colors.surface?.primary?.bg ?? theme.colors.primary[50]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  z-index: 0;
`;

const PillsIndicator = styled(motion.span)`
  position: absolute;
  inset: 0;
  background: ${({ theme }) => theme.colors.primary[600]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  z-index: 0;
`;

const AccentIndicator = styled(motion.span)`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: ${({ theme }) => theme.colors.primary[700]};
  z-index: 0;
`;

const TabButtonWrapper = styled.div`
  position: relative;
`;

export const Tabs: FC<TabsProps> = memo(({
  items,
  value,
  onChange,
  className,
  variant = 'soft',
  size = 'md',
  fullWidth = false,
  id: providedId,
  'aria-label': ariaLabel,
}) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const shouldReduceMotion = useReducedMotion();

  const handleKeyDown = useCallback((e: React.KeyboardEvent, currentIndex: number) => {
    const enabledItems = items.filter(item => !item.disabled);
    const currentEnabledIndex = enabledItems.findIndex(item => item.id === items[currentIndex].id);

    let nextIndex: number | null = null;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        nextIndex = (currentEnabledIndex + 1) % enabledItems.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        nextIndex = (currentEnabledIndex - 1 + enabledItems.length) % enabledItems.length;
        break;
      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIndex = enabledItems.length - 1;
        break;
    }

    if (nextIndex !== null) {
      const nextItem = enabledItems[nextIndex];
      tabRefs.current.get(nextItem.id)?.focus();
      onChange(nextItem.id);
    }
  }, [items, onChange]);

  const indicatorTransition = shouldReduceMotion
    ? TABS_ANIMATION.reducedMotion.transition
    : TABS_ANIMATION.indicator.transition;

  const Indicator = variant === 'soft'
    ? SoftIndicator
    : variant === 'pills'
      ? PillsIndicator
      : AccentIndicator;

  return (
    <TabsWrapper className={className} $variant={variant}>
      <LayoutGroup id={id}>
        <TabsContainer
          role="tablist"
          aria-label={ariaLabel}
          $fullWidth={fullWidth}
        >
          {items.map((item, index) => {
            const Icon = item.icon;
            const isActive = value === item.id;
            const defaultBadgeVariant = variant === 'accent' ? 'status-primary' : 'primary';
            const badgeVariant = item.badgeVariant || defaultBadgeVariant;

            return (
              <TabButtonWrapper key={item.id}>
                {isActive && (
                  <Indicator
                    layoutId={`${id}-indicator`}
                    transition={indicatorTransition}
                  />
                )}
                <TabButton
                  ref={(el) => {
                    if (el) tabRefs.current.set(item.id, el);
                  }}
                  $active={isActive}
                  $variant={variant}
                  $size={size}
                  $disabled={item.disabled}
                  onClick={() => !item.disabled && onChange(item.id)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  role="tab"
                  aria-selected={isActive}
                  aria-disabled={item.disabled ? 'true' : undefined}
                  aria-controls={`${id}-panel-${item.id}`}
                  id={`${id}-tab-${item.id}`}
                  tabIndex={isActive ? 0 : -1}
                  disabled={item.disabled}
                >
                  {Icon && <Icon aria-hidden="true" />}
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <Badge
                      variant={isActive && variant === 'pills' ? 'neutral-soft' : badgeVariant}
                      size="sm"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </TabButton>
              </TabButtonWrapper>
            );
          })}
        </TabsContainer>
      </LayoutGroup>
    </TabsWrapper>
  );
});

Tabs.displayName = 'Tabs';

// Tab Panel component for content
export const TabPanel: FC<TabPanelProps> = memo(({
  tabId,
  selectedTabId,
  children,
  className,
}) => {
  const isSelected = tabId === selectedTabId;

  if (!isSelected) return null;

  return (
    <div
      role="tabpanel"
      id={`panel-${tabId}`}
      aria-labelledby={`tab-${tabId}`}
      className={className}
      tabIndex={0}
    >
      {children}
    </div>
  );
});

TabPanel.displayName = 'TabPanel';
