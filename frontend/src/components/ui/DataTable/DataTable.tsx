'use client';

import { useState, useMemo } from 'react';
import styled from 'styled-components';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const TableContainer = styled.div`
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Thead = styled.thead`
  background-color: ${({ theme }) => theme.colors.background.tertiary};
`;

const Th = styled.th<{ $sortable?: boolean }>`
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  text-align: left;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.secondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  cursor: ${({ $sortable }) => ($sortable ? 'pointer' : 'default')};
  user-select: none;
  white-space: nowrap;

  &:hover {
    background-color: ${({ $sortable, theme }) =>
      $sortable ? theme.colors.background.secondary : 'transparent'};
  }
`;

const ThContent = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const SortIcon = styled.span<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.primary[600] : theme.colors.text.tertiary};
`;

const Tbody = styled.tbody``;

const Tr = styled.tr<{ $selectable?: boolean; $selected?: boolean }>`
  background-color: ${({ $selected, theme }) =>
    $selected ? theme.colors.primary[50] : 'transparent'};

  &:hover {
    background-color: ${({ theme }) => theme.colors.background.secondary};
  }

  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  }
`;

const Td = styled.td`
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
`;

const Pagination = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  background-color: ${({ theme }) => theme.colors.background.tertiary};
`;

const PaginationInfo = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const PaginationControls = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const PageButton = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: ${({ theme }) => `0 ${theme.spacing[2]}`};
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary[600] : theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background-color: ${({ $active, theme }) =>
    $active ? theme.colors.primary[600] : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? 'white' : theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover:not(:disabled) {
    background-color: ${({ $active, theme }) =>
      $active ? theme.colors.primary[700] : theme.colors.background.secondary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  padding: ${({ theme }) => theme.spacing[10]};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T extends { id: string | number }> {
  columns: Column<T>[];
  data: T[];
  selectable?: boolean;
  selectedIds?: Set<string | number>;
  onSelectionChange?: (ids: Set<string | number>) => void;
  pageSize?: number;
  emptyMessage?: string;
}

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  pageSize = 10,
  emptyMessage = 'No data available',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  const sortedData = useMemo(() => {
    if (!sortKey) return data;

    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey];
      const bVal = (b as Record<string, unknown>)[sortKey];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortKey, sortDirection]);

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = () => {
    if (!onSelectionChange) return;

    const allIds = new Set(paginatedData.map((row) => row.id));
    const allSelected = paginatedData.every((row) => selectedIds.has(row.id));

    if (allSelected) {
      const newSelection = new Set(selectedIds);
      allIds.forEach((id) => newSelection.delete(id));
      onSelectionChange(newSelection);
    } else {
      const newSelection = new Set(selectedIds);
      allIds.forEach((id) => newSelection.add(id));
      onSelectionChange(newSelection);
    }
  };

  const handleSelectRow = (id: string | number) => {
    if (!onSelectionChange) return;

    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    onSelectionChange(newSelection);
  };

  const allPageSelected =
    paginatedData.length > 0 &&
    paginatedData.every((row) => selectedIds.has(row.id));

  if (data.length === 0) {
    return (
      <TableContainer>
        <EmptyState>{emptyMessage}</EmptyState>
      </TableContainer>
    );
  }

  return (
    <TableContainer>
      <Table>
        <Thead>
          <tr>
            {selectable && (
              <Th style={{ width: '40px' }} scope="col">
                <Checkbox
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={handleSelectAll}
                  aria-label="Select all rows on this page"
                />
              </Th>
            )}
            {columns.map((col) => (
              <Th
                key={col.key}
                $sortable={col.sortable}
                onClick={() => col.sortable && handleSort(col.key)}
                style={col.width ? { width: col.width } : undefined}
              >
                <ThContent>
                  {col.header}
                  {col.sortable && (
                    <SortIcon $active={sortKey === col.key}>
                      {sortKey === col.key && sortDirection === 'asc' ? (
                        <ChevronUp size={14} />
                      ) : sortKey === col.key && sortDirection === 'desc' ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronUp size={14} style={{ opacity: 0.3 }} />
                      )}
                    </SortIcon>
                  )}
                </ThContent>
              </Th>
            ))}
          </tr>
        </Thead>
        <Tbody>
          {paginatedData.map((row) => (
            <Tr
              key={row.id}
              $selectable={selectable}
              $selected={selectedIds.has(row.id)}
            >
              {selectable && (
                <Td>
                  <Checkbox
                    type="checkbox"
                    checked={selectedIds.has(row.id)}
                    onChange={() => handleSelectRow(row.id)}
                    aria-label={`Select row ${row.id}`}
                  />
                </Td>
              )}
              {columns.map((col) => (
                <Td key={col.key}>
                  {col.render
                    ? col.render(row)
                    : String((row as Record<string, unknown>)[col.key] ?? '')}
                </Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>

      {totalPages > 1 && (
        <Pagination>
          <PaginationInfo>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, sortedData.length)} of{' '}
            {sortedData.length} results
          </PaginationInfo>
          <PaginationControls>
            <PageButton
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Go to previous page"
            >
              <ChevronLeft size={16} />
            </PageButton>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <PageButton
                  key={pageNum}
                  $active={currentPage === pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </PageButton>
              );
            })}
            <PageButton
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Go to next page"
            >
              <ChevronRight size={16} />
            </PageButton>
          </PaginationControls>
        </Pagination>
      )}
    </TableContainer>
  );
}
