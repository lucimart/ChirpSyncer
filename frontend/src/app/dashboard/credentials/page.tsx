'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import { Plus, Trash2, CheckCircle, XCircle, RefreshCw, Key } from 'lucide-react';
import { api } from '@/lib/api';
import { Button, Card, Modal, Input, EmptyState, PageHeader, Select } from '@/components/ui';
import { ApiErrorDisplay } from '@/components/error-resolution';
import type { Credential } from '@/types';

const CredentialsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const CredentialCard = styled(Card)`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const CredentialInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const PlatformBadge = styled.span<{ $platform: string }>`
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[3]}`};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  text-transform: capitalize;
  background-color: ${({ $platform, theme }) =>
    $platform === 'twitter' ? '#1DA1F2' : '#0085FF'};
  color: white;
`;

const CredentialDetails = styled.div``;

const CredentialType = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  text-transform: capitalize;
`;

const CredentialMeta = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: ${({ theme }) => theme.spacing[1]};
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

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

export default function CredentialsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [platform, setPlatform] = useState('twitter');
  const [credentialType, setCredentialType] = useState('scraping');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);

  const { data: credentials, isLoading } = useQuery({
    queryKey: ['credentials'],
    queryFn: async () => {
      const response = await api.getCredentials();
      if (response.success && response.data) {
        return response.data;
      }
      return [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      return api.addCredential({
        platform,
        credential_type: credentialType,
        credentials: { username, password },
      });
    },
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['credentials'] });
        setIsModalOpen(false);
        resetForm();
        setAddError(null);
      } else {
        setAddError(response.error || 'Failed to add credential');
      }
    },
    onError: (error) => {
      setAddError(error instanceof Error ? error.message : 'Failed to add credential');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteCredential(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: number) => api.testCredential(id),
    onSuccess: (response) => {
      if (!response.success) {
        setTestError(response.error || 'Credential test failed');
      } else if (response.data && !response.data.valid) {
        setTestError(response.data.message || 'Credential is invalid');
      } else {
        setTestError(null);
      }
    },
    onError: (error) => {
      setTestError(error instanceof Error ? error.message : 'Credential test failed');
    },
    onSettled: () => {
      setTestingId(null);
    },
  });

  const resetForm = () => {
    setPlatform('twitter');
    setCredentialType('scraping');
    setUsername('');
    setPassword('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate();
  };

  const handleTest = (id: number) => {
    setTestingId(id);
    testMutation.mutate(id);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div>
      <PageHeader
        title="Credentials"
        actions={
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus size={18} />
            Add Credential
          </Button>
        }
      />

      {/* Contextual Error Display */}
      <ApiErrorDisplay
        error={testError}
        onRetry={testingId ? () => handleTest(testingId) : undefined}
        onDismiss={() => setTestError(null)}
      />

      {isLoading ? (
        <Card padding="lg">
          <EmptyState title="Loading credentials..." />
        </Card>
      ) : credentials && credentials.length > 0 ? (
        <CredentialsList>
          {credentials.map((cred: Credential) => (
              <CredentialCard key={cred.id} padding="md">
                <CredentialInfo>
                  <PlatformBadge $platform={cred.platform}>
                    {cred.platform}
                  </PlatformBadge>
                  <CredentialDetails>
                    <CredentialType>
                      {cred.credential_type === 'api' ? 'API' : cred.credential_type}
                    </CredentialType>
                    <CredentialMeta>
                      Added: {formatDate(cred.created_at)} · Last used:{' '}
                      {formatDate(cred.last_used)}
                    </CredentialMeta>
                  </CredentialDetails>
                </CredentialInfo>
                <Actions>
                <StatusBadge $active={cred.is_active}>
                  {cred.is_active ? (
                    <>
                      <CheckCircle size={12} /> Active
                    </>
                  ) : (
                    <>
                      <XCircle size={12} /> Inactive
                    </>
                  )}
                </StatusBadge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTest(cred.id)}
                  disabled={testingId === cred.id}
                >
                  <RefreshCw
                    size={16}
                    className={testingId === cred.id ? 'animate-spin' : ''}
                  />
                  Test
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(cred.id)}
                >
                  <Trash2 size={16} />
                </Button>
              </Actions>
            </CredentialCard>
          ))}
        </CredentialsList>
      ) : (
        <Card padding="none">
          <EmptyState
            icon={Key}
            title="No credentials yet"
            description="Add your first credential to start syncing your social accounts."
            action={
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus size={18} />
                Add Credential
              </Button>
            }
          />
        </Card>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Credential"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              isLoading={addMutation.isPending}
            >
              Add Credential
            </Button>
          </>
        }
      >
        <Form onSubmit={handleSubmit}>
          {/* Error display in modal */}
          <ApiErrorDisplay
            error={addError}
            onDismiss={() => setAddError(null)}
          />
          <Select
            label="Platform"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            options={[
              { value: 'twitter', label: 'Twitter' },
              { value: 'bluesky', label: 'Bluesky' },
            ]}
            fullWidth
          />

          <Select
            label="Credential Type"
            value={credentialType}
            onChange={(e) => setCredentialType(e.target.value)}
            options={[
              { value: 'scraping', label: 'Scraping (username/password)' },
              { value: 'api', label: 'API Keys' },
            ]}
            fullWidth
          />

          <Input
            label="Username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            required
            fullWidth
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            required
            fullWidth
          />
        </Form>
      </Modal>
    </div>
  );
}
