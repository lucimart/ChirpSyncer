'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import styled from 'styled-components';
import {
  Plus,
  Trash2,
  Play,
  Pause,
  Eye,
  RefreshCw,
  Copy,
  Check,
  X,
  AlertCircle,
  Webhook,
} from 'lucide-react';
import { Button, Card, Modal, Input, Badge, EmptyState, PageHeader, StatCard, StatsGrid, Form, Label, MetaItem, Stack, Typography } from '@/components/ui';
import { api, Webhook as WebhookType, WebhookDelivery } from '@/lib/api';


const WebhookCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const WebhookIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.colors.primary[100]};
  color: ${({ theme }) => theme.colors.primary[600]};
`;

const WebhookUrl = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-family: monospace;
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const WebhookMeta = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[6]};
  padding: ${({ theme }) => theme.spacing[3]} 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  flex-wrap: wrap;
`;

const CheckboxGroup = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.spacing[2]};
  max-height: 200px;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing[2]};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  cursor: pointer;
`;

const SecretBox = styled.div`
  background-color: ${({ theme }) => theme.colors.warning[50]};
  border: 1px solid ${({ theme }) => theme.colors.warning[300]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[4]};
`;

const SecretWarning = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.warning[700]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const SecretValue = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  background-color: ${({ theme }) => theme.colors.neutral[100]};
  padding: ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-family: monospace;
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const DeliveryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
  max-height: 400px;
  overflow-y: auto;
`;

const DeliveryItem = styled.div<{ $success: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing[3]};
  background-color: ${({ $success, theme }) =>
    $success ? theme.colors.success[50] : theme.colors.danger[50]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border-left: 3px solid
    ${({ $success, theme }) =>
      $success ? theme.colors.success[500] : theme.colors.danger[500]};
`;


const StatusCode = styled.span<{ $success: boolean }>`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ $success, theme }) =>
    $success ? theme.colors.success[700] : theme.colors.danger[700]};
`;

export default function WebhooksPage() {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeliveriesModalOpen, setIsDeliveriesModalOpen] = useState(false);
  const [selectedWebhookId, setSelectedWebhookId] = useState<number | null>(null);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Form state
  const [webhookName, setWebhookName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  // Fetch webhooks
  const { data: webhooksData, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      const response = await api.getWebhooks();
      if (response.success && response.data) {
        return response.data;
      }
      return { webhooks: [], count: 0 };
    },
  });

  // Fetch event types
  const { data: eventTypesData } = useQuery({
    queryKey: ['webhook-events'],
    queryFn: async () => {
      const response = await api.getWebhookEventTypes();
      if (response.success && response.data) {
        return response.data.events;
      }
      return [];
    },
  });

  // Fetch deliveries for selected webhook
  const { data: deliveriesData } = useQuery({
    queryKey: ['webhook-deliveries', selectedWebhookId],
    queryFn: async () => {
      if (!selectedWebhookId) return { deliveries: [], count: 0 };
      const response = await api.getWebhookDeliveries(selectedWebhookId);
      if (response.success && response.data) {
        return response.data;
      }
      return { deliveries: [], count: 0 };
    },
    enabled: !!selectedWebhookId && isDeliveriesModalOpen,
  });

  // Create webhook mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      return api.createWebhook({
        url: webhookUrl,
        events: selectedEvents,
        name: webhookName || undefined,
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      if (response.success && response.data?.secret) {
        setCreatedSecret(response.data.secret);
      } else {
        resetForm();
        setIsCreateModalOpen(false);
      }
    },
  });

  // Delete webhook mutation
  const deleteMutation = useMutation({
    mutationFn: (webhookId: number) => api.deleteWebhook(webhookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });

  // Toggle webhook mutation
  const toggleMutation = useMutation({
    mutationFn: (payload: { webhookId: number; enabled: boolean }) =>
      api.updateWebhook(payload.webhookId, { enabled: payload.enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });

  // Test webhook mutation
  const testMutation = useMutation({
    mutationFn: (webhookId: number) => api.testWebhook(webhookId),
    onSuccess: (response) => {
      if (response.success && response.data) {
        const result = response.data;
        if (result.success) {
          alert(`Test successful! Status: ${result.status_code}`);
        } else {
          alert(`Test failed: ${result.error || 'Unknown error'}`);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['webhook-deliveries'] });
    },
  });

  // Regenerate secret mutation
  const regenerateMutation = useMutation({
    mutationFn: (webhookId: number) => api.regenerateWebhookSecret(webhookId),
    onSuccess: (response) => {
      if (response.success && response.data?.secret) {
        setCreatedSecret(response.data.secret);
        setSelectedWebhookId(response.data.id);
      }
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });

  const webhooks = webhooksData?.webhooks ?? [];
  const eventTypes = eventTypesData ?? [];

  const resetForm = () => {
    setWebhookName('');
    setWebhookUrl('');
    setSelectedEvents([]);
    setCreatedSecret(null);
    setCopiedSecret(false);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  const handleCloseCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(false);
  };

  const handleEventToggle = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const handleCopySecret = async () => {
    if (createdSecret) {
      await navigator.clipboard.writeText(createdSecret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleViewDeliveries = (webhookId: number) => {
    setSelectedWebhookId(webhookId);
    setIsDeliveriesModalOpen(true);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const truncateUrl = (url: string, maxLength = 40) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  const enabledCount = webhooks.filter((w) => w.enabled).length;

  return (
    <div>
      <PageHeader
        title="Webhooks"
        description="Receive real-time notifications when events occur"
        actions={
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus size={18} />
            Create Webhook
          </Button>
        }
      />

      <StatsGrid>
        <StatCard
          value={webhooks.length}
          label="Total Webhooks"
          variant="centered"
        />
        <StatCard
          value={enabledCount}
          label="Enabled"
          variant="centered"
        />
        <StatCard
          value={eventTypes.length}
          label="Event Types"
          variant="centered"
        />
      </StatsGrid>

      {isLoading ? (
        <Card padding="lg">
          <EmptyState title="Loading webhooks..." />
        </Card>
      ) : webhooks.length > 0 ? (
        <Stack gap={4}>
          {webhooks.map((webhook) => (
            <WebhookCard key={webhook.id} padding="md">
              <Stack direction="row" justify="between" align="start">
                <Stack direction="row" align="center" gap={3}>
                  <WebhookIcon>
                    <Webhook size={20} />
                  </WebhookIcon>
                  <div>
                    <Typography variant="h3">{webhook.name || 'Unnamed Webhook'}</Typography>
                    <WebhookUrl title={webhook.url}>
                      {truncateUrl(webhook.url)}
                    </WebhookUrl>
                  </div>
                </Stack>
                <Stack direction="row" gap={2}>
                  <Badge variant={webhook.enabled ? 'success-soft' : 'neutral'} size="sm">
                    {webhook.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDeliveries(webhook.id)}
                    title="View Deliveries"
                  >
                    <Eye size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => testMutation.mutate(webhook.id)}
                    title="Test Webhook"
                    disabled={testMutation.isPending}
                  >
                    <Play size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      toggleMutation.mutate({
                        webhookId: webhook.id,
                        enabled: !webhook.enabled,
                      })
                    }
                    title={webhook.enabled ? 'Disable' : 'Enable'}
                  >
                    {webhook.enabled ? <Pause size={16} /> : <Play size={16} />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => regenerateMutation.mutate(webhook.id)}
                    title="Regenerate Secret"
                  >
                    <RefreshCw size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(webhook.id)}
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </Button>
                </Stack>
              </Stack>
              <WebhookMeta>
                <Stack direction="row" gap={2} wrap>
                  {webhook.events.map((event) => (
                    <Badge variant="default" size="sm" key={event}>{event}</Badge>
                  ))}
                </Stack>
                <MetaItem variant="text">Created: {formatDate(webhook.created_at)}</MetaItem>
              </WebhookMeta>
            </WebhookCard>
          ))}
        </Stack>
      ) : (
        <Card padding="lg">
          <EmptyState
             title="No webhooks yet"
             description="Create your first webhook to receive notifications."
          />
        </Card>
      )}

      {/* Create Webhook Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        title={createdSecret ? 'Webhook Created' : 'Create Webhook'}
        footer={
          createdSecret ? (
            <Button onClick={handleCloseCreateModal}>Done</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={handleCloseCreateModal}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateSubmit}
                disabled={!webhookUrl || selectedEvents.length === 0}
              >
                Create Webhook
              </Button>
            </>
          )
        }
      >
        {createdSecret ? (
          <SecretBox>
            <SecretWarning>
              <AlertCircle size={16} />
              Save this secret now - it won&apos;t be shown again!
            </SecretWarning>
            <SecretValue>
              <code style={{ flex: 1, wordBreak: 'break-all' }}>{createdSecret}</code>
              <Button variant="ghost" size="sm" onClick={handleCopySecret}>
                {copiedSecret ? <Check size={16} /> : <Copy size={16} />}
              </Button>
            </SecretValue>
          </SecretBox>
        ) : (
          <Form onSubmit={handleCreateSubmit}>
            <Input
              label="Name (optional)"
              type="text"
              value={webhookName}
              onChange={(e) => setWebhookName(e.target.value)}
              placeholder="e.g., Slack Notifications"
              fullWidth
            />

            <Input
              label="URL"
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://example.com/webhook"
              required
              fullWidth
            />

            <div>
              <Label>Events</Label>
              <CheckboxGroup>
                {eventTypes.map((event) => (
                  <CheckboxLabel key={event}>
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(event)}
                      onChange={() => handleEventToggle(event)}
                    />
                    {event}
                  </CheckboxLabel>
                ))}
              </CheckboxGroup>
            </div>
          </Form>
        )}
      </Modal>

      {/* Deliveries Modal */}
      <Modal
        isOpen={isDeliveriesModalOpen}
        onClose={() => {
          setIsDeliveriesModalOpen(false);
          setSelectedWebhookId(null);
        }}
        title="Delivery History"
        footer={
          <Button
            variant="secondary"
            onClick={() => {
              setIsDeliveriesModalOpen(false);
              setSelectedWebhookId(null);
            }}
          >
            Close
          </Button>
        }
      >
        {deliveriesData?.deliveries && deliveriesData.deliveries.length > 0 ? (
          <DeliveryList>
            {deliveriesData.deliveries.map((delivery) => (
              <DeliveryItem key={delivery.id} $success={delivery.success}>
                <div>
                  <Typography variant="label">{delivery.event_type}</Typography>
                  <MetaItem size="xs" color="tertiary">{formatDateTime(delivery.created_at)}</MetaItem>
                </div>
                <Stack direction="row" gap={2} align="center">
                  <StatusCode $success={delivery.success}>
                    {delivery.status_code || 'N/A'}
                  </StatusCode>
                  {delivery.success ? (
                    <Check size={16} color="green" />
                  ) : (
                    <X size={16} color="red" />
                  )}
                </Stack>
              </DeliveryItem>
            ))}
          </DeliveryList>
        ) : (
          <EmptyState title="No deliveries yet for this webhook." size="sm" />
        )}
      </Modal>

      {/* Secret Regenerated Modal */}
      <Modal
        isOpen={!!createdSecret && !isCreateModalOpen}
        onClose={() => setCreatedSecret(null)}
        title="New Secret Generated"
        footer={<Button onClick={() => setCreatedSecret(null)}>Done</Button>}
      >
        <SecretBox>
          <SecretWarning>
            <AlertCircle size={16} />
            Save this secret now - it won&apos;t be shown again!
          </SecretWarning>
          <SecretValue>
            <code style={{ flex: 1, wordBreak: 'break-all' }}>{createdSecret}</code>
            <Button variant="ghost" size="sm" onClick={handleCopySecret}>
              {copiedSecret ? <Check size={16} /> : <Copy size={16} />}
            </Button>
          </SecretValue>
        </SecretBox>
      </Modal>
    </div>
  );
}
