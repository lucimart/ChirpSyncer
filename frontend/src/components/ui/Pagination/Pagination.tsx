'use client';

import { memo, FC, useCallback } from 'react';
import styled from 'styled-components';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { PaginationProps, PaginationSize, PAGINATION_SIZES } from './types';

const PaginationNav = styled.nav`
  display: flex;
  justify-content: center;
  align-items: center;
`;

const PaginationContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const PaginationWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const PaginationInfo = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  white-space: nowrap;
`;

const PageButton = styled.button<{ $active?: boolean; $size: PaginationSize }>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: ${({ $size }) => PAGINATION_SIZES[$size].minWidth}px;
  height: ${({ $size }) => PAGINATION_SIZES[$size].height}px;
  padding: ${({ theme }) => `0 ${theme.spacing[2]}`};
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary[600] : theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background-color: ${({ $active, theme }) =>
    $active ? theme.colors.primary[600] : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? 'white' : theme.colors.text.primary};
  font-size: ${({ theme, $size }) =>
    theme.fontSizes[PAGINATION_SIZES[$size].fontSize as keyof typeof theme.fontSizes]};
  font-weight: ${({ theme, $active }) => $active ? theme.fontWeights.medium : theme.fontWeights.normal};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover:not(:disabled) {
    background-color: ${({ $active, theme }) =>
      $active ? theme.colors.primary[700] : theme.colors.background.secondary};
    border-color: ${({ $active, theme }) =>
      $active ? theme.colors.primary[700] : theme.colors.border.dark};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary[500]};
    outline-offset: 2px;
  }

  &:disabled {
    background-color: ${({ theme }) => theme.colors.neutral[100]};
    color: ${({ theme }) => theme.colors.neutral[400]};
    border-color: ${({ theme }) => theme.colors.neutral[200]};
    cursor: not-allowed;
  }
`;

const Ellipsis = styled.span<{ $size: PaginationSize }>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: ${({ $size }) => PAGINATION_SIZES[$size].minWidth}px;
  height: ${({ $size }) => PAGINATION_SIZES[$size].height}px;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: ${({ theme, $size }) =>
    theme.fontSizes[PAGINATION_SIZES[$size].fontSize as keyof typeof theme.fontSizes]};
  user-select: none;
`;

function getPageNumbers(currentPage: number, totalPages: number): (number | 'ellipsis-start' | 'ellipsis-end')[] {
  const maxVisible = 7;

  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [];

  // Always show first page
  pages.push(1);

  if (currentPage <= 3) {
    // Near start: 1, 2, 3, 4, ..., last
    for (let i = 2; i <= 4; i++) {
      pages.push(i);
    }
    pages.push('ellipsis-end');
    pages.push(totalPages);
  } else if (currentPage >= totalPages - 2) {
    // Near end: 1, ..., n-3, n-2, n-1, n
    pages.push('ellipsis-start');
    for (let i = totalPages - 3; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    // Middle: 1, ..., curr-1, curr, curr+1, ..., last
    pages.push('ellipsis-start');
    for (let i = currentPage - 1; i <= currentPage + 1; i++) {
      pages.push(i);
    }
    pages.push('ellipsis-end');
    pages.push(totalPages);
  }

  return pages;
}

export const Pagination: FC<PaginationProps> = memo(({
  currentPage,
  totalPages,
  onPageChange,
  size = 'md',
  showInfo = false,
  totalItems,
  pageSize,
  className,
  'aria-label': ariaLabel = 'Pagination',
}) => {
  const handlePrevious = useCallback(() => {
    onPageChange(Math.max(1, currentPage - 1));
  }, [currentPage, onPageChange]);

  const handleNext = useCallback(() => {
    onPageChange(Math.min(totalPages, currentPage + 1));
  }, [currentPage, totalPages, onPageChange]);

  const handleFirst = useCallback(() => {
    onPageChange(1);
  }, [onPageChange]);

  const handleLast = useCallback(() => {
    onPageChange(totalPages);
  }, [totalPages, onPageChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        handlePrevious();
        break;
      case 'ArrowRight':
        e.preventDefault();
        handleNext();
        break;
      case 'Home':
        e.preventDefault();
        handleFirst();
        break;
      case 'End':
        e.preventDefault();
        handleLast();
        break;
    }
  }, [handlePrevious, handleNext, handleFirst, handleLast]);

  if (totalPages <= 1) return null;

  const pageNumbers = getPageNumbers(currentPage, totalPages);
  const iconSize = PAGINATION_SIZES[size].iconSize;

  const controls = (
    <PaginationContainer onKeyDown={handleKeyDown}>
      {totalPages > 5 && (
        <PageButton
          $size={size}
          onClick={handleFirst}
          disabled={currentPage === 1}
          aria-label="Go to first page"
        >
          <ChevronsLeft size={iconSize} />
        </PageButton>
      )}
      <PageButton
        $size={size}
        onClick={handlePrevious}
        disabled={currentPage === 1}
        aria-label="Go to previous page"
      >
        <ChevronLeft size={iconSize} />
      </PageButton>

      {pageNumbers.map((item, index) => {
        if (item === 'ellipsis-start' || item === 'ellipsis-end') {
          return (
            <Ellipsis key={item} $size={size} aria-hidden="true">
              ...
            </Ellipsis>
          );
        }

        return (
          <PageButton
            key={item}
            $size={size}
            $active={currentPage === item}
            onClick={() => onPageChange(item)}
            aria-label={`Go to page ${item}`}
            aria-current={currentPage === item ? 'page' : undefined}
          >
            {item}
          </PageButton>
        );
      })}

      <PageButton
        $size={size}
        onClick={handleNext}
        disabled={currentPage === totalPages}
        aria-label="Go to next page"
      >
        <ChevronRight size={iconSize} />
      </PageButton>
      {totalPages > 5 && (
        <PageButton
          $size={size}
          onClick={handleLast}
          disabled={currentPage === totalPages}
          aria-label="Go to last page"
        >
          <ChevronsRight size={iconSize} />
        </PageButton>
      )}
    </PaginationContainer>
  );

  if (showInfo && totalItems !== undefined && pageSize !== undefined) {
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    return (
      <PaginationWrapper className={className}>
        <PaginationInfo aria-live="polite">
          Showing {startItem} to {endItem} of {totalItems} results
        </PaginationInfo>
        <PaginationNav aria-label={ariaLabel}>
          {controls}
        </PaginationNav>
      </PaginationWrapper>
    );
  }

  return (
    <PaginationNav className={className} aria-label={ariaLabel}>
      {controls}
    </PaginationNav>
  );
});

Pagination.displayName = 'Pagination';
