'use client';

import { memo, FC, useState, useCallback } from 'react';
import styled from 'styled-components';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Label } from '@/components/ui/Label';
import { Stack } from '@/components/ui/Stack';
import { TriggerSelector } from './TriggerSelector';
import { ActionBuilder } from './ActionBuilder';
import type {
  TriggerConfig,
  ActionConfig,
  WorkflowPayload,
  Workflow,
} from '@/lib/workflows';

export interface WorkflowBuilderProps {
  workflow?: Workflow;
  onSave: (payload: WorkflowPayload) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[6]};
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const SectionTitle = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const SectionNumber = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background-color: ${({ theme }) => theme.colors.primary[600]};
  color: white;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
`;

const FlowIndicator = styled.div`
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[2]} 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[3]};
  padding-top: ${({ theme }) => theme.spacing[4]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const ErrorMessage = styled.p`
  color: ${({ theme }) => theme.colors.danger[600]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin: 0;
`;

export const WorkflowBuilder: FC<WorkflowBuilderProps> = memo(
  ({ workflow, onSave, onCancel, isLoading }) => {
    const [name, setName] = useState(workflow?.name || '');
    const [description, setDescription] = useState(workflow?.description || '');
    const [triggerConfig, setTriggerConfig] = useState<TriggerConfig | undefined>(
      workflow?.trigger_config
    );
    const [actionsConfig, setActionsConfig] = useState<ActionConfig[]>(
      workflow?.actions_config || []
    );
    const [error, setError] = useState<string | null>(null);

    const handleSave = useCallback(() => {
      // Validation
      if (!name.trim()) {
        setError('Workflow name is required');
        return;
      }

      if (!triggerConfig) {
        setError('Please select a trigger');
        return;
      }

      if (actionsConfig.length === 0) {
        setError('Please add at least one action');
        return;
      }

      setError(null);

      const payload: WorkflowPayload = {
        name: name.trim(),
        description: description.trim() || undefined,
        trigger_config: triggerConfig,
        actions_config: actionsConfig,
        is_active: workflow?.is_active ?? true,
      };

      onSave(payload);
    }, [name, description, triggerConfig, actionsConfig, workflow, onSave]);

    const handleTriggerChange = useCallback((config: TriggerConfig) => {
      setTriggerConfig(config);
      setError(null);
    }, []);

    const handleActionsChange = useCallback((actions: ActionConfig[]) => {
      setActionsConfig(actions);
      setError(null);
    }, []);

    return (
      <Container data-testid="workflow-builder">
        <Section>
          <SectionTitle>
            <SectionNumber>1</SectionNumber>
            Basic Info
          </SectionTitle>
          <Stack direction="column" gap={3}>
            <div>
              <Label htmlFor="workflow-name">Name</Label>
              <Input
                id="workflow-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="My awesome workflow"
              />
            </div>
            <div>
              <Label htmlFor="workflow-description">Description (optional)</Label>
              <TextArea
                id="workflow-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this workflow do?"
                rows={2}
              />
            </div>
          </Stack>
        </Section>

        <FlowIndicator>
          <ArrowRight size={20} />
        </FlowIndicator>

        <Section>
          <SectionTitle>
            <SectionNumber>2</SectionNumber>
            When (Trigger)
          </SectionTitle>
          <TriggerSelector value={triggerConfig} onChange={handleTriggerChange} />
        </Section>

        <FlowIndicator>
          <ArrowRight size={20} />
        </FlowIndicator>

        <Section>
          <SectionTitle>
            <SectionNumber>3</SectionNumber>
            Then (Actions)
          </SectionTitle>
          <ActionBuilder value={actionsConfig} onChange={handleActionsChange} />
        </Section>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <Footer>
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} isLoading={isLoading}>
            {workflow ? 'Save Changes' : 'Create Workflow'}
          </Button>
        </Footer>
      </Container>
    );
  }
);

WorkflowBuilder.displayName = 'WorkflowBuilder';
