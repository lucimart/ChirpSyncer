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
  Copy,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Stack } from '@/components/ui/Stack';
import { IconButton } from '@/components/ui/IconButton';
import type {
  TriggerConfig,
  TriggerType,
  Platform,
  ViralPostTriggerConfig,
  ScheduledTriggerConfig,
  RssTriggerConfig,
  WebhookTriggerConfig,
} from '@/lib/workflows';

export interface TriggerSelectorProps {
  value?: TriggerConfig;
  onChange: (config: TriggerConfig) => void;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const TriggerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.spacing[3]};

  @media (max-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const TriggerOption = styled.button<{ $selected: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[4]};
  background-color: ${({ theme, $selected }) =>
    $selected ? theme.colors.primary[50] : theme.colors.background.primary};
  border: 2px solid
    ${({ theme, $selected }) =>
      $selected ? theme.colors.primary[500] : theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme, $selected }) =>
      $selected ? theme.colors.primary[500] : theme.colors.border.default};
    box-shadow: ${({ theme }) => theme.shadows.sm};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary[500]};
    outline-offset: 2px;
  }
`;

const TriggerIconWrapper = styled.div<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background-color: ${({ theme, $selected }) =>
    $selected ? theme.colors.primary[100] : theme.colors.neutral[100]};
  color: ${({ theme, $selected }) =>
    $selected ? theme.colors.primary[600] : theme.colors.text.secondary};
`;

const TriggerLabel = styled.span<{ $selected: boolean }>`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme, $selected }) =>
    $selected ? theme.colors.primary[700] : theme.colors.text.primary};
  text-align: center;
`;

const ConfigSection = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
  background-color: ${({ theme }) => theme.colors.background.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
`;

const ConfigTitle = styled.h4`
  margin: 0 0 ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const WebhookUrlContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const WebhookUrlInput = styled(Input)`
  flex: 1;
`;

// Trigger type definitions
const TRIGGER_OPTIONS: Array<{
  type: TriggerType;
  label: string;
  icon: typeof Send;
}> = [
  { type: 'new_post', label: 'New Post', icon: Send },
  { type: 'viral_post', label: 'Viral Post', icon: TrendingUp },
  { type: 'new_mention', label: 'New Mention', icon: AtSign },
  { type: 'scheduled', label: 'Scheduled', icon: Clock },
  { type: 'webhook', label: 'Webhook', icon: Webhook },
  { type: 'rss', label: 'RSS Feed', icon: Rss },
];

const PLATFORM_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'twitter', label: 'Twitter' },
  { value: 'bluesky', label: 'Bluesky' },
  { value: 'both', label: 'Both' },
];

const SCHEDULE_PRESETS: Array<{ value: string; label: string }> = [
  { value: '0 9 * * *', label: 'Daily at 9 AM' },
  { value: '0 9 * * 1-5', label: 'Weekdays at 9 AM' },
  { value: '0 */6 * * *', label: 'Every 6 hours' },
  { value: '0 12 * * 0', label: 'Weekly (Sunday noon)' },
];

function getDefaultConfig(type: TriggerType): TriggerConfig {
  switch (type) {
    case 'new_post':
      return { type: 'new_post', platform: 'twitter' };
    case 'viral_post':
      return { type: 'viral_post', platform: 'twitter', threshold: { likes: 100 } };
    case 'new_mention':
      return { type: 'new_mention', platform: 'twitter' };
    case 'scheduled':
      return { type: 'scheduled', cron: '0 9 * * *' };
    case 'webhook':
      return { type: 'webhook' };
    case 'rss':
      return { type: 'rss', feed_url: '' };
  }
}

export const TriggerSelector: FC<TriggerSelectorProps> = memo(({ value, onChange }) => {
  const selectedType = value?.type;

  const handleTypeSelect = useCallback(
    (type: TriggerType) => {
      if (type === selectedType) return;
      onChange(getDefaultConfig(type));
    },
    [selectedType, onChange]
  );

  const handlePlatformChange = useCallback(
    (platform: string) => {
      if (!value) return;
      onChange({ ...value, platform: platform as Platform } as TriggerConfig);
    },
    [value, onChange]
  );

  const handleThresholdChange = useCallback(
    (field: 'likes' | 'retweets', val: string) => {
      if (!value || value.type !== 'viral_post') return;
      const config = value as ViralPostTriggerConfig;
      onChange({
        ...config,
        threshold: {
          ...config.threshold,
          [field]: parseInt(val, 10) || 0,
        },
      });
    },
    [value, onChange]
  );

  const handleCronChange = useCallback(
    (cron: string) => {
      if (!value || value.type !== 'scheduled') return;
      onChange({ ...value, cron } as ScheduledTriggerConfig);
    },
    [value, onChange]
  );

  const handleFeedUrlChange = useCallback(
    (feed_url: string) => {
      if (!value || value.type !== 'rss') return;
      onChange({ ...value, feed_url } as RssTriggerConfig);
    },
    [value, onChange]
  );

  const handleCopyWebhookUrl = useCallback(() => {
    if (!value || value.type !== 'webhook') return;
    const config = value as WebhookTriggerConfig;
    if (config.webhook_url) {
      navigator.clipboard.writeText(config.webhook_url);
    }
  }, [value]);

  const renderConfig = () => {
    if (!value) return null;

    switch (value.type) {
      case 'new_post':
      case 'new_mention':
        return (
          <ConfigSection>
            <ConfigTitle>Configuration</ConfigTitle>
            <Select
              id="trigger-platform"
              label="Platform"
              value={'platform' in value ? value.platform : 'twitter'}
              onChange={(e) => handlePlatformChange(e.target.value)}
              options={PLATFORM_OPTIONS}
            />
          </ConfigSection>
        );

      case 'viral_post': {
        const config = value as ViralPostTriggerConfig;
        return (
          <ConfigSection>
            <ConfigTitle>Configuration</ConfigTitle>
            <Stack direction="column" gap={3}>
              <Select
                id="trigger-platform"
                label="Platform"
                value={config.platform}
                onChange={(e) => handlePlatformChange(e.target.value)}
                options={PLATFORM_OPTIONS}
              />
              <Input
                id="trigger-likes"
                label="Likes Threshold"
                type="number"
                min={0}
                value={config.threshold.likes || ''}
                onChange={(e) => handleThresholdChange('likes', e.target.value)}
                placeholder="e.g., 100"
              />
              <Input
                id="trigger-retweets"
                label="Retweets Threshold (optional)"
                type="number"
                min={0}
                value={config.threshold.retweets || ''}
                onChange={(e) => handleThresholdChange('retweets', e.target.value)}
                placeholder="e.g., 50"
              />
            </Stack>
          </ConfigSection>
        );
      }

      case 'scheduled': {
        const config = value as ScheduledTriggerConfig;
        return (
          <ConfigSection>
            <ConfigTitle>Configuration</ConfigTitle>
            <Select
              id="trigger-schedule"
              label="Schedule"
              value={config.cron}
              onChange={(e) => handleCronChange(e.target.value)}
              options={SCHEDULE_PRESETS}
            />
          </ConfigSection>
        );
      }

      case 'webhook': {
        const config = value as WebhookTriggerConfig;
        return (
          <ConfigSection>
            <ConfigTitle>Webhook URL</ConfigTitle>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
              Send POST requests to this URL to trigger the workflow.
            </p>
            <WebhookUrlContainer>
              <WebhookUrlInput
                id="trigger-webhook-url"
                type="text"
                value={config.webhook_url || 'Will be generated after save'}
                readOnly
                aria-label="Webhook URL"
              />
              <IconButton
                variant="outline"
                size="md"
                onClick={handleCopyWebhookUrl}
                aria-label="Copy webhook URL"
                disabled={!config.webhook_url}
              >
                <Copy size={16} />
              </IconButton>
            </WebhookUrlContainer>
          </ConfigSection>
        );
      }

      case 'rss': {
        const config = value as RssTriggerConfig;
        return (
          <ConfigSection>
            <ConfigTitle>Configuration</ConfigTitle>
            <Input
              id="trigger-feed-url"
              label="Feed URL"
              type="url"
              value={config.feed_url}
              onChange={(e) => handleFeedUrlChange(e.target.value)}
              placeholder="https://example.com/feed.xml"
            />
          </ConfigSection>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Container data-testid="trigger-selector">
      <TriggerGrid>
        {TRIGGER_OPTIONS.map(({ type, label, icon: Icon }) => {
          const isSelected = selectedType === type;
          return (
            <TriggerOption
              key={type}
              type="button"
              $selected={isSelected}
              onClick={() => handleTypeSelect(type)}
              data-testid={`trigger-option-${type}`}
              data-selected={isSelected}
              aria-pressed={isSelected}
            >
              <TriggerIconWrapper $selected={isSelected}>
                <Icon size={20} />
              </TriggerIconWrapper>
              <TriggerLabel $selected={isSelected}>{label}</TriggerLabel>
            </TriggerOption>
          );
        })}
      </TriggerGrid>

      {renderConfig()}
    </Container>
  );
});

TriggerSelector.displayName = 'TriggerSelector';
