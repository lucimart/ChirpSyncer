import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import styled from 'styled-components';
import { SettingRow } from './SettingRow';
import { Switch } from '../Switch';
import { Input } from '../Input';
import { Button } from '../Button';

const meta: Meta<typeof SettingRow> = {
  title: 'UI/SettingRow',
  component: SettingRow,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SettingRow>;

const Container = styled.div`
  max-width: 600px;
  background: white;
  border-radius: 8px;
  padding: 16px;
`;

const WithSwitchDemo = () => {
  const [enabled, setEnabled] = useState(true);
  return (
    <Container>
      <SettingRow
        label="Email Notifications"
        hint="Receive updates about your account"
      >
        <Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} aria-label="Email Notifications" />
      </SettingRow>
    </Container>
  );
};

const MultipleSettingsDemo = () => {
  const [syncComplete, setSyncComplete] = useState(true);
  const [syncFailed, setSyncFailed] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);

  return (
    <Container>
      <SettingRow
        label="Sync Completed"
        hint="Get notified when a sync completes"
      >
        <Switch checked={syncComplete} onChange={(e) => setSyncComplete(e.target.checked)} aria-label="Sync Completed" />
      </SettingRow>
      <SettingRow
        label="Sync Failed"
        hint="Get notified when a sync fails"
      >
        <Switch checked={syncFailed} onChange={(e) => setSyncFailed(e.target.checked)} aria-label="Sync Failed" />
      </SettingRow>
      <SettingRow
        label="Weekly Report"
        hint="Receive a weekly summary of your activity"
      >
        <Switch checked={weeklyReport} onChange={(e) => setWeeklyReport(e.target.checked)} aria-label="Weekly Report" />
      </SettingRow>
    </Container>
  );
};

const WithoutHintDemo = () => {
  const [enabled, setEnabled] = useState(false);
  return (
    <Container>
      <SettingRow label="Dark Mode">
        <Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} aria-label="Dark Mode" />
      </SettingRow>
    </Container>
  );
};

const NoBorderDemo = () => {
  const [enabled, setEnabled] = useState(true);
  return (
    <Container>
      <SettingRow label="Single Setting" hint="This has no border" noBorder>
        <Switch checked={enabled} onChange={(e) => setEnabled(e.target.checked)} aria-label="Single Setting" />
      </SettingRow>
    </Container>
  );
};

export const WithSwitch: Story = {
  render: () => <WithSwitchDemo />,
};

export const WithButton: Story = {
  render: () => (
    <Container>
      <SettingRow
        label="Connected Accounts"
        hint="Manage your linked social media accounts"
      >
        <Button variant="secondary" size="sm">
          Manage
        </Button>
      </SettingRow>
    </Container>
  ),
};

export const WithInput: Story = {
  render: () => (
    <Container>
      <SettingRow label="API Key" hint="Your unique API key for integrations">
        <Input
          type="text"
          value="sk-xxxx-xxxx-xxxx"
          readOnly
          style={{ width: '200px' }}
          aria-label="API Key"
        />
      </SettingRow>
    </Container>
  ),
};

export const MultipleSettings: Story = {
  render: () => <MultipleSettingsDemo />,
};

export const WithoutHint: Story = {
  render: () => <WithoutHintDemo />,
};

export const NoBorder: Story = {
  render: () => <NoBorderDemo />,
};

export const WithStatus: Story = {
  render: () => (
    <Container>
      <SettingRow
        label="Account Status"
        hint="Your current plan and subscription"
      >
        <span style={{ color: '#15803D', fontWeight: 500 }}>Active</span>
      </SettingRow>
    </Container>
  ),
};
