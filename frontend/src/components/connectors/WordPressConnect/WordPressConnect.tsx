'use client';

import { useState, useMemo } from 'react';
import styled from 'styled-components';
import {
  Globe,
  FileText,
  Plug,
  Shield,
  CheckCircle,
  ExternalLink,
  AlertTriangle,
  Key,
  Settings,
} from 'lucide-react';
import {
  ConnectionWizard,
  WizardStep,
  PlatformIntro,
  Input,
  Stack,
  SmallText,
  Alert,
} from '@/components/ui';

// ============ Types ============
interface WordPressConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

// ============ Constants ============
const WP_COLOR = '#21759B';

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const WPLogo = styled.div`
  width: 48px;
  height: 48px;
  background: ${WP_COLOR};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 24px;
`;

const AuthMethodCards = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.spacing[3]};
`;

const AuthMethodCard = styled.button<{ $active: boolean }>`
  padding: ${({ theme }) => theme.spacing[4]};
  background: ${({ $active }) => ($active ? `${WP_COLOR}08` : 'white')};
  border: 2px solid ${({ $active }) => ($active ? WP_COLOR : '#e5e7eb')};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;

  &:hover {
    border-color: ${WP_COLOR};
  }
`;

const AuthIcon = styled.div<{ $active: boolean }>`
  width: 48px;
  height: 48px;
  background: ${({ $active }) => ($active ? `${WP_COLOR}15` : '#f3f4f6')};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $active }) => ($active ? WP_COLOR : '#9ca3af')};
  margin: 0 auto ${({ theme }) => theme.spacing[2]};
`;

const SetupSteps = styled.div`
  background: ${({ theme }) => theme.colors.neutral[50]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing[4]};
`;

const SetupStep = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[2]} 0;

  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.neutral[200]};
    padding-bottom: ${({ theme }) => theme.spacing[3]};
    margin-bottom: ${({ theme }) => theme.spacing[2]};
  }
`;

const StepNumber = styled.span`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${WP_COLOR};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
`;

const PortalButton = styled.a`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background: ${WP_COLOR};
  color: white;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-decoration: none;
  font-weight: 500;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  transition: all 0.2s;

  &:hover {
    background: #1a5f7a;
  }
`;

const HostingNote = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[3]};
  background: #dbeafe;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: #1e40af;
`;

// ============ Component ============
export function WordPressConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: WordPressConnectProps) {
  const [authMethod, setAuthMethod] = useState<'app_password' | 'jetpack'>('app_password');

  const canConnect = useMemo((): boolean => {
    const hasSiteUrl = !!(credentials.site_url && credentials.site_url.includes('.'));
    if (authMethod === 'app_password') {
      const hasUsername = !!(credentials.username && credentials.username.length > 1);
      const hasAppPassword = !!(credentials.app_password && credentials.app_password.length > 10);
      return hasSiteUrl && hasUsername && hasAppPassword;
    } else {
      const hasToken = !!(credentials.jetpack_token && credentials.jetpack_token.length > 20);
      return hasSiteUrl && hasToken;
    }
  }, [credentials, authMethod]);

  const steps: WizardStep[] = [
    {
      id: 'intro',
      title: 'Welcome',
      content: (
        <PlatformIntro
          logo={<WPLogo>W</WPLogo>}
          name="WordPress"
          tagline="Publish to the web"
          description="Connect your WordPress site to automatically publish posts, sync content, and manage your blog from ChirpSyncer."
          features={[
            { icon: Globe, label: '43% of web' },
            { icon: FileText, label: 'Full posts' },
            { icon: Plug, label: 'REST API' },
          ]}
          color={WP_COLOR}
          learnMoreUrl="https://wordpress.org/"
        />
      ),
      canProceed: true,
    },
    {
      id: 'auth-method',
      title: 'Auth Method',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <SmallText style={{ textAlign: 'center', color: '#666' }}>
              Choose how to connect to your WordPress site
            </SmallText>

            <AuthMethodCards>
              <AuthMethodCard
                $active={authMethod === 'app_password'}
                onClick={() => setAuthMethod('app_password')}
              >
                <AuthIcon $active={authMethod === 'app_password'}>
                  <Key size={24} />
                </AuthIcon>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>App Password</SmallText>
                <SmallText style={{ color: '#666', fontSize: 11 }}>
                  Self-hosted WordPress
                </SmallText>
              </AuthMethodCard>

              <AuthMethodCard
                $active={authMethod === 'jetpack'}
                onClick={() => setAuthMethod('jetpack')}
              >
                <AuthIcon $active={authMethod === 'jetpack'}>
                  <Shield size={24} />
                </AuthIcon>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>Jetpack</SmallText>
                <SmallText style={{ color: '#666', fontSize: 11 }}>
                  WordPress.com or Jetpack
                </SmallText>
              </AuthMethodCard>
            </AuthMethodCards>

            <HostingNote>
              <Globe size={16} style={{ flexShrink: 0 }} />
              <span>
                {authMethod === 'app_password'
                  ? 'Requires WordPress 5.6+ with REST API enabled'
                  : 'Works with WordPress.com or self-hosted with Jetpack plugin'}
              </span>
            </HostingNote>
          </Stack>
        </StepContainer>
      ),
      canProceed: true,
    },
    {
      id: 'setup',
      title: 'Setup Guide',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <SetupSteps>
              <SmallText style={{ fontWeight: 600, marginBottom: 16, display: 'block' }}>
                {authMethod === 'app_password' ? 'Create an Application Password:' : 'Connect via Jetpack:'}
              </SmallText>

              {authMethod === 'app_password' ? (
                <>
                  <SetupStep>
                    <StepNumber>1</StepNumber>
                    <SmallText>Go to your WordPress admin dashboard</SmallText>
                  </SetupStep>
                  <SetupStep>
                    <StepNumber>2</StepNumber>
                    <SmallText>Navigate to Users → Profile</SmallText>
                  </SetupStep>
                  <SetupStep>
                    <StepNumber>3</StepNumber>
                    <SmallText>Scroll to &quot;Application Passwords&quot; section</SmallText>
                  </SetupStep>
                  <SetupStep>
                    <StepNumber>4</StepNumber>
                    <SmallText>Enter &quot;ChirpSyncer&quot; as name and click &quot;Add New&quot;</SmallText>
                  </SetupStep>
                  <SetupStep>
                    <StepNumber>5</StepNumber>
                    <SmallText>Copy the generated password (shown only once!)</SmallText>
                  </SetupStep>
                </>
              ) : (
                <>
                  <SetupStep>
                    <StepNumber>1</StepNumber>
                    <SmallText>Install Jetpack plugin if not already installed</SmallText>
                  </SetupStep>
                  <SetupStep>
                    <StepNumber>2</StepNumber>
                    <SmallText>Connect Jetpack to WordPress.com</SmallText>
                  </SetupStep>
                  <SetupStep>
                    <StepNumber>3</StepNumber>
                    <SmallText>Go to Jetpack → Settings → Security</SmallText>
                  </SetupStep>
                  <SetupStep>
                    <StepNumber>4</StepNumber>
                    <SmallText>Generate an API token for external apps</SmallText>
                  </SetupStep>
                </>
              )}
            </SetupSteps>

            <PortalButton
              href={authMethod === 'app_password'
                ? (credentials.site_url ? `${credentials.site_url}/wp-admin/profile.php` : 'https://wordpress.org/documentation/article/application-passwords/')
                : 'https://wordpress.com/me/security/two-step'
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              <Settings size={16} />
              {authMethod === 'app_password' ? 'Open WordPress Admin' : 'Open Jetpack Settings'}
              <ExternalLink size={14} />
            </PortalButton>
          </Stack>
        </StepContainer>
      ),
      canProceed: true,
    },
    {
      id: 'credentials',
      title: 'Credentials',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <Input
              label="WordPress Site URL"
              type="url"
              value={credentials.site_url || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, site_url: e.target.value })}
              placeholder="https://yoursite.com"
              hint="Your WordPress site address (without /wp-admin)"
              fullWidth
            />

            {authMethod === 'app_password' ? (
              <>
                <Input
                  label="Username"
                  type="text"
                  value={credentials.username || ''}
                  onChange={(e) => onCredentialsChange({ ...credentials, username: e.target.value })}
                  placeholder="admin"
                  hint="Your WordPress username"
                  fullWidth
                />

                <Input
                  label="Application Password"
                  type="password"
                  value={credentials.app_password || ''}
                  onChange={(e) => onCredentialsChange({ ...credentials, app_password: e.target.value })}
                  placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                  hint="The application password you generated (spaces are OK)"
                  fullWidth
                />
              </>
            ) : (
              <Input
                label="Jetpack Token"
                type="password"
                value={credentials.jetpack_token || ''}
                onChange={(e) => onCredentialsChange({ ...credentials, jetpack_token: e.target.value })}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                hint="Your Jetpack API token"
                fullWidth
              />
            )}

            {!canConnect && credentials.site_url && (
              <Alert variant="warning">
                <AlertTriangle size={16} />
                Please fill in all required credentials.
              </Alert>
            )}

            {canConnect && (
              <Alert variant="success">
                <CheckCircle size={16} />
                Credentials look valid!
              </Alert>
            )}
          </Stack>
        </StepContainer>
      ),
      canProceed: canConnect,
    },
    {
      id: 'confirm',
      title: 'Ready',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <div style={{
              textAlign: 'center',
              padding: '32px',
              background: `linear-gradient(135deg, ${WP_COLOR}08 0%, #e0f2fe 100%)`,
              borderRadius: '12px'
            }}>
              <div style={{
                width: 64,
                height: 64,
                background: '#dcfce7',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: '#22c55e'
              }}>
                <CheckCircle size={32} />
              </div>
              <h4 style={{ margin: '0 0 8px', fontSize: '18px' }}>Ready to Connect!</h4>
              <SmallText style={{ color: '#666' }}>
                Your WordPress site is configured
              </SmallText>
            </div>

            <div style={{ padding: '0 16px' }}>
              <SmallText style={{ color: '#666' }}>
                <strong>Site:</strong> {credentials.site_url}
              </SmallText>
              <SmallText style={{ color: '#666' }}>
                <strong>Auth:</strong> {authMethod === 'app_password' ? 'Application Password' : 'Jetpack'}
              </SmallText>
            </div>

            <Alert variant="info">
              <FileText size={16} />
              ChirpSyncer can now publish posts and sync content with your WordPress site.
            </Alert>
          </Stack>
        </StepContainer>
      ),
      canProceed: true,
    },
  ];

  return (
    <ConnectionWizard
      steps={steps}
      onComplete={onConnect}
      isLoading={isConnecting}
      completeButtonText="Connect WordPress"
      platformColor={WP_COLOR}
    />
  );
}

export default WordPressConnect;
