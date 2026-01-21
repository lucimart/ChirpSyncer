'use client';

import { useState } from 'react';
import styled from 'styled-components';
import { Search, Trash2, Shield, ShieldOff, UserCheck, UserX } from 'lucide-react';
import { Button, Card, Modal, Input } from '@/components/ui';
import {
  useAdminUsers,
  useDeleteAdminUser,
  useToggleUserActive,
  useToggleUserAdmin,
} from '@/hooks/useAdminUsers';
import type { AdminUser } from '@/types';

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  gap: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

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

const UsersTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHead = styled.thead`
  background-color: ${({ theme }) => theme.colors.background.secondary};
`;

const TableHeader = styled.th`
  text-align: left;
  padding: ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.secondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr`
  &:hover {
    background-color: ${({ theme }) => theme.colors.background.secondary};
  }
`;

const TableCell = styled.td`
  padding: ${({ theme }) => theme.spacing[3]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const StatusBadge = styled.span<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  background-color: ${({ $active, theme }) =>
    $active ? theme.colors.success[50] : theme.colors.danger[50]};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.success[700] : theme.colors.danger[700]};
`;

const AdminBadge = styled.span<{ $isAdmin: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  background-color: ${({ $isAdmin, theme }) =>
    $isAdmin ? theme.colors.primary[50] : theme.colors.background.secondary};
  color: ${({ $isAdmin, theme }) =>
    $isAdmin ? theme.colors.primary[700] : theme.colors.text.tertiary};
`;

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[10]};
  color: ${({ theme }) => theme.colors.text.secondary};
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

  if (error) {
    return (
      <Card padding="lg">
        <EmptyState>Error loading users: {error.message}</EmptyState>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader>
        <PageTitle>User Management</PageTitle>
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
      </PageHeader>

      {isLoading ? (
        <Card padding="lg">
          <EmptyState>Loading users...</EmptyState>
        </Card>
      ) : users && users.length > 0 ? (
        <Card padding="none">
          <UsersTable>
            <TableHead>
              <tr>
                <TableHeader>Username</TableHeader>
                <TableHeader>Email</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Role</TableHeader>
                <TableHeader>Created</TableHeader>
                <TableHeader>Last Login</TableHeader>
                <TableHeader>Actions</TableHeader>
              </tr>
            </TableHead>
            <TableBody>
              {users.map((user: AdminUser) => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <StatusBadge $active={user.is_active}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <AdminBadge $isAdmin={user.is_admin}>
                      {user.is_admin ? (
                        <>
                          <Shield size={12} /> Admin
                        </>
                      ) : (
                        'User'
                      )}
                    </AdminBadge>
                  </TableCell>
                  <TableCell>{formatDate(user.created_at)}</TableCell>
                  <TableCell>{formatDate(user.last_login)}</TableCell>
                  <TableCell>
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </UsersTable>
        </Card>
      ) : (
        <Card padding="lg">
          <EmptyState>
            {search ? `No users found matching "${search}"` : 'No users found'}
          </EmptyState>
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
