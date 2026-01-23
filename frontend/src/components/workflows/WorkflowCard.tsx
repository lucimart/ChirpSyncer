'use client';

import { memo, FC, useCallback } from 'react';
import styled from 'styled-components';
import {
  Send,
  TrendingUp,
  AtSign,
  Clock,
  Webhook,
  Rss,
  Share2,
  Bell,
  Wand2,
  ListPlus,
  Edit2,
  Trash2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { IconButton } from '@/components/ui/IconButton';
import { Stack } from '@/components/ui/Stack';
import type { Workflow, TriggerType, ActionType } from '@/lib/workflows';

export interface WorkflowCardProps {
  workflow: Workflow;
  onToggle?: (id: string, isActive: boolean) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const CardWrapper = styled(Card)`
  position: relative;
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const TitleArea = styled.div`
  flex: 1;
  min-width: 0;
`;

const Title = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.3;
`;

const Description = styled.p`
  margin: ${({ theme }) => theme.spacing[1]} 0 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
`;

const MetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const TriggerBadge = styled(Badge)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const ActionIconsWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const ActionIconContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background-color: ${({ theme }) => theme.colors.background.secondary};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const FlowArrow = styled.span`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const ActionsRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: ${({ theme }) => theme.spacing[4]};
  padding-top: ${({ theme }) => theme.spacing[4]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const ActionButtons = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
`;

// Trigger type icons
const TRIGGER_ICONS: Record<TriggerType, typeof Send> = {
  new_post: Send,
  viral_post: TrendingUp,
  new_mention: AtSign,
  scheduled: Clock,
  webhook: Webhook,
  rss: Rss,
};

// Trigger type labels
const TRIGGER_LABELS: Record<TriggerType, string> = {
  new_post: 'New Post',
  viral_post: 'Viral Post',
  new_mention: 'New Mention',
  scheduled: 'Scheduled',
  webhook: 'Webhook',
  rss: 'RSS Feed',
};

// Action type icons
const ACTION_ICONS: Record<ActionType, typeof Share2> = {
  cross_post: Share2,
  send_notification: Bell,
  transform_content: Wand2,
  add_to_queue: ListPlus,
};

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

export const WorkflowCard: FC<WorkflowCardProps> = memo(
  ({ workflow, onToggle, onEdit, onDelete }) => {
    const handleToggle = useCallback(() => {
      onToggle?.(workflow.id, !workflow.is_active);
    }, [workflow.id, workflow.is_active, onToggle]);

    const handleEdit = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onEdit?.(workflow.id);
      },
      [workflow.id, onEdit]
    );

    const handleDelete = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete?.(workflow.id);
      },
      [workflow.id, onDelete]
    );

    const triggerType = workflow.trigger_config.type;
    const TriggerIcon = TRIGGER_ICONS[triggerType];
    const triggerLabel = TRIGGER_LABELS[triggerType];

    return (
      <CardWrapper
        padding="md"
        variant="default"
        data-testid="workflow-card"
      >
        <Header>
          <TitleArea>
            <Title>{workflow.name}</Title>
            {workflow.description && (
              <Description data-testid="workflow-description">
                {workflow.description}
              </Description>
            )}
          </TitleArea>
          <Switch
            checked={workflow.is_active}
            onChange={handleToggle}
            aria-label={`Toggle ${workflow.name}`}
          />
        </Header>

        <MetaRow>
          <TriggerBadge
            variant="primary-soft"
            size="sm"
            data-testid="trigger-badge"
            leftIcon={<TriggerIcon size={12} />}
          >
            {triggerLabel}
          </TriggerBadge>

          <FlowArrow>→</FlowArrow>

          <ActionIconsWrapper data-testid="action-icons">
            {workflow.actions_config.map((action, index) => {
              const ActionIcon = ACTION_ICONS[action.type];
              return (
                <ActionIconContainer
                  key={`${action.type}-${index}`}
                  title={action.type.replace('_', ' ')}
                >
                  <ActionIcon size={14} />
                </ActionIconContainer>
              );
            })}
          </ActionIconsWrapper>
        </MetaRow>

        <ActionsRow>
          <Stack direction="row" gap={4}>
            <MetaItem>
              <span>{workflow.run_count} runs</span>
            </MetaItem>
            <MetaItem data-testid="last-run-time">
              {workflow.last_run_at
                ? `Last run ${getRelativeTime(workflow.last_run_at)}`
                : 'Never run'}
            </MetaItem>
          </Stack>

          <ActionButtons>
            <IconButton
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              aria-label="Edit workflow"
              title="Edit"
            >
              <Edit2 size={16} />
            </IconButton>
            <IconButton
              variant="ghost"
              size="sm"
              color="danger"
              onClick={handleDelete}
              aria-label="Delete workflow"
              title="Delete"
            >
              <Trash2 size={16} />
            </IconButton>
          </ActionButtons>
        </ActionsRow>
      </CardWrapper>
    );
  }
);

WorkflowCard.displayName = 'WorkflowCard';
