'use client';

import { useState } from 'react';
import styled from 'styled-components';
import { Save, Bell, Shield, Palette, Lock, Sun, Moon, Monitor } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Alert, Button, Card, Input, Switch, PageHeader, SettingRow, SectionTitle as BaseSectionTitle, Text, FormActions, ToggleGroup } from '@/components/ui';
import { useTheme, type ThemeMode } from '@/styles/ThemeContext';

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

const SectionDescription = styled(Text)`
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
`;

const PasswordSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing[6]};
  padding-top: ${({ theme }) => theme.spacing[6]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const PasswordTitle = styled.h3`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

const PasswordActions = styled.div`
  margin-top: ${({ theme }) => theme.spacing[4]};
`;

const AlertWrapper = styled.div`
  margin-top: ${({ theme }) => theme.spacing[4]};
`;

export default function SettingsPage() {
  const { user, checkAuth } = useAuth();
  const { mode, setMode } = useTheme();
  const [username] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [notifications, setNotifications] = useState({
    syncComplete: true,
    syncFailed: true,
    weeklyReport: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const response = await api.updateProfile({
      email,
      settings: { notifications },
    });

    setIsSaving(false);

    if (!response.success) {
      setSaveError(response.error || 'Failed to save');
      return;
    }

    setSaveSuccess(true);
    checkAuth();
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleChangePassword = async () => {
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    setIsChangingPassword(true);

    const response = await api.changePassword(currentPassword, newPassword);

    setIsChangingPassword(false);

    if (!response.success) {
      setPasswordError(response.error || 'Failed to change password');
      return;
    }

    setShowPasswordForm(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your account and preferences"
      />

      <SettingsSections>
        <SectionCard padding="lg">
          <SectionHeader>
            <SectionIcon>
              <Shield size={20} />
            </SectionIcon>
            <SectionInfo>
              <BaseSectionTitle>Account</BaseSectionTitle>
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
              disabled
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

          {saveError && (
            <AlertWrapper><Alert variant="error">{saveError}</Alert></AlertWrapper>
          )}
          {saveSuccess && (
            <AlertWrapper><Alert variant="success">Changes saved successfully!</Alert></AlertWrapper>
          )}

          <FormActions>
            <Button variant="secondary" onClick={() => setShowPasswordForm(!showPasswordForm)}>
              <Lock size={16} />
              Change Password
            </Button>
            <Button onClick={handleSave} isLoading={isSaving}>
              <Save size={16} />
              Save Changes
            </Button>
          </FormActions>

          {showPasswordForm && (
            <PasswordSection>
              <PasswordTitle>Change Password</PasswordTitle>
              <SettingsGrid>
                <Input
                  label="Current Password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  fullWidth
                />
                <Input
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  fullWidth
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  fullWidth
                />
              </SettingsGrid>
              {passwordError && (
                <Alert variant="error">{passwordError}</Alert>
              )}
              <PasswordActions>
                <Button onClick={handleChangePassword} isLoading={isChangingPassword}>
                  Update Password
                </Button>
              </PasswordActions>
            </PasswordSection>
          )}
        </SectionCard>

        <SectionCard padding="lg">
          <SectionHeader>
            <SectionIcon>
              <Bell size={20} />
            </SectionIcon>
            <SectionInfo>
              <BaseSectionTitle>Notifications</BaseSectionTitle>
              <SectionDescription>
                Configure how you want to be notified
              </SectionDescription>
            </SectionInfo>
          </SectionHeader>

          <SettingRow
            label="Sync Completed"
            hint="Get notified when a sync completes"
          >
            <Switch
              checked={notifications.syncComplete}
              onChange={() =>
                setNotifications((prev) => ({
                  ...prev,
                  syncComplete: !prev.syncComplete,
                }))
              }
            />
          </SettingRow>

          <SettingRow
            label="Sync Failed"
            hint="Get notified when a sync fails"
          >
            <Switch
              checked={notifications.syncFailed}
              onChange={() =>
                setNotifications((prev) => ({
                  ...prev,
                  syncFailed: !prev.syncFailed,
                }))
              }
            />
          </SettingRow>

          <SettingRow
            label="Weekly Report"
            hint="Receive a weekly summary of your activity"
          >
            <Switch
              checked={notifications.weeklyReport}
              onChange={() =>
                setNotifications((prev) => ({
                  ...prev,
                  weeklyReport: !prev.weeklyReport,
                }))
              }
            />
          </SettingRow>
        </SectionCard>

        <SectionCard padding="lg">
          <SectionHeader>
            <SectionIcon>
              <Palette size={20} />
            </SectionIcon>
            <SectionInfo>
              <BaseSectionTitle>Appearance</BaseSectionTitle>
              <SectionDescription>
                Customize how ChirpSyncer looks
              </SectionDescription>
            </SectionInfo>
          </SectionHeader>

          <SettingRow
            label="Theme"
            hint="Choose your preferred color scheme"
          >
            <ToggleGroup
              options={[
                { value: 'light', label: 'Light', icon: <Sun /> },
                { value: 'dark', label: 'Dark', icon: <Moon /> },
                { value: 'system', label: 'System', icon: <Monitor /> },
              ]}
              value={mode}
              onChange={(value) => setMode(value as ThemeMode)}
              variant="pill"
            />
          </SettingRow>
        </SectionCard>
      </SettingsSections>
    </div>
  );
}
