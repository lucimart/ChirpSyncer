'use client';

/**
 * NotificationSettings Component
 *
 * Renders notification preferences form with channels, thresholds,
 * quiet hours, and category toggles.
 */

import { useState, useCallback, memo, type FC } from 'react';
import styled from 'styled-components';
import {
  Button,
  Card,
  Input,
  Switch,
  Stack,
  FormActions,
  SettingRow,
  Typography,
  SectionTitle,
} from '@/components/ui';
import type {
  NotificationPreferences,
  NotificationChannels,
  NotificationThresholds,
  NotificationCategories,
} from '../types';

export interface NotificationSettingsProps {
  preferences: NotificationPreferences;
  onSave: (preferences: NotificationPreferences) => void;
  onCancel: () => void;
}

const StyledNumberInput = styled(Input)`
  width: 80px;
`;

const ErrorMessage = styled.span`
  color: ${({ theme }) => theme.colors.danger[600]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  display: block;
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

export const NotificationSettings: FC<NotificationSettingsProps> = memo(({
  preferences,
  onSave,
  onCancel,
}) => {
  const [formState, setFormState] = useState<NotificationPreferences>(preferences);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChannelChange = useCallback((channel: keyof NotificationChannels) => {
    setFormState((prev) => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channel]: !prev.channels[channel],
      },
    }));
  }, []);

  const handleThresholdChange = useCallback((threshold: keyof NotificationThresholds, value: string) => {
    const numValue = parseInt(value, 10);
    setFormState((prev) => ({
      ...prev,
      thresholds: {
        ...prev.thresholds,
        [threshold]: isNaN(numValue) ? 0 : numValue,
      },
    }));
  }, []);

  const handleQuietHoursToggle = useCallback(() => {
    setFormState((prev) => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        enabled: !prev.quietHours.enabled,
      },
    }));
  }, []);

  const handleQuietHoursTimeChange = useCallback((field: 'start' | 'end', value: string) => {
    setFormState((prev) => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        [field]: value,
      },
    }));
  }, []);

  const handleCategoryChange = useCallback((category: keyof NotificationCategories) => {
    setFormState((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: !prev.categories[category],
      },
    }));
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (formState.thresholds.syncFailures < 0) {
      newErrors.syncFailures = 'must be a positive number';
    }
    if (formState.thresholds.rateLimitWarning < 0) {
      newErrors.rateLimitWarning = 'must be a positive number';
    }
    if (formState.thresholds.engagementDrop < 0) {
      newErrors.engagementDrop = 'must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formState.thresholds]);

  const handleSave = useCallback(() => {
    if (validateForm()) {
      onSave(formState);
    }
  }, [validateForm, onSave, formState]);

  return (
    <Card padding="lg" data-testid="notification-settings">
      <Typography variant="h2" style={{ marginBottom: '1.5rem' }}>
        Notification Settings
      </Typography>

      <Stack gap={6}>
        <div data-testid="channel-settings">
          <SectionTitle>Notification Channels</SectionTitle>
          <SettingRow
            label="In-App Notifications"
            hint="Show notifications within the application"
          >
            <Switch
              id="channel-inApp"
              data-testid="channel-inApp"
              checked={formState.channels.inApp}
              onChange={() => handleChannelChange('inApp')}
            />
          </SettingRow>
          <SettingRow
            label="Email Notifications"
            hint="Receive notifications via email"
          >
            <Switch
              id="channel-email"
              data-testid="channel-email"
              checked={formState.channels.email}
              onChange={() => handleChannelChange('email')}
            />
          </SettingRow>
          <SettingRow
            label="Push Notifications"
            hint="Receive push notifications on your device"
          >
            <Switch
              id="channel-push"
              data-testid="channel-push"
              checked={formState.channels.push}
              onChange={() => handleChannelChange('push')}
            />
          </SettingRow>
        </div>

        <div data-testid="threshold-settings">
          <SectionTitle>Alert Thresholds</SectionTitle>
          <SettingRow
            label="Sync Failures"
            hint={errors.syncFailures ? undefined : 'Alert after this many consecutive failures'}
          >
            <Stack gap={1}>
              <StyledNumberInput
                type="number"
                textAlign="center"
                data-testid="threshold-syncFailures"
                value={formState.thresholds.syncFailures}
                onChange={(e) => handleThresholdChange('syncFailures', e.target.value)}
                min={0}
              />
              {errors.syncFailures && <ErrorMessage>{errors.syncFailures}</ErrorMessage>}
            </Stack>
          </SettingRow>
          <SettingRow
            label="Rate Limit Warning (%)"
            hint={errors.rateLimitWarning ? undefined : 'Alert when API rate limit usage exceeds this percentage'}
          >
            <Stack gap={1}>
              <StyledNumberInput
                type="number"
                textAlign="center"
                data-testid="threshold-rateLimitWarning"
                value={formState.thresholds.rateLimitWarning}
                onChange={(e) => handleThresholdChange('rateLimitWarning', e.target.value)}
                min={0}
                max={100}
              />
              {errors.rateLimitWarning && <ErrorMessage>{errors.rateLimitWarning}</ErrorMessage>}
            </Stack>
          </SettingRow>
          <SettingRow
            label="Engagement Drop (%)"
            hint={errors.engagementDrop ? undefined : 'Alert when engagement drops by this percentage'}
          >
            <Stack gap={1}>
              <StyledNumberInput
                type="number"
                textAlign="center"
                data-testid="threshold-engagementDrop"
                value={formState.thresholds.engagementDrop}
                onChange={(e) => handleThresholdChange('engagementDrop', e.target.value)}
                min={0}
                max={100}
              />
              {errors.engagementDrop && <ErrorMessage>{errors.engagementDrop}</ErrorMessage>}
            </Stack>
          </SettingRow>
        </div>

        <div data-testid="quiet-hours-settings">
          <SectionTitle>Quiet Hours</SectionTitle>
          <SettingRow
            label="Enable Quiet Hours"
            hint="Suppress non-critical notifications during specified hours"
          >
            <Switch
              id="quiet-hours-enabled"
              data-testid="quiet-hours-enabled"
              checked={formState.quietHours.enabled}
              onChange={handleQuietHoursToggle}
            />
          </SettingRow>
          <SettingRow label="Quiet Hours Schedule">
            <Stack direction="row" align="center" gap={2}>
              <Input
                type="time"
                data-testid="quiet-hours-start"
                value={formState.quietHours.start}
                onChange={(e) => handleQuietHoursTimeChange('start', e.target.value)}
                disabled={!formState.quietHours.enabled}
              />
              <span>to</span>
              <Input
                type="time"
                data-testid="quiet-hours-end"
                value={formState.quietHours.end}
                onChange={(e) => handleQuietHoursTimeChange('end', e.target.value)}
                disabled={!formState.quietHours.enabled}
              />
            </Stack>
          </SettingRow>
        </div>

        <div data-testid="category-settings">
          <SectionTitle>Notification Categories</SectionTitle>
          <SettingRow
            label="Sync Notifications"
            hint="Sync completions, failures, and progress updates"
          >
            <Switch
              id="category-sync"
              data-testid="category-sync"
              checked={formState.categories.sync}
              onChange={() => handleCategoryChange('sync')}
            />
          </SettingRow>
          <SettingRow
            label="Scheduling Notifications"
            hint="Scheduled post reminders and confirmations"
          >
            <Switch
              id="category-scheduling"
              data-testid="category-scheduling"
              checked={formState.categories.scheduling}
              onChange={() => handleCategoryChange('scheduling')}
            />
          </SettingRow>
          <SettingRow
            label="Engagement Notifications"
            hint="Engagement alerts and analytics updates"
          >
            <Switch
              id="category-engagement"
              data-testid="category-engagement"
              checked={formState.categories.engagement}
              onChange={() => handleCategoryChange('engagement')}
            />
          </SettingRow>
          <SettingRow
            label="Security Notifications"
            hint="Credential expirations and security alerts"
          >
            <Switch
              id="category-security"
              data-testid="category-security"
              checked={formState.categories.security}
              onChange={() => handleCategoryChange('security')}
            />
          </SettingRow>
        </div>
      </Stack>

      <FormActions>
        <Button variant="secondary" size="sm" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" type="button" onClick={handleSave}>
          Save
        </Button>
      </FormActions>
    </Card>
  );
});

NotificationSettings.displayName = 'NotificationSettings';
