'use client';

import { useState, useCallback } from 'react';
import styled from 'styled-components';
import { Plus, Zap, TrendingUp, Clock, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import {
  WorkflowCard,
  WorkflowBuilder,
  RunHistory,
} from '@/components/workflows';
import {
  useWorkflows,
  useWorkflow,
  useCreateWorkflow,
  useUpdateWorkflow,
  useDeleteWorkflow,
  useToggleWorkflow,
  useWorkflowRuns,
} from '@/lib/workflows';
import type { WorkflowPayload, Workflow } from '@/lib/workflows';

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[6]};
  padding: ${({ theme }) => theme.spacing[6]};
  max-width: 1200px;
  margin: 0 auto;
`;

const WorkflowsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: ${({ theme }) => theme.spacing[12]};
`;

const SuggestionCards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[4]};
`;

const SuggestionCard = styled.button`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]};
  background-color: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  cursor: pointer;
  text-align: left;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary[500]};
    box-shadow: ${({ theme }) => theme.shadows.sm};
  }
`;

const SuggestionIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background-color: ${({ theme }) => theme.colors.primary[100]};
  color: ${({ theme }) => theme.colors.primary[600]};
  flex-shrink: 0;
`;

const SuggestionContent = styled.div`
  flex: 1;
`;

const SuggestionTitle = styled.span`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const SuggestionDescription = styled.span`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const ModalContent = styled.div`
  max-height: 70vh;
  overflow-y: auto;
`;

// Workflow suggestion templates
const WORKFLOW_SUGGESTIONS = [
  {
    icon: TrendingUp,
    title: 'Auto cross-post viral tweets',
    description: 'Share tweets that get 100+ likes to Bluesky',
    template: {
      name: 'Cross-post viral tweets',
      trigger_config: { type: 'viral_post' as const, platform: 'twitter' as const, threshold: { likes: 100 } },
      actions_config: [{ type: 'cross_post' as const, platforms: ['bluesky' as const] }],
    },
  },
  {
    icon: Clock,
    title: 'Daily sync schedule',
    description: 'Sync new posts every morning at 9 AM',
    template: {
      name: 'Daily morning sync',
      trigger_config: { type: 'scheduled' as const, cron: '0 9 * * *' },
      actions_config: [{ type: 'cross_post' as const, platforms: ['bluesky' as const, 'twitter' as const] }],
    },
  },
  {
    icon: Share2,
    title: 'Mirror all new posts',
    description: 'Automatically cross-post everything',
    template: {
      name: 'Mirror new posts',
      trigger_config: { type: 'new_post' as const, platform: 'twitter' as const },
      actions_config: [{ type: 'cross_post' as const, platforms: ['bluesky' as const] }],
    },
  },
];

export default function WorkflowsPage() {
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | undefined>();
  const [viewingRunsId, setViewingRunsId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('workflows');

  // Queries
  const { data: workflowsData, isLoading, error } = useWorkflows();
  const { data: selectedWorkflow } = useWorkflow(viewingRunsId || '');
  const { data: runsData, isLoading: runsLoading } = useWorkflowRuns(viewingRunsId || '');

  // Mutations
  const createWorkflow = useCreateWorkflow();
  const updateWorkflow = useUpdateWorkflow();
  const deleteWorkflow = useDeleteWorkflow();
  const toggleWorkflow = useToggleWorkflow();

  const workflows = workflowsData?.workflows || [];

  const handleCreate = useCallback(() => {
    setEditingWorkflow(undefined);
    setIsBuilderOpen(true);
  }, []);

  const handleEdit = useCallback(
    (id: string) => {
      const workflow = workflows.find((w) => w.id === id);
      if (workflow) {
        setEditingWorkflow(workflow);
        setIsBuilderOpen(true);
      }
    },
    [workflows]
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (window.confirm('Are you sure you want to delete this workflow?')) {
        deleteWorkflow.mutate(id);
      }
    },
    [deleteWorkflow]
  );

  const handleToggle = useCallback(
    (id: string, isActive: boolean) => {
      toggleWorkflow.mutate({ id, is_active: isActive });
    },
    [toggleWorkflow]
  );

  const handleSave = useCallback(
    (payload: WorkflowPayload) => {
      if (editingWorkflow) {
        updateWorkflow.mutate(
          { id: editingWorkflow.id, payload },
          {
            onSuccess: () => {
              setIsBuilderOpen(false);
              setEditingWorkflow(undefined);
            },
          }
        );
      } else {
        createWorkflow.mutate(payload, {
          onSuccess: () => {
            setIsBuilderOpen(false);
          },
        });
      }
    },
    [editingWorkflow, createWorkflow, updateWorkflow]
  );

  const handleCancel = useCallback(() => {
    setIsBuilderOpen(false);
    setEditingWorkflow(undefined);
  }, []);

  const handleViewRuns = useCallback((id: string) => {
    setViewingRunsId(id);
    setActiveTab('history');
  }, []);

  const handleUseSuggestion = useCallback(
    (template: Partial<WorkflowPayload>) => {
      setEditingWorkflow(undefined);
      setIsBuilderOpen(true);
      // The builder will start with these values pre-filled
    },
    []
  );

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingContainer>
          <Spinner size="lg" />
        </LoadingContainer>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <Alert
          variant="error"
          title="Error loading workflows"
        >
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Workflows"
        description="Automate your cross-posting with custom workflows"
        actions={
          <Button variant="primary" leftIcon={<Plus size={16} />} onClick={handleCreate}>
            New Workflow
          </Button>
        }
      />

      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        items={[
          { id: 'workflows', label: 'Workflows' },
          { id: 'history', label: 'Run History', disabled: !viewingRunsId },
        ]}
      />

      {activeTab === 'workflows' && (
        <>
          {workflows.length === 0 ? (
            <EmptyState
              icon={Zap}
              title="No workflows yet"
              description="Create your first workflow to automate cross-posting between platforms."
              action={
                <Button variant="primary" leftIcon={<Plus size={16} />} onClick={handleCreate}>
                  Create Workflow
                </Button>
              }
            />
          ) : (
            <WorkflowsGrid>
              {workflows.map((workflow) => (
                <WorkflowCard
                  key={workflow.id}
                  workflow={workflow}
                  onToggle={handleToggle}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </WorkflowsGrid>
          )}

          {workflows.length === 0 && (
            <>
              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                  Or start with a template:
                </span>
              </div>
              <SuggestionCards>
                {WORKFLOW_SUGGESTIONS.map((suggestion, index) => (
                  <SuggestionCard
                    key={index}
                    onClick={() => handleUseSuggestion(suggestion.template)}
                  >
                    <SuggestionIcon>
                      <suggestion.icon size={20} />
                    </SuggestionIcon>
                    <SuggestionContent>
                      <SuggestionTitle>{suggestion.title}</SuggestionTitle>
                      <SuggestionDescription>{suggestion.description}</SuggestionDescription>
                    </SuggestionContent>
                  </SuggestionCard>
                ))}
              </SuggestionCards>
            </>
          )}
        </>
      )}

      {activeTab === 'history' && viewingRunsId && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('workflows')}>
              Back to workflows
            </Button>
            {selectedWorkflow && (
              <h2 style={{ margin: '0.5rem 0', fontSize: '1.25rem', fontWeight: 600 }}>
                {selectedWorkflow.name} - Run History
              </h2>
            )}
          </div>
          <RunHistory runs={runsData?.runs || []} isLoading={runsLoading} />
        </div>
      )}

      <Modal
        isOpen={isBuilderOpen}
        onClose={handleCancel}
        title={editingWorkflow ? 'Edit Workflow' : 'Create Workflow'}
        size="lg"
      >
        <ModalContent>
          <WorkflowBuilder
            workflow={editingWorkflow}
            onSave={handleSave}
            onCancel={handleCancel}
            isLoading={createWorkflow.isPending || updateWorkflow.isPending}
          />
        </ModalContent>
      </Modal>
    </PageContainer>
  );
}
