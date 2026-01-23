'use client';

/**
 * PreferencesPanel Component
 *
 * Notification preferences settings with channel toggles,
 * integration inputs, and quiet hours configuration.
 */

import { memo, FC, useCallback } from 'react';
import styled from 'styled-components';
import {
  Bell,
  MessageCircle,
  Mail,
  Send,
  Moon,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Stack } from '@/components/ui/Stack';
import { Switch } from '@/components/ui/Switch';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import {
  useNotificationPreferences,
  useUpdatePreferences,
  useTestChannel,
} from '@/lib/notifications';
import {
  PreferencesPanelProps,
  NotificationChannelPreferences,
  HOURS,
  DIGEST_FREQUENCIES,
  isValidDiscordWebhookUrl,
} from './types';

const PanelContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[6]};
`;

const SectionTitle = styled.h3`
  margin: 0 0 ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ChannelRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[4]};
  background-color: ${({ theme }) => theme.colors.background.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const ChannelInfo = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[3]};
  flex: 1;
`;

const ChannelIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background-color: ${({ theme }) => theme.colors.primary[100]};
  color: ${({ theme }) => theme.colors.primary[600]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  flex-shrink: 0;
`;

const ChannelDetails = styled.div`
  flex: 1;
`;

const ChannelName = styled.h4`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ChannelDescription = styled.p`
  margin: ${({ theme }) => theme.spacing[1]} 0 0;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const ChannelConfig = styled.div`
  margin-top: ${({ theme }) => theme.spacing[3]};
`;

const ConfigActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[2]};
`;

const QuietHoursRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
`;

const TimeSelect = styled.select`
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background-color: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary[100]};
  }
`;

const FrequencySelect = styled.select`
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background-color: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary[100]};
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[8]};
`;

const ErrorMessage = styled.p`
  margin: 0;
  padding: ${({ theme }) => theme.spacing[4]};
  color: ${({ theme }) => theme.colors.danger[600]};
  background-color: ${({ theme }) => theme.colors.surface.danger.bg};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const ValidationError = styled.span`
  display: block;
  margin-top: ${({ theme }) => theme.spacing[1]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.danger[600]};
`;

export const PreferencesPanel: FC<PreferencesPanelProps> = memo(({ className }) => {
  const { data: preferences, isLoading, error } = useNotificationPreferences();
  const updatePreferences = useUpdatePreferences();
  const testChannel = useTestChannel();

  const handleToggle = useCallback(
    (key: keyof NotificationChannelPreferences, value: boolean) => {
      updatePreferences.mutate({ [key]: value });
    },
    [updatePreferences]
  );

  const handleInputChange = useCallback(
    (key: keyof NotificationChannelPreferences, value: string | number) => {
      updatePreferences.mutate({ [key]: value });
    },
    [updatePreferences]
  );

  const handleTestChannel = useCallback(
    (channel: 'telegram' | 'discord' | 'email') => {
      testChannel.mutate(channel);
    },
    [testChannel]
  );

  if (isLoading) {
    return (
      <LoadingContainer data-testid="preferences-loading">
        <Spinner size="lg" />
      </LoadingContainer>
    );
  }

  if (error || !preferences) {
    return (
      <ErrorMessage>
        Failed to load preferences. Please try again later.
      </ErrorMessage>
    );
  }

  const discordUrlValid = isValidDiscordWebhookUrl(preferences.discord_webhook_url);
  const telegramConfigured = !!preferences.telegram_chat_id;
  const discordConfigured = !!preferences.discord_webhook_url && discordUrlValid;

  return (
    <PanelContainer className={className}>
      {/* Notification Channels */}
      <Card>
        <SectionTitle>Notification Channels</SectionTitle>
        <Stack gap={4}>
          {/* In-App */}
          <ChannelRow>
            <ChannelInfo>
              <ChannelIcon>
                <Bell size={20} />
              </ChannelIcon>
              <ChannelDetails>
                <ChannelName>In-App Notifications</ChannelName>
                <ChannelDescription>
                  Receive notifications within the application
                </ChannelDescription>
              </ChannelDetails>
            </ChannelInfo>
            <Switch
              checked={preferences.in_app_enabled}
              onChange={(e) => handleToggle('in_app_enabled', e.target.checked)}
              aria-label="In-App Notifications"
            />
          </ChannelRow>

          {/* Telegram */}
          <ChannelRow>
            <ChannelInfo>
              <ChannelIcon>
                <Send size={20} />
              </ChannelIcon>
              <ChannelDetails>
                <ChannelName>Telegram</ChannelName>
                <ChannelDescription>
                  Get instant notifications via Telegram bot
                </ChannelDescription>
                {preferences.telegram_enabled && (
                  <ChannelConfig>
                    <Input
                      label="Telegram Chat ID"
                      value={preferences.telegram_chat_id || ''}
                      onChange={(e) =>
                        handleInputChange('telegram_chat_id', e.target.value)
                      }
                      placeholder="Enter your chat ID"
                      size="sm"
                    />
                    <ConfigActions>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleTestChannel('telegram')}
                        disabled={!telegramConfigured || testChannel.isPending}
                        aria-label="Test Telegram"
                      >
                        {testChannel.isPending ? 'Testing...' : 'Test Telegram'}
                      </Button>
                    </ConfigActions>
                  </ChannelConfig>
                )}
              </ChannelDetails>
            </ChannelInfo>
            <Switch
              checked={preferences.telegram_enabled}
              onChange={(e) => handleToggle('telegram_enabled', e.target.checked)}
              aria-label="Telegram"
            />
          </ChannelRow>

          {/* Discord */}
          <ChannelRow>
            <ChannelInfo>
              <ChannelIcon>
                <MessageCircle size={20} />
              </ChannelIcon>
              <ChannelDetails>
                <ChannelName>Discord</ChannelName>
                <ChannelDescription>
                  Post notifications to a Discord channel via webhook
                </ChannelDescription>
                {preferences.discord_enabled && (
                  <ChannelConfig>
                    <Input
                      label="Discord Webhook URL"
                      value={preferences.discord_webhook_url || ''}
                      onChange={(e) =>
                        handleInputChange('discord_webhook_url', e.target.value)
                      }
                      placeholder="https://discord.com/api/webhooks/..."
                      size="sm"
                      error={
                        preferences.discord_webhook_url && !discordUrlValid
                          ? 'Invalid webhook URL'
                          : undefined
                      }
                    />
                    <ConfigActions>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleTestChannel('discord')}
                        disabled={!discordConfigured || testChannel.isPending}
                        aria-label="Test Discord"
                      >
                        {testChannel.isPending ? 'Testing...' : 'Test Discord'}
                      </Button>
                    </ConfigActions>
                  </ChannelConfig>
                )}
              </ChannelDetails>
            </ChannelInfo>
            <Switch
              checked={preferences.discord_enabled}
              onChange={(e) => handleToggle('discord_enabled', e.target.checked)}
              aria-label="Discord"
            />
          </ChannelRow>

          {/* Email Digest */}
          <ChannelRow>
            <ChannelInfo>
              <ChannelIcon>
                <Mail size={20} />
              </ChannelIcon>
              <ChannelDetails>
                <ChannelName>Email Digest</ChannelName>
                <ChannelDescription>
                  Receive a summary of notifications via email
                </ChannelDescription>
                {preferences.email_digest_enabled && (
                  <ChannelConfig>
                    <div>
                      <label
                        htmlFor="digest-frequency"
                        style={{
                          display: 'block',
                          marginBottom: '4px',
                          fontSize: '12px',
                        }}
                      >
                        Digest Frequency
                      </label>
                      <FrequencySelect
                        id="digest-frequency"
                        value={preferences.email_digest_frequency}
                        onChange={(e) =>
                          handleInputChange(
                            'email_digest_frequency',
                            e.target.value as 'daily' | 'weekly'
                          )
                        }
                        aria-label="Digest Frequency"
                      >
                        {DIGEST_FREQUENCIES.map((freq) => (
                          <option key={freq.value} value={freq.value}>
                            {freq.label}
                          </option>
                        ))}
                      </FrequencySelect>
                    </div>
                    <ConfigActions>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleTestChannel('email')}
                        disabled={testChannel.isPending}
                        aria-label="Test Email"
                      >
                        {testChannel.isPending ? 'Testing...' : 'Test Email'}
                      </Button>
                    </ConfigActions>
                  </ChannelConfig>
                )}
              </ChannelDetails>
            </ChannelInfo>
            <Switch
              checked={preferences.email_digest_enabled}
              onChange={(e) => handleToggle('email_digest_enabled', e.target.checked)}
              aria-label="Email Digest"
            />
          </ChannelRow>
        </Stack>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <SectionTitle>
          <Stack direction="row" gap={2} align="center">
            <Moon size={20} />
            Quiet Hours
          </Stack>
        </SectionTitle>
        <p
          style={{
            margin: '0 0 16px',
            fontSize: '14px',
            color: 'var(--colors-text-secondary)',
          }}
        >
          Pause non-critical notifications during these hours
        </p>
        <QuietHoursRow>
          <div>
            <label
              htmlFor="quiet-hours-start"
              style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}
            >
              Quiet Hours Start
            </label>
            <TimeSelect
              id="quiet-hours-start"
              value={preferences.quiet_hours_start?.toString() ?? ''}
              onChange={(e) =>
                handleInputChange('quiet_hours_start', parseInt(e.target.value, 10))
              }
              aria-label="Quiet Hours Start"
            >
              <option value="">Not set</option>
              {HOURS.map((hour) => (
                <option key={hour.value} value={hour.value}>
                  {hour.label}
                </option>
              ))}
            </TimeSelect>
          </div>
          <div>
            <label
              htmlFor="quiet-hours-end"
              style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}
            >
              Quiet Hours End
            </label>
            <TimeSelect
              id="quiet-hours-end"
              value={preferences.quiet_hours_end?.toString() ?? ''}
              onChange={(e) =>
                handleInputChange('quiet_hours_end', parseInt(e.target.value, 10))
              }
              aria-label="Quiet Hours End"
            >
              <option value="">Not set</option>
              {HOURS.map((hour) => (
                <option key={hour.value} value={hour.value}>
                  {hour.label}
                </option>
              ))}
            </TimeSelect>
          </div>
        </QuietHoursRow>
      </Card>
    </PanelContainer>
  );
});

PreferencesPanel.displayName = 'PreferencesPanel';
