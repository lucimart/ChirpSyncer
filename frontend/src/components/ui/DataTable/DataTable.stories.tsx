import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { DataTable, Column } from './DataTable';
import { Badge } from '../Badge';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

const sampleData: User[] = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'active', createdAt: '2024-01-15' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'active', createdAt: '2024-01-12' },
  { id: 3, name: 'Bob Wilson', email: 'bob@example.com', role: 'User', status: 'inactive', createdAt: '2024-01-10' },
  { id: 4, name: 'Alice Brown', email: 'alice@example.com', role: 'Editor', status: 'active', createdAt: '2024-01-08' },
  { id: 5, name: 'Charlie Davis', email: 'charlie@example.com', role: 'User', status: 'inactive', createdAt: '2024-01-05' },
  { id: 6, name: 'Diana Evans', email: 'diana@example.com', role: 'Admin', status: 'active', createdAt: '2024-01-03' },
  { id: 7, name: 'Edward Fox', email: 'edward@example.com', role: 'User', status: 'active', createdAt: '2024-01-01' },
  { id: 8, name: 'Fiona Green', email: 'fiona@example.com', role: 'Editor', status: 'active', createdAt: '2023-12-28' },
  { id: 9, name: 'George Harris', email: 'george@example.com', role: 'User', status: 'inactive', createdAt: '2023-12-25' },
  { id: 10, name: 'Helen Irving', email: 'helen@example.com', role: 'User', status: 'active', createdAt: '2023-12-20' },
  { id: 11, name: 'Ian Jones', email: 'ian@example.com', role: 'Admin', status: 'active', createdAt: '2023-12-15' },
  { id: 12, name: 'Julia King', email: 'julia@example.com', role: 'User', status: 'inactive', createdAt: '2023-12-10' },
];

const columns: Column<User>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'email', header: 'Email', sortable: true },
  { key: 'role', header: 'Role', sortable: true },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    render: (row) => (
      <Badge variant={row.status === 'active' ? 'success' : 'neutral'} size="sm">
        {row.status}
      </Badge>
    ),
  },
  { key: 'createdAt', header: 'Created', sortable: true },
];

const meta: Meta<typeof DataTable> = {
  title: 'UI/DataTable',
  component: DataTable,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof DataTable<User>>;

const SelectableDemo = () => {
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  return (
    <div>
      <p style={{ marginBottom: '16px' }}>
        Selected: {selected.size} item(s)
      </p>
      <DataTable
        columns={columns}
        data={sampleData}
        selectable
        selectedIds={selected}
        onSelectionChange={setSelected}
        pageSize={5}
      />
    </div>
  );
};

export const Default: Story = {
  args: {
    columns,
    data: sampleData,
  },
};

export const WithPagination: Story = {
  args: {
    columns,
    data: sampleData,
    pageSize: 5,
  },
};

export const Selectable: Story = {
  render: () => <SelectableDemo />,
};

export const Empty: Story = {
  args: {
    columns,
    data: [],
    emptyMessage: 'No users found. Try adjusting your filters.',
  },
};

export const CustomPageSize: Story = {
  args: {
    columns,
    data: sampleData,
    pageSize: 3,
  },
};

export const WithCustomRender: Story = {
  args: {
    columns: [
      { key: 'name', header: 'Name', sortable: true },
      {
        key: 'email',
        header: 'Email',
        render: (row) => (
          <a href={`mailto:${row.email}`} style={{ color: '#2563eb' }}>
            {row.email}
          </a>
        ),
      },
      {
        key: 'role',
        header: 'Role',
        render: (row) => (
          <Badge
            variant={row.role === 'Admin' ? 'danger' : row.role === 'Editor' ? 'warning' : 'default'}
            size="sm"
          >
            {row.role}
          </Badge>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => (
          <Badge variant={row.status === 'active' ? 'success' : 'neutral'} size="sm">
            {row.status}
          </Badge>
        ),
      },
    ],
    data: sampleData.slice(0, 5),
  },
};

export const NoSorting: Story = {
  args: {
    columns: columns.map((col) => ({ ...col, sortable: false })),
    data: sampleData.slice(0, 5),
  },
};
