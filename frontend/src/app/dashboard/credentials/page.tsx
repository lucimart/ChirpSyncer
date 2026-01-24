'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, CheckCircle, XCircle, RefreshCw, Key } from 'lucide-react';
import { api } from '@/lib/api';
import {
  Button,
  Card,
  Modal,
  Input,
  EmptyState,
  PageHeader,
  Select,
  Badge,
  Form,
  Stack,
  SmallText,
  Caption,
} from '@/components/ui';
import { ApiErrorDisplay } from '@/components/error-resolution';
import type { Credential } from '@/types';

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
        <Stack gap={4}>
          {credentials.map((cred: Credential) => (
            <Card key={cred.id} padding="md">
              <Stack direction="row" justify="between" align="center">
                <Stack direction="row" gap={4} align="center">
                  <Badge variant={cred.platform === 'twitter' ? 'twitter' : 'bluesky'} size="sm">
                    {cred.platform}
                  </Badge>
                  <div>
                    <SmallText>
                      {cred.credential_type === 'api' ? 'API' : cred.credential_type}
                    </SmallText>
                    <div style={{ marginTop: '4px' }}>
                      <Caption>
                        Added: {formatDate(cred.created_at)} · Last used:{' '}
                        {formatDate(cred.last_used)}
                      </Caption>
                    </div>
                  </div>
                </Stack>
                <Stack direction="row" gap={2} align="center">
                  <Badge variant={cred.is_active ? 'success' : 'danger'} size="sm">
                    {cred.is_active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {cred.is_active ? 'Active' : 'Inactive'}
                  </Badge>
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
                </Stack>
              </Stack>
            </Card>
          ))}
        </Stack>
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
