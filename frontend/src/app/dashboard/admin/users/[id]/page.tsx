'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import {
  ArrowLeft,
  User,
  Mail,
  Shield,
  ShieldCheck,
  Calendar,
  Clock,
  Save,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { Button, Card, Input } from '@/components/ui';
import { api } from '@/lib/api';
import type { AdminUser } from '@/types';

const PageHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  background: none;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm};

  &:hover {
    background-color: ${({ theme }) => theme.colors.background.secondary};
  }
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: ${({ theme }) => theme.spacing[6]};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const FormGrid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  &:last-child {
    border-bottom: none;
  }
`;

const InfoIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background-color: ${({ theme }) => theme.colors.primary[50]};
  color: ${({ theme }) => theme.colors.primary[600]};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const InfoContent = styled.div`
  flex: 1;
`;

const InfoLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const InfoValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.md};
  color: ${({ theme }) => theme.colors.text.primary};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const StatusBadge = styled.span<{ $active: boolean }>`
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  background-color: ${({ $active, theme }) =>
    $active ? theme.colors.success[100] : theme.colors.danger[100]};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.success[700] : theme.colors.danger[700]};
`;

const FormActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[4]};
`;

const QuickActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const ActionButton = styled.button<{ $variant?: 'danger' }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  background-color: ${({ $variant, theme }) =>
    $variant === 'danger' ? theme.colors.danger[50] : theme.colors.background.secondary};
  border: 1px solid ${({ $variant, theme }) =>
    $variant === 'danger' ? theme.colors.danger[200] : theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ $variant, theme }) =>
    $variant === 'danger' ? theme.colors.danger[700] : theme.colors.text.primary};
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  width: 100%;
  justify-content: flex-start;

  &:hover {
    background-color: ${({ $variant, theme }) =>
      $variant === 'danger' ? theme.colors.danger[100] : theme.colors.background.tertiary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: ${({ theme }) => theme.colors.danger[600]};
  padding: ${({ theme }) => theme.spacing[3]};
  background-color: ${({ theme }) => theme.colors.danger[50]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const SuccessMessage = styled.div`
  color: ${({ theme }) => theme.colors.success[600]};
  padding: ${({ theme }) => theme.spacing[3]};
  background-color: ${({ theme }) => theme.colors.success[50]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const LoadingState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[10]};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = params.id as string;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: user, isLoading } = useQuery<AdminUser>({
    queryKey: ['admin-user', userId],
    queryFn: async () => {
      const response = await api.getAdminUser(userId);
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to load user');
      }
      setEmail(response.data.email);
      return response.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { email?: string; password?: string }) => {
      const response = await api.updateAdminUser(userId, data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update user');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSuccess('User updated successfully');
      setPassword('');
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async () => {
      const response = await api.toggleUserActive(userId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to toggle user status');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSuccess('User status updated');
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async () => {
      const response = await api.toggleUserAdmin(userId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to toggle admin status');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSuccess('Admin status updated');
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await api.deleteAdminUser(userId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete user');
      }
    },
    onSuccess: () => {
      router.push('/dashboard/admin/users');
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSave = () => {
    setError(null);
    const updates: { email?: string; password?: string } = {};

    if (email !== user?.email) {
      updates.email = email;
    }
    if (password) {
      updates.password = password;
    }

    if (Object.keys(updates).length === 0) {
      setError('No changes to save');
      return;
    }

    updateMutation.mutate(updates);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  };

  if (isLoading) {
    return (
      <Card padding="lg">
        <LoadingState>Loading user...</LoadingState>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card padding="lg">
        <ErrorMessage>User not found</ErrorMessage>
        <Button onClick={() => router.push('/dashboard/admin/users')}>
          Back to Users
        </Button>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader>
        <BackButton onClick={() => router.push('/dashboard/admin/users')}>
          <ArrowLeft size={16} />
          Back
        </BackButton>
        <PageTitle>{user.username}</PageTitle>
        <StatusBadge $active={user.is_active}>
          {user.is_active ? 'Active' : 'Inactive'}
        </StatusBadge>
        {user.is_admin && (
          <StatusBadge $active={true}>
            Admin
          </StatusBadge>
        )}
      </PageHeader>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}

      <ContentGrid>
        <Card padding="lg">
          <SectionTitle>
            <User size={20} />
            Edit User
          </SectionTitle>

          <FormGrid>
            <Input
              label="Username"
              value={user.username}
              disabled
              fullWidth
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />
            <Input
              label="New Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep current"
              fullWidth
            />
          </FormGrid>

          <FormActions>
            <Button
              onClick={handleSave}
              isLoading={updateMutation.isPending}
            >
              <Save size={16} />
              Save Changes
            </Button>
          </FormActions>
        </Card>

        <div>
          <Card padding="lg" style={{ marginBottom: '1.5rem' }}>
            <SectionTitle>
              <Calendar size={20} />
              User Info
            </SectionTitle>

            <InfoRow>
              <InfoIcon>
                <Mail size={18} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Email</InfoLabel>
                <InfoValue>{user.email}</InfoValue>
              </InfoContent>
            </InfoRow>

            <InfoRow>
              <InfoIcon>
                <Calendar size={18} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Created</InfoLabel>
                <InfoValue>{formatDate(user.created_at)}</InfoValue>
              </InfoContent>
            </InfoRow>

            <InfoRow>
              <InfoIcon>
                <Clock size={18} />
              </InfoIcon>
              <InfoContent>
                <InfoLabel>Last Login</InfoLabel>
                <InfoValue>{formatDate(user.last_login)}</InfoValue>
              </InfoContent>
            </InfoRow>
          </Card>

          <Card padding="lg">
            <SectionTitle>
              <Shield size={20} />
              Quick Actions
            </SectionTitle>

            <QuickActions>
              <ActionButton
                onClick={() => toggleActiveMutation.mutate()}
                disabled={toggleActiveMutation.isPending}
              >
                {user.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                {user.is_active ? 'Deactivate User' : 'Activate User'}
              </ActionButton>

              <ActionButton
                onClick={() => toggleAdminMutation.mutate()}
                disabled={toggleAdminMutation.isPending}
              >
                <ShieldCheck size={18} />
                {user.is_admin ? 'Remove Admin' : 'Make Admin'}
              </ActionButton>

              <ActionButton
                $variant="danger"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                <Trash2 size={18} />
                Delete User
              </ActionButton>
            </QuickActions>
          </Card>
        </div>
      </ContentGrid>
    </div>
  );
}
