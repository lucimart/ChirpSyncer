'use client';

export type PaginationSize = 'sm' | 'md' | 'lg';

export interface PaginationProps {
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Called when page changes */
  onPageChange: (page: number) => void;
  /** Size preset */
  size?: PaginationSize;
  /** Show items info */
  showInfo?: boolean;
  /** Total number of items (for info display) */
  totalItems?: number;
  /** Items per page (for info display) */
  pageSize?: number;
  /** Custom className */
  className?: string;
  /** Accessible label for navigation */
  'aria-label'?: string;
}

export const PAGINATION_SIZES: Record<PaginationSize, { minWidth: number; height: number; fontSize: string; iconSize: number }> = {
  sm: { minWidth: 32, height: 32, fontSize: 'xs', iconSize: 14 },
  md: { minWidth: 36, height: 36, fontSize: 'sm', iconSize: 16 },
  lg: { minWidth: 44, height: 44, fontSize: 'base', iconSize: 18 },
};
