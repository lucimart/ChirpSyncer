'use client';

import { useState } from 'react';
import styled from 'styled-components';
import { Save, Bell, Shield, Palette } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button, Card, Input } from '@/components/ui';

const PageHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const PageDescription = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const SettingsSections = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[6]};
`;

const SectionCard = styled(Card)``;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  padding-bottom: ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const SectionIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background-color: ${({ theme }) => theme.colors.primary[50]};
  color: ${({ theme }) => theme.colors.primary[600]};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const SectionInfo = styled.div``;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const SectionDescription = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
`;

const SettingItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing[3]} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  &:last-child {
    border-bottom: none;
  }
`;

const SettingInfo = styled.div``;

const SettingLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const SettingHint = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const Toggle = styled.button<{ $active: boolean }>`
  width: 44px;
  height: 24px;
  border-radius: 12px;
  border: none;
  background-color: ${({ $active, theme }) =>
    $active ? theme.colors.primary[600] : theme.colors.neutral[300]};
  position: relative;
  cursor: pointer;
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${({ $active }) => ($active ? '22px' : '2px')};
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background-color: white;
    transition: left ${({ theme }) => theme.transitions.fast};
  }
`;

const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[6]};
  padding-top: ${({ theme }) => theme.spacing[4]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`;

export default function SettingsPage() {
  const { user } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [notifications, setNotifications] = useState({
    syncComplete: true,
    syncFailed: true,
    weeklyReport: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Mock save - replace with actual API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
  };

  return (
    <div>
      <PageHeader>
        <PageTitle>Settings</PageTitle>
        <PageDescription>Manage your account and preferences</PageDescription>
      </PageHeader>

      <SettingsSections>
        <SectionCard padding="lg">
          <SectionHeader>
            <SectionIcon>
              <Shield size={20} />
            </SectionIcon>
            <SectionInfo>
              <SectionTitle>Account</SectionTitle>
              <SectionDescription>
                Manage your account information
              </SectionDescription>
            </SectionInfo>
          </SectionHeader>

          <SettingsGrid>
            <Input
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />
          </SettingsGrid>

          <FormActions>
            <Button variant="secondary">Change Password</Button>
            <Button onClick={handleSave} isLoading={isSaving}>
              <Save size={16} />
              Save Changes
            </Button>
          </FormActions>
        </SectionCard>

        <SectionCard padding="lg">
          <SectionHeader>
            <SectionIcon>
              <Bell size={20} />
            </SectionIcon>
            <SectionInfo>
              <SectionTitle>Notifications</SectionTitle>
              <SectionDescription>
                Configure how you want to be notified
              </SectionDescription>
            </SectionInfo>
          </SectionHeader>

          <SettingItem>
            <SettingInfo>
              <SettingLabel>Sync Completed</SettingLabel>
              <SettingHint>Get notified when a sync completes</SettingHint>
            </SettingInfo>
            <Toggle
              $active={notifications.syncComplete}
              onClick={() =>
                setNotifications((prev) => ({
                  ...prev,
                  syncComplete: !prev.syncComplete,
                }))
              }
            />
          </SettingItem>

          <SettingItem>
            <SettingInfo>
              <SettingLabel>Sync Failed</SettingLabel>
              <SettingHint>Get notified when a sync fails</SettingHint>
            </SettingInfo>
            <Toggle
              $active={notifications.syncFailed}
              onClick={() =>
                setNotifications((prev) => ({
                  ...prev,
                  syncFailed: !prev.syncFailed,
                }))
              }
            />
          </SettingItem>

          <SettingItem>
            <SettingInfo>
              <SettingLabel>Weekly Report</SettingLabel>
              <SettingHint>Receive a weekly summary of your activity</SettingHint>
            </SettingInfo>
            <Toggle
              $active={notifications.weeklyReport}
              onClick={() =>
                setNotifications((prev) => ({
                  ...prev,
                  weeklyReport: !prev.weeklyReport,
                }))
              }
            />
          </SettingItem>
        </SectionCard>

        <SectionCard padding="lg">
          <SectionHeader>
            <SectionIcon>
              <Palette size={20} />
            </SectionIcon>
            <SectionInfo>
              <SectionTitle>Appearance</SectionTitle>
              <SectionDescription>
                Customize how ChirpSyncer looks
              </SectionDescription>
            </SectionInfo>
          </SectionHeader>

          <SettingItem>
            <SettingInfo>
              <SettingLabel>Dark Mode</SettingLabel>
              <SettingHint>Coming soon</SettingHint>
            </SettingInfo>
            <Toggle $active={false} disabled />
          </SettingItem>
        </SectionCard>
      </SettingsSections>
    </div>
  );
}
