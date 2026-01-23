'use client';

import { ElementType, ReactNode } from 'react';
import { BadgeProps } from '../Badge';

export type TabVariant = 'soft' | 'accent' | 'pills';
export type TabSize = 'sm' | 'md' | 'lg';

export interface TabItem {
  /** Unique identifier */
  id: string;
  /** Tab label */
  label: string;
  /** Optional icon component */
  icon?: ElementType;
  /** Badge content */
  badge?: string | number;
  /** Badge variant */
  badgeVariant?: BadgeProps['variant'];
  /** Disable this tab */
  disabled?: boolean;
}

export interface TabsProps {
  /** Tab items */
  items: TabItem[];
  /** Currently selected tab id */
  value: string;
  /** Called when tab changes */
  onChange: (id: string) => void;
  /** Custom className */
  className?: string;
  /** Visual variant */
  variant?: TabVariant;
  /** Size preset */
  size?: TabSize;
  /** Full width tabs */
  fullWidth?: boolean;
  /** ID for the tablist (for aria-labelledby) */
  id?: string;
  /** Accessible label for the tablist */
  'aria-label'?: string;
}

export interface TabPanelProps {
  /** Tab id this panel corresponds to */
  tabId: string;
  /** Currently selected tab */
  selectedTabId: string;
  /** Panel content */
  children: ReactNode;
  /** Custom className */
  className?: string;
}

export const TAB_SIZES: Record<TabSize, { padding: string; fontSize: string }> = {
  sm: { padding: '6px 12px', fontSize: 'xs' },
  md: { padding: '8px 16px', fontSize: 'sm' },
  lg: { padding: '10px 20px', fontSize: 'base' },
};

export const TABS_ANIMATION = {
  indicator: {
    layout: true,
    layoutId: 'tab-indicator',
    transition: {
      type: 'spring' as const,
      stiffness: 500,
      damping: 35,
    },
  },
  reducedMotion: {
    transition: { duration: 0 },
  },
};
