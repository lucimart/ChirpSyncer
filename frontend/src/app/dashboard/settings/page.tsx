'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import styled from 'styled-components';
import { Save, Bell, Shield, Palette, Lock, Sun, Moon, Monitor, Link2, Unlink, ExternalLink, Smartphone, Trash2, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api, type LinkedAccount, type ActiveSession } from '@/lib/api';
import { Alert, Button, Card, Input, Switch, PageHeader, SettingRow, SectionTitle as BaseSectionTitle, Text, FormActions, ToggleGroup, Stack } from '@/components/ui';
import { useTheme, type ThemeMode } from '@/styles/ThemeContext';

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

const AccountsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const AccountItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[4]};
  background-color: ${({ theme }) => theme.colors.background.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const AccountInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const ProviderIcon = styled.div<{ $provider: string }>`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ $provider }) => {
    switch ($provider) {
      case 'google': return '#EA4335';
      case 'github': return '#24292e';
      case 'twitter': return '#1DA1F2';
      default: return '#6B7280';
    }
  }};
  color: white;
  font-weight: 600;
  font-size: 14px;
`;

const AccountDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const ProviderName = styled(Text)`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  text-transform: capitalize;
`;

const ProviderUsername = styled(Text)`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const NotLinkedText = styled(Text)`
  color: ${({ theme }) => theme.colors.text.muted};
  font-style: italic;
`;

const SessionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const SessionItem = styled.div<{ $isCurrent?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[4]};
  background-color: ${({ theme, $isCurrent }) =>
    $isCurrent ? theme.colors.primary[50] : theme.colors.background.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid ${({ theme, $isCurrent }) =>
    $isCurrent ? theme.colors.primary[200] : theme.colors.border.light};
`;

const SessionInfo = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[3]};
  flex: 1;
`;

const SessionIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background-color: ${({ theme }) => theme.colors.neutral[100]};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.neutral[600]};
`;

const SessionDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const SessionDevice = styled(Text)`
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const SessionMeta = styled(Text)`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
`;

const CurrentBadge = styled.span`
  background-color: ${({ theme }) => theme.colors.primary[500]};
  color: white;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  margin-left: ${({ theme }) => theme.spacing[2]};
`;

const SessionActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[4]};
`;

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const { user, checkAuth } = useAuth();
  const { mode, setMode } = useTheme();
  const [username] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);
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

  // Connected accounts state
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [unlinkingProvider, setUnlinkingProvider] = useState<string | null>(null);

  const fetchLinkedAccounts = useCallback(async () => {
    setIsLoadingAccounts(true);
    setAccountsError(null);
    const response = await api.getLinkedAccounts();
    setIsLoadingAccounts(false);

    if (!response.success) {
      setAccountsError(response.error || 'Failed to load connected accounts');
      return;
    }

    setLinkedAccounts(response.data?.accounts || []);
    setAvailableProviders(response.data?.available_providers || []);
  }, []);

  useEffect(() => {
    fetchLinkedAccounts();
  }, [fetchLinkedAccounts]);

  // Handle OAuth callback params
  useEffect(() => {
    const linked = searchParams.get('linked');
    const error = searchParams.get('error');

    if (linked) {
      setLinkSuccess(`Successfully connected ${linked}!`);
      fetchLinkedAccounts();
      // Clear URL params
      window.history.replaceState({}, '', '/dashboard/settings');
      setTimeout(() => setLinkSuccess(null), 5000);
    }

    if (error) {
      const errorMessages: Record<string, string> = {
        oauth_denied: 'Connection was cancelled or denied.',
        oauth_invalid: 'Invalid OAuth response. Please try again.',
        oauth_state_invalid: 'Security verification failed. Please try again.',
        oauth_token_error: 'Failed to connect. Please try again.',
        oauth_token_missing: 'Connection failed. Please try again.',
        oauth_userinfo_error: 'Failed to get account info. Please try again.',
        oauth_already_linked: 'This account is already linked to another user.',
      };
      setAccountsError(errorMessages[error] || 'An error occurred.');
      window.history.replaceState({}, '', '/dashboard/settings');
    }
  }, [searchParams, fetchLinkedAccounts]);

  const handleLinkAccount = async (provider: string) => {
    const response = await api.linkSsoAccount(provider);
    if (response.success && response.data?.auth_url) {
      window.location.href = response.data.auth_url;
    }
  };

  const handleUnlinkAccount = async (provider: string) => {
    setUnlinkingProvider(provider);
    const response = await api.unlinkSsoAccount(provider);
    setUnlinkingProvider(null);

    if (!response.success) {
      setAccountsError(response.error || 'Failed to unlink account');
      return;
    }

    fetchLinkedAccounts();
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google': return 'G';
      case 'github': return 'GH';
      case 'twitter': return 'X';
      default: return provider.charAt(0).toUpperCase();
    }
  };

  const isProviderLinked = (provider: string) =>
    linkedAccounts.some((acc) => acc.provider === provider);

  const getLinkedAccount = (provider: string) =>
    linkedAccounts.find((acc) => acc.provider === provider);

  // Session management state
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [revokingSessionId, setRevokingSessionId] = useState<number | null>(null);
  const [isRevokingOthers, setIsRevokingOthers] = useState(false);

  const fetchSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    setSessionsError(null);
    const response = await api.getSessions();
    setIsLoadingSessions(false);

    if (!response.success) {
      setSessionsError(response.error || 'Failed to load sessions');
      return;
    }

    setSessions(response.data?.sessions || []);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRevokeSession = async (sessionId: number) => {
    setRevokingSessionId(sessionId);
    const response = await api.revokeSession(sessionId);
    setRevokingSessionId(null);

    if (!response.success) {
      setSessionsError(response.error || 'Failed to revoke session');
      return;
    }

    fetchSessions();
  };

  const handleRevokeOtherSessions = async () => {
    const { refreshToken } = useAuth.getState();
    if (!refreshToken) return;

    setIsRevokingOthers(true);
    const response = await api.revokeOtherSessions(refreshToken);
    setIsRevokingOthers(false);

    if (!response.success) {
      setSessionsError(response.error || 'Failed to revoke sessions');
      return;
    }

    fetchSessions();
  };

  const parseUserAgent = (ua: string | null): string => {
    if (!ua) return 'Unknown device';

    // Simple parsing - in production use a proper UA parser
    if (ua.includes('Mobile')) return 'Mobile Browser';
    if (ua.includes('Chrome')) return 'Chrome Browser';
    if (ua.includes('Firefox')) return 'Firefox Browser';
    if (ua.includes('Safari')) return 'Safari Browser';
    if (ua.includes('Edge')) return 'Edge Browser';
    return 'Web Browser';
  };

  const formatRelativeTime = (isoString: string | null): string => {
    if (!isoString) return 'Unknown';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

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

      <Stack gap={6}>
        <Card padding="lg">
          <SectionHeader>
            <SectionIcon>
              <Shield size={20} />
            </SectionIcon>
            <div>
              <BaseSectionTitle>Account</BaseSectionTitle>
              <SectionDescription>
                Manage your account information
              </SectionDescription>
            </div>
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
        </Card>

        <Card padding="lg">
          <SectionHeader>
            <SectionIcon>
              <Link2 size={20} />
            </SectionIcon>
            <div>
              <BaseSectionTitle>Connected Accounts</BaseSectionTitle>
              <SectionDescription>
                Link your social accounts for SSO login
              </SectionDescription>
            </div>
          </SectionHeader>

          {linkSuccess && (
            <AlertWrapper><Alert variant="success">{linkSuccess}</Alert></AlertWrapper>
          )}

          {accountsError && (
            <AlertWrapper><Alert variant="error">{accountsError}</Alert></AlertWrapper>
          )}

          {isLoadingAccounts ? (
            <Text>Loading connected accounts...</Text>
          ) : (
            <AccountsList>
              {availableProviders.map((provider) => {
                const linked = isProviderLinked(provider);
                const account = getLinkedAccount(provider);

                return (
                  <AccountItem key={provider}>
                    <AccountInfo>
                      <ProviderIcon $provider={provider}>
                        {getProviderIcon(provider)}
                      </ProviderIcon>
                      <AccountDetails>
                        <ProviderName>{provider}</ProviderName>
                        {linked && account ? (
                          <ProviderUsername>
                            {account.provider_username || account.provider_email || 'Connected'}
                          </ProviderUsername>
                        ) : (
                          <NotLinkedText>Not connected</NotLinkedText>
                        )}
                      </AccountDetails>
                    </AccountInfo>

                    {linked ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleUnlinkAccount(provider)}
                        isLoading={unlinkingProvider === provider}
                      >
                        <Unlink size={14} />
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleLinkAccount(provider)}
                      >
                        <ExternalLink size={14} />
                        Connect
                      </Button>
                    )}
                  </AccountItem>
                );
              })}
            </AccountsList>
          )}
        </Card>

        <Card padding="lg">
          <SectionHeader>
            <SectionIcon>
              <Bell size={20} />
            </SectionIcon>
            <div>
              <BaseSectionTitle>Notifications</BaseSectionTitle>
              <SectionDescription>
                Configure how you want to be notified
              </SectionDescription>
            </div>
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
        </Card>

        <Card padding="lg">
          <SectionHeader>
            <SectionIcon>
              <Palette size={20} />
            </SectionIcon>
            <div>
              <BaseSectionTitle>Appearance</BaseSectionTitle>
              <SectionDescription>
                Customize how ChirpSyncer looks
              </SectionDescription>
            </div>
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
        </Card>

        <Card padding="lg">
          <SectionHeader>
            <SectionIcon>
              <Smartphone size={20} />
            </SectionIcon>
            <div>
              <BaseSectionTitle>Active Sessions</BaseSectionTitle>
              <SectionDescription>
                Manage devices where you&apos;re logged in
              </SectionDescription>
            </div>
          </SectionHeader>

          {sessionsError && (
            <AlertWrapper><Alert variant="error">{sessionsError}</Alert></AlertWrapper>
          )}

          {isLoadingSessions ? (
            <Text>Loading sessions...</Text>
          ) : sessions.length === 0 ? (
            <Text>No active sessions found.</Text>
          ) : (
            <>
              <SessionsList>
                {sessions.map((session, index) => {
                  const isCurrent = index === 0; // First session is most recently used (current)

                  return (
                    <SessionItem key={session.id} $isCurrent={isCurrent}>
                      <SessionInfo>
                        <SessionIcon>
                          <Smartphone size={20} />
                        </SessionIcon>
                        <SessionDetails>
                          <SessionDevice>
                            {parseUserAgent(session.user_agent)}
                            {isCurrent && <CurrentBadge>Current</CurrentBadge>}
                          </SessionDevice>
                          <SessionMeta>
                            {session.ip_address || 'Unknown IP'} · Last active {formatRelativeTime(session.last_used_at)}
                          </SessionMeta>
                          <SessionMeta>
                            Created {formatRelativeTime(session.created_at)}
                          </SessionMeta>
                        </SessionDetails>
                      </SessionInfo>

                      {!isCurrent && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRevokeSession(session.id)}
                          isLoading={revokingSessionId === session.id}
                        >
                          <Trash2 size={14} />
                          Revoke
                        </Button>
                      )}
                    </SessionItem>
                  );
                })}
              </SessionsList>

              {sessions.length > 1 && (
                <SessionActions>
                  <Button
                    variant="secondary"
                    onClick={handleRevokeOtherSessions}
                    isLoading={isRevokingOthers}
                  >
                    <LogOut size={16} />
                    Sign out all other sessions
                  </Button>
                </SessionActions>
              )}
            </>
          )}
        </Card>
      </Stack>
    </div>
  );
}
