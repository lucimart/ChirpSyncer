'use client';

import { useState } from 'react';
import styled from 'styled-components';
import { Search, Trash2, Shield, ShieldOff, UserCheck, UserX } from 'lucide-react';
import { Button, Card, Modal, Input, Badge, PageHeader, EmptyState, DataTable, Column } from '@/components/ui';
import {
  useAdminUsers,
  useDeleteAdminUser,
  useToggleUserActive,
  useToggleUserAdmin,
} from '@/hooks/useAdminUsers';
import type { AdminUser } from '@/types';

const SearchBox = styled.div`
  position: relative;
  width: 300px;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: ${({ theme }) => theme.spacing[3]};
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const SearchInput = styled.input`
  width: 100%;
  height: 40px;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]} ${theme.spacing[2]} ${theme.spacing[10]}`};
  font-size: ${({ theme }) => theme.fontSizes.base};
  color: ${({ theme }) => theme.colors.text.primary};
  background-color: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary[100]};
  }
`;

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const ModalContent = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[4]};
`;

const ModalText = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const ModalUsername = styled.strong`
  color: ${({ theme }) => theme.colors.text.primary};
`;

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [deleteModalUser, setDeleteModalUser] = useState<AdminUser | null>(null);

  const { data: users, isLoading, error } = useAdminUsers({ search: search || undefined });
  const deleteMutation = useDeleteAdminUser();
  const toggleActiveMutation = useToggleUserActive();
  const toggleAdminMutation = useToggleUserAdmin();

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString();
  };

  const handleDelete = async () => {
    if (!deleteModalUser) return;
    await deleteMutation.mutateAsync(deleteModalUser.id);
    setDeleteModalUser(null);
  };

  const columns: Column<AdminUser>[] = [
    { key: 'username', header: 'Username' },
    { key: 'email', header: 'Email' },
    {
      key: 'status',
      header: 'Status',
      render: (user) => (
        <Badge variant={user.is_active ? 'success-soft' : 'danger'} size="sm">
          {user.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (user) => (
        <Badge variant={user.is_admin ? 'primary' : 'neutral'} size="sm">
          {user.is_admin ? (
            <>
              <Shield size={12} /> Admin
            </>
          ) : (
            'User'
          )}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (user) => formatDate(user.created_at),
    },
    {
      key: 'last_login',
      header: 'Last Login',
      render: (user) => formatDate(user.last_login),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (user) => (
        <Actions>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleActiveMutation.mutate(user.id)}
            disabled={toggleActiveMutation.isPending}
            title={user.is_active ? 'Deactivate user' : 'Activate user'}
          >
            {user.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleAdminMutation.mutate(user.id)}
            disabled={toggleAdminMutation.isPending}
            title={user.is_admin ? 'Remove admin' : 'Make admin'}
          >
            {user.is_admin ? <ShieldOff size={16} /> : <Shield size={16} />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteModalUser(user)}
            title="Delete user"
          >
            <Trash2 size={16} />
          </Button>
        </Actions>
      ),
    },
  ];

  if (error) {
    return (
      <Card padding="lg">
        <EmptyState title={`Error loading users: ${error.message}`} />
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        title="User Management"
        actions={
          <SearchBox>
            <SearchIcon>
              <Search size={18} />
            </SearchIcon>
            <SearchInput
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </SearchBox>
        }
      />

      {isLoading ? (
        <Card padding="lg">
          <EmptyState title="Loading users..." />
        </Card>
      ) : users && users.length > 0 ? (
        <DataTable
          columns={columns}
          data={users}
          emptyMessage={search ? `No users found matching "${search}"` : 'No users found'}
        />
      ) : (
        <Card padding="lg">
          <EmptyState
            title={search ? `No users found matching "${search}"` : 'No users found'}
          />
        </Card>
      )}

      <Modal
        isOpen={!!deleteModalUser}
        onClose={() => setDeleteModalUser(null)}
        title="Delete User"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModalUser(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteMutation.isPending}
            >
              Delete User
            </Button>
          </>
        }
      >
        <ModalContent>
          <ModalText>
            Are you sure you want to delete user{' '}
            <ModalUsername>{deleteModalUser?.username}</ModalUsername>?
          </ModalText>
          <ModalText>This action cannot be undone.</ModalText>
        </ModalContent>
      </Modal>
    </div>
  );
}
