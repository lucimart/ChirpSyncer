'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import { Plus, Trash2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { Button, Card, Modal, Input } from '@/components/ui';
import type { Credential } from '@/types';

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

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

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[10]};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const Select = styled.select`
  width: 100%;
  height: 40px;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  font-size: ${({ theme }) => theme.fontSizes.base};
  color: ${({ theme }) => theme.colors.text.primary};
  background-color: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary[100]};
  }
`;

const Label = styled.label`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  display: block;
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
`;

export default function CredentialsPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [platform, setPlatform] = useState('twitter');
  const [credentialType, setCredentialType] = useState('scraping');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [testingId, setTestingId] = useState<number | null>(null);

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
      setIsModalOpen(false);
      resetForm();
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
      <PageHeader>
        <PageTitle>Credentials</PageTitle>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          Add Credential
        </Button>
      </PageHeader>

      {isLoading ? (
        <Card padding="lg">
          <EmptyState>Loading credentials...</EmptyState>
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
                  <CredentialType>{cred.credential_type}</CredentialType>
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
        <Card padding="lg">
          <EmptyState>
            No credentials yet. Add your first credential to start syncing.
          </EmptyState>
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
          <FieldGroup>
            <Label>Platform</Label>
            <Select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
            >
              <option value="twitter">Twitter</option>
              <option value="bluesky">Bluesky</option>
            </Select>
          </FieldGroup>

          <FieldGroup>
            <Label>Credential Type</Label>
            <Select
              value={credentialType}
              onChange={(e) => setCredentialType(e.target.value)}
            >
              <option value="scraping">Scraping (username/password)</option>
              <option value="api">API Keys</option>
            </Select>
          </FieldGroup>

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
