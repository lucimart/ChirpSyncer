'use client';

import { HTMLAttributes, ReactNode } from 'react';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';
export type CardVariant = 'default' | 'outlined' | 'elevated' | 'filled';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Card content */
  children: ReactNode;
  /** Padding preset */
  padding?: CardPadding;
  /** Visual variant */
  variant?: CardVariant;
  /** Makes card interactive with hover effect */
  hoverable?: boolean;
  /** Makes card appear as selected */
  selected?: boolean;
  /** Disable hover interactions */
  disabled?: boolean;
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Render action buttons in the header */
  action?: ReactNode;
}

export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
  /** Heading level for accessibility */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Alignment of footer content */
  align?: 'start' | 'center' | 'end' | 'between';
}

export const CARD_PADDING: Record<CardPadding, string> = {
  none: '0',
  sm: '12px',
  md: '16px',
  lg: '24px',
};

export const CARD_ANIMATION = {
  hover: {
    y: -2,
    transition: { type: 'spring', stiffness: 400, damping: 25 },
  },
  tap: {
    scale: 0.98,
    transition: { type: 'spring', stiffness: 400, damping: 25 },
  },
} as const;
