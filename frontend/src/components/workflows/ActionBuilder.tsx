'use client';

import { memo, FC, useCallback, useState } from 'react';
import styled from 'styled-components';
import {
  Share2,
  Bell,
  Wand2,
  ListPlus,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  ArrowDown,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';
import { IconButton } from '@/components/ui/IconButton';
import { Checkbox } from '@/components/ui/Checkbox';
import { Stack } from '@/components/ui/Stack';
import { Label } from '@/components/ui/Label'; // For Platforms label
import type {
  ActionConfig,
  ActionType,
  Platform,
  CrossPostActionConfig,
  SendNotificationActionConfig,
  TransformContentActionConfig,
  AddToQueueActionConfig,
} from '@/lib/workflows';

export interface ActionBuilderProps {
  value: ActionConfig[];
  onChange: (actions: ActionConfig[]) => void;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const ActionChain = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const ActionItem = styled.div<{ $expanded: boolean }>`
  background-color: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  overflow: hidden;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.default};
  }
`;

const ActionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.colors.background.secondary};
  }
`;

const ActionIconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background-color: ${({ theme }) => theme.colors.primary[100]};
  color: ${({ theme }) => theme.colors.primary[600]};
  flex-shrink: 0;
`;

const ActionInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ActionTitle = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ActionSummary = styled.span`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: 2px;
`;

const ActionConfig = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
  background-color: ${({ theme }) => theme.colors.background.secondary};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const FlowArrow = styled.div`
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[1]} 0;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[6]};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const AddActionContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const ActionOptionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]};
  background-color: ${({ theme }) => theme.colors.background.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  margin-top: ${({ theme }) => theme.spacing[2]};
`;

const ActionOption = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]};
  background-color: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary[500]};
    background-color: ${({ theme }) => theme.colors.primary[50]};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary[500]};
    outline-offset: 2px;
  }
`;

const ActionOptionIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background-color: ${({ theme }) => theme.colors.neutral[100]};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ActionOptionLabel = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

// Action type definitions
const ACTION_OPTIONS: Array<{
  type: ActionType;
  label: string;
  icon: typeof Share2;
}> = [
  { type: 'cross_post', label: 'Cross-Post', icon: Share2 },
  { type: 'send_notification', label: 'Send Notification', icon: Bell },
  { type: 'transform_content', label: 'Transform Content', icon: Wand2 },
  { type: 'add_to_queue', label: 'Add to Queue', icon: ListPlus },
];

const ACTION_ICONS: Record<ActionType, typeof Share2> = {
  cross_post: Share2,
  send_notification: Bell,
  transform_content: Wand2,
  add_to_queue: ListPlus,
};

const ACTION_LABELS: Record<ActionType, string> = {
  cross_post: 'Cross-Post',
  send_notification: 'Send Notification',
  transform_content: 'Transform Content',
  add_to_queue: 'Add to Queue',
};

const PLATFORM_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'twitter', label: 'Twitter' },
  { value: 'bluesky', label: 'Bluesky' },
];

const CHANNEL_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'email', label: 'Email' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'push', label: 'Push Notification' },
];

const PRIORITY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
];

function getDefaultConfig(type: ActionType): ActionConfig {
  switch (type) {
    case 'cross_post':
      return { type: 'cross_post', platforms: ['bluesky'] };
    case 'send_notification':
      return { type: 'send_notification', channel: 'email', message_template: '' };
    case 'transform_content':
      return { type: 'transform_content', target_platform: 'bluesky' };
    case 'add_to_queue':
      return { type: 'add_to_queue', priority: 'normal' };
  }
}

function getActionSummary(action: ActionConfig): string {
  switch (action.type) {
    case 'cross_post':
      return `To ${(action as CrossPostActionConfig).platforms.join(', ')}`;
    case 'send_notification':
      return `Via ${(action as SendNotificationActionConfig).channel}`;
    case 'transform_content':
      return `For ${(action as TransformContentActionConfig).target_platform}`;
    case 'add_to_queue':
      return `Priority: ${(action as AddToQueueActionConfig).priority || 'normal'}`;
    default:
      return '';
  }
}

export const ActionBuilder: FC<ActionBuilderProps> = memo(({ value, onChange }) => {
  const [showAddOptions, setShowAddOptions] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleAddAction = useCallback(
    (type: ActionType) => {
      const newAction = getDefaultConfig(type);
      onChange([...value, newAction]);
      setShowAddOptions(false);
      setExpandedIndex(value.length);
    },
    [value, onChange]
  );

  const handleRemoveAction = useCallback(
    (index: number) => {
      const newActions = value.filter((_, i) => i !== index);
      onChange(newActions);
      if (expandedIndex === index) {
        setExpandedIndex(null);
      }
    },
    [value, onChange, expandedIndex]
  );

  const handleUpdateAction = useCallback(
    (index: number, updates: Partial<ActionConfig>) => {
      const newActions = value.map((action, i) =>
        i === index ? { ...action, ...updates } : action
      );
      onChange(newActions as ActionConfig[]);
    },
    [value, onChange]
  );

  const toggleExpanded = useCallback((index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  }, []);

  const renderActionConfig = (action: ActionConfig, index: number) => {
    switch (action.type) {
      case 'cross_post': {
        const config = action as CrossPostActionConfig;
        return (
          <Stack direction="column" gap={3}>
            <Label>Platforms</Label>
            <CheckboxGroup>
              {PLATFORM_OPTIONS.map((opt) => (
                <Checkbox
                  key={opt.value}
                  label={opt.label}
                  checked={config.platforms.includes(opt.value as Platform)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    const platform = opt.value as Platform;
                    const newPlatforms = checked
                      ? [...config.platforms, platform]
                      : config.platforms.filter((p) => p !== platform);
                    handleUpdateAction(index, { platforms: newPlatforms } as Partial<CrossPostActionConfig>);
                  }}
                />
              ))}
            </CheckboxGroup>
          </Stack>
        );
      }

      case 'send_notification': {
        const config = action as SendNotificationActionConfig;
        return (
          <Stack direction="column" gap={3}>
            <Select
              id={`action-${index}-channel`}
              label="Channel"
              value={config.channel}
              onChange={(e) =>
                handleUpdateAction(index, {
                  channel: e.target.value as 'email' | 'webhook' | 'push',
                })
              }
              options={CHANNEL_OPTIONS}
            />
            <TextArea
              id={`action-${index}-template`}
              label="Message Template"
              value={config.message_template}
              onChange={(e) => handleUpdateAction(index, { message_template: e.target.value })}
              placeholder="Post {{content}} synced successfully!"
              rows={3}
            />
          </Stack>
        );
      }

      case 'transform_content': {
        const config = action as TransformContentActionConfig;
        return (
          <Stack direction="column" gap={3}>
            <Select
              id={`action-${index}-target`}
              label="Target Platform"
              value={config.target_platform}
              onChange={(e) =>
                handleUpdateAction(index, { target_platform: e.target.value as Platform })
              }
              options={PLATFORM_OPTIONS}
            />
            <Checkbox
              label="Truncate content if too long"
              checked={config.truncate || false}
              onChange={(e) => handleUpdateAction(index, { truncate: e.target.checked })}
            />
            <Checkbox
              label="Remove hashtags"
              checked={config.remove_hashtags || false}
              onChange={(e) => handleUpdateAction(index, { remove_hashtags: e.target.checked })}
            />
          </Stack>
        );
      }

      case 'add_to_queue': {
        const config = action as AddToQueueActionConfig;
        return (
          <Stack direction="column" gap={3}>
            <Input
              id={`action-${index}-queue`}
              label="Queue Name (optional)"
              value={config.queue_name || ''}
              onChange={(e) => handleUpdateAction(index, { queue_name: e.target.value })}
              placeholder="default"
            />
            <Select
              id={`action-${index}-priority`}
              label="Priority"
              value={config.priority || 'normal'}
              onChange={(e) =>
                handleUpdateAction(index, {
                  priority: e.target.value as 'low' | 'normal' | 'high',
                })
              }
              options={PRIORITY_OPTIONS}
            />
          </Stack>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Container data-testid="action-builder">
      <ActionChain data-testid="action-chain">
        {value.length === 0 ? (
          <EmptyState>No actions configured. Add an action to get started.</EmptyState>
        ) : (
          value.map((action, index) => {
            const Icon = ACTION_ICONS[action.type];
            const label = ACTION_LABELS[action.type];
            const summary = getActionSummary(action);
            const isExpanded = expandedIndex === index;

            return (
              <div key={`${action.type}-${index}`}>
                {index > 0 && (
                  <FlowArrow data-testid="flow-arrow">
                    <ArrowDown size={16} />
                  </FlowArrow>
                )}
                <ActionItem $expanded={isExpanded} data-testid={`action-item-${index}`}>
                  <ActionHeader onClick={() => toggleExpanded(index)}>
                    <ActionIconWrapper>
                      <Icon size={16} />
                    </ActionIconWrapper>
                    <ActionInfo>
                      <ActionTitle>{label}</ActionTitle>
                      <ActionSummary>{summary}</ActionSummary>
                    </ActionInfo>
                    <IconButton
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveAction(index);
                      }}
                      aria-label="Remove action"
                    >
                      <X size={16} />
                    </IconButton>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </ActionHeader>
                  {isExpanded && (
                    <ActionConfig>{renderActionConfig(action, index)}</ActionConfig>
                  )}
                </ActionItem>
              </div>
            );
          })
        )}
      </ActionChain>

      <AddActionContainer>
        {showAddOptions ? (
          <ActionOptionsGrid>
            {ACTION_OPTIONS.map(({ type, label, icon: Icon }) => (
              <ActionOption
                key={type}
                type="button"
                onClick={() => handleAddAction(type)}
                data-testid={`action-option-${type}`}
              >
                <ActionOptionIcon>
                  <Icon size={18} />
                </ActionOptionIcon>
                <ActionOptionLabel>{label}</ActionOptionLabel>
              </ActionOption>
            ))}
          </ActionOptionsGrid>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddOptions(true)}
            leftIcon={<Plus size={16} />}
          >
            Add Action
          </Button>
        )}
      </AddActionContainer>
    </Container>
  );
});

ActionBuilder.displayName = 'ActionBuilder';
