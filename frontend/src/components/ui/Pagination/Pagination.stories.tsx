import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { Pagination } from './Pagination';

const meta: Meta<typeof Pagination> = {
  title: 'UI/Pagination',
  component: Pagination,
  parameters: {
    layout: 'centered',
  },
  args: {
    currentPage: 1,
    totalPages: 10,
    size: 'md',
    showInfo: false,
  },
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['sm', 'md'],
    },
    onPageChange: { action: 'pageChange' },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof Pagination>;

export const Default: Story = {
  args: {
    currentPage: 1,
    totalPages: 10,
  },
};

export const Interactive: Story = {
  render: function InteractivePagination() {
    const [currentPage, setCurrentPage] = useState(1);
    return (
      <Pagination
        currentPage={currentPage}
        totalPages={10}
        onPageChange={setCurrentPage}
      />
    );
  },
};

export const MiddlePage: Story = {
  args: {
    currentPage: 5,
    totalPages: 10,
  },
};

export const LastPage: Story = {
  args: {
    currentPage: 10,
    totalPages: 10,
  },
};

export const SmallSize: Story = {
  args: {
    currentPage: 3,
    totalPages: 10,
    size: 'sm',
  },
};

export const FewPages: Story = {
  args: {
    currentPage: 2,
    totalPages: 3,
  },
};

export const WithInfo: Story = {
  args: {
    currentPage: 2,
    totalPages: 10,
    showInfo: true,
    totalItems: 100,
    pageSize: 10,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '600px' }}>
        <Story />
      </div>
    ),
  ],
};

export const WithInfoFirstPage: Story = {
  args: {
    currentPage: 1,
    totalPages: 5,
    showInfo: true,
    totalItems: 47,
    pageSize: 10,
  },
  decorators: [
    (Story) => (
      <div style={{ width: '600px' }}>
        <Story />
      </div>
    ),
  ],
};

export const ManyPages: Story = {
  args: {
    currentPage: 50,
    totalPages: 100,
  },
};
