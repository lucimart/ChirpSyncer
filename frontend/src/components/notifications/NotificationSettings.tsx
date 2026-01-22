'use client';

import { useState } from 'react';
import styled from 'styled-components';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input/Input';
import { Switch } from '../ui';

export interface NotificationPreferences {
  channels: {
    inApp: boolean;
    email: boolean;
    push: boolean;
  };
  thresholds: {
    syncFailures: number;
    rateLimitWarning: number;
    engagementDrop: number;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  categories: {
    sync: boolean;
    scheduling: boolean;
    engagement: boolean;
    security: boolean;
  };
}

export interface NotificationSettingsProps {
  preferences: NotificationPreferences;
  onSave: (preferences: NotificationPreferences) => void;
  onCancel: () => void;
}

const Container = styled.div`
  padding: ${({ theme }) => theme.spacing[6]};
  background: ${({ theme }) => theme.colors.background.primary};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
`;

const Title = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing[6]};
`;

const Section = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const SectionTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing[4]};
`;

const SettingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[3]} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  &:last-child {
    border-bottom: none;
  }
`;

const SettingLabel = styled.label`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  cursor: pointer;
`;

const SettingDescription = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
  display: block;
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const StyledNumberInput = styled(Input)`
  width: 80px;
`;

const TimeInputGroup = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[6]};
  padding-top: ${({ theme }) => theme.spacing[4]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const ErrorMessage = styled.span`
  color: ${({ theme }) => theme.colors.danger[600]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  display: block;
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

export function NotificationSettings({ preferences, onSave, onCancel }: NotificationSettingsProps) {
  const [formState, setFormState] = useState<NotificationPreferences>(preferences);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleChannelChange = (channel: keyof NotificationPreferences['channels']) => {
    setFormState((prev) => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channel]: !prev.channels[channel],
      },
    }));
  };

  const handleThresholdChange = (threshold: keyof NotificationPreferences['thresholds'], value: string) => {
    const numValue = parseInt(value, 10);
    setFormState((prev) => ({
      ...prev,
      thresholds: {
        ...prev.thresholds,
        [threshold]: isNaN(numValue) ? 0 : numValue,
      },
    }));
  };

  const handleQuietHoursToggle = () => {
    setFormState((prev) => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        enabled: !prev.quietHours.enabled,
      },
    }));
  };

  const handleQuietHoursTimeChange = (field: 'start' | 'end', value: string) => {
    setFormState((prev) => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        [field]: value,
      },
    }));
  };

  const handleCategoryChange = (category: keyof NotificationPreferences['categories']) => {
    setFormState((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [category]: !prev.categories[category],
      },
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

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
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formState);
    }
  };

  return (
    <Container data-testid="notification-settings">
      <Title>Notification Settings</Title>

      <Section data-testid="channel-settings">
        <SectionTitle>Notification Channels</SectionTitle>
        <SettingRow>
          <div>
            <SettingLabel htmlFor="channel-inApp">In-App Notifications</SettingLabel>
            <SettingDescription>Show notifications within the application</SettingDescription>
          </div>
          <Switch
            id="channel-inApp"
            data-testid="channel-inApp"
            checked={formState.channels.inApp}
            onChange={() => handleChannelChange('inApp')}
          />
        </SettingRow>
        <SettingRow>
          <div>
            <SettingLabel htmlFor="channel-email">Email Notifications</SettingLabel>
            <SettingDescription>Receive notifications via email</SettingDescription>
          </div>
          <Switch
            id="channel-email"
            data-testid="channel-email"
            checked={formState.channels.email}
            onChange={() => handleChannelChange('email')}
          />
        </SettingRow>
        <SettingRow>
          <div>
            <SettingLabel htmlFor="channel-push">Push Notifications</SettingLabel>
            <SettingDescription>Receive push notifications on your device</SettingDescription>
          </div>
          <Switch
            id="channel-push"
            data-testid="channel-push"
            checked={formState.channels.push}
            onChange={() => handleChannelChange('push')}
          />
        </SettingRow>
      </Section>

      <Section data-testid="threshold-settings">
        <SectionTitle>Alert Thresholds</SectionTitle>
        <SettingRow>
          <div>
            <SettingLabel>Sync Failures</SettingLabel>
            <SettingDescription>Alert after this many consecutive failures</SettingDescription>
            {errors.syncFailures && <ErrorMessage>{errors.syncFailures}</ErrorMessage>}
          </div>
          <StyledNumberInput
            type="number"
            textAlign="center"
            data-testid="threshold-syncFailures"
            value={formState.thresholds.syncFailures}
            onChange={(e) => handleThresholdChange('syncFailures', e.target.value)}
            min={0}
          />
        </SettingRow>
        <SettingRow>
          <div>
            <SettingLabel>Rate Limit Warning (%)</SettingLabel>
            <SettingDescription>Alert when API rate limit usage exceeds this percentage</SettingDescription>
            {errors.rateLimitWarning && <ErrorMessage>{errors.rateLimitWarning}</ErrorMessage>}
          </div>
          <StyledNumberInput
            type="number"
            textAlign="center"
            data-testid="threshold-rateLimitWarning"
            value={formState.thresholds.rateLimitWarning}
            onChange={(e) => handleThresholdChange('rateLimitWarning', e.target.value)}
            min={0}
            max={100}
          />
        </SettingRow>
        <SettingRow>
          <div>
            <SettingLabel>Engagement Drop (%)</SettingLabel>
            <SettingDescription>Alert when engagement drops by this percentage</SettingDescription>
            {errors.engagementDrop && <ErrorMessage>{errors.engagementDrop}</ErrorMessage>}
          </div>
          <StyledNumberInput
            type="number"
            textAlign="center"
            data-testid="threshold-engagementDrop"
            value={formState.thresholds.engagementDrop}
            onChange={(e) => handleThresholdChange('engagementDrop', e.target.value)}
            min={0}
            max={100}
          />
        </SettingRow>
      </Section>

      <Section data-testid="quiet-hours-settings">
        <SectionTitle>Quiet Hours</SectionTitle>
        <SettingRow>
          <div>
            <SettingLabel htmlFor="quiet-hours-enabled">Enable Quiet Hours</SettingLabel>
            <SettingDescription>Suppress non-critical notifications during specified hours</SettingDescription>
          </div>
          <Switch
            id="quiet-hours-enabled"
            data-testid="quiet-hours-enabled"
            checked={formState.quietHours.enabled}
            onChange={handleQuietHoursToggle}
          />
        </SettingRow>
        <SettingRow>
          <SettingLabel>Quiet Hours Schedule</SettingLabel>
          <TimeInputGroup>
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
          </TimeInputGroup>
        </SettingRow>
      </Section>

      <Section data-testid="category-settings">
        <SectionTitle>Notification Categories</SectionTitle>
        <SettingRow>
          <div>
            <SettingLabel htmlFor="category-sync">Sync Notifications</SettingLabel>
            <SettingDescription>Sync completions, failures, and progress updates</SettingDescription>
          </div>
          <Switch
            id="category-sync"
            data-testid="category-sync"
            checked={formState.categories.sync}
            onChange={() => handleCategoryChange('sync')}
          />
        </SettingRow>
        <SettingRow>
          <div>
            <SettingLabel htmlFor="category-scheduling">Scheduling Notifications</SettingLabel>
            <SettingDescription>Scheduled post reminders and confirmations</SettingDescription>
          </div>
          <Switch
            id="category-scheduling"
            data-testid="category-scheduling"
            checked={formState.categories.scheduling}
            onChange={() => handleCategoryChange('scheduling')}
          />
        </SettingRow>
        <SettingRow>
          <div>
            <SettingLabel htmlFor="category-engagement">Engagement Notifications</SettingLabel>
            <SettingDescription>Engagement alerts and analytics updates</SettingDescription>
          </div>
          <Switch
            id="category-engagement"
            data-testid="category-engagement"
            checked={formState.categories.engagement}
            onChange={() => handleCategoryChange('engagement')}
          />
        </SettingRow>
        <SettingRow>
          <div>
            <SettingLabel htmlFor="category-security">Security Notifications</SettingLabel>
            <SettingDescription>Credential expirations and security alerts</SettingDescription>
          </div>
          <Switch
            id="category-security"
            data-testid="category-security"
            checked={formState.categories.security}
            onChange={() => handleCategoryChange('security')}
          />
        </SettingRow>
      </Section>

      <ButtonGroup>
        <Button variant="secondary" size="sm" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" type="button" onClick={handleSave}>
          Save
        </Button>
      </ButtonGroup>
    </Container>
  );
}
