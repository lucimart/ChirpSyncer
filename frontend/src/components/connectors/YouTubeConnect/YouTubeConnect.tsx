'use client';

import { useMemo } from 'react';
import styled from 'styled-components';
import {
  Play,
  Video,
  Users,
  BarChart2,
  CheckCircle,
  ExternalLink,
  AlertTriangle,
  Shield,
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
interface YouTubeConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

// ============ Constants ============
const YOUTUBE_COLOR = '#FF0000';

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const YouTubeLogo = styled.div`
  width: 56px;
  height: 40px;
  background: ${YOUTUBE_COLOR};
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
`;

const GoogleCloudCard = styled.div`
  background: linear-gradient(135deg, #4285f4 0%, #34a853 50%, #fbbc04 75%, #ea4335 100%);
  padding: 2px;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
`;

const GoogleCloudInner = styled.div`
  background: white;
  border-radius: ${({ theme }) => `calc(${theme.borderRadius.lg} - 2px)`};
  padding: ${({ theme }) => theme.spacing[4]};
`;

const SetupStep = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral[100]};

  &:last-child {
    border-bottom: none;
  }
`;

const StepIcon = styled.div<{ $color: string }>`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: ${({ $color }) => `${$color}15`};
  color: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const StepContent = styled.div`
  flex: 1;
`;

const StepTitle = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 2px;
`;

const StepDescription = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const PortalButton = styled.a`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background: #4285f4;
  color: white;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-decoration: none;
  font-weight: 500;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  transition: all 0.2s;

  &:hover {
    background: #3367d6;
  }
`;

const CredentialsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[3]};

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

const ApiQuotaNote = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.neutral[50]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

// ============ Component ============
export function YouTubeConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: YouTubeConnectProps) {
  const canConnect = useMemo(() => {
    const hasClientId = !!(credentials.client_id && credentials.client_id.includes('.apps.googleusercontent.com'));
    const hasClientSecret = !!(credentials.client_secret && credentials.client_secret.length > 10);
    const hasAccessToken = !!(credentials.access_token && credentials.access_token.length > 20);
    const hasRefreshToken = !!(credentials.refresh_token && credentials.refresh_token.length > 20);
    return hasClientId && hasClientSecret && hasAccessToken && hasRefreshToken;
  }, [credentials]);

  const steps: WizardStep[] = [
    {
      id: 'intro',
      title: 'Welcome',
      content: (
        <PlatformIntro
          logo={<YouTubeLogo><Play size={20} fill="white" /></YouTubeLogo>}
          name="YouTube"
          tagline="Broadcast yourself"
          description="Connect your YouTube channel to manage videos, post community updates, and sync content with the world's largest video platform."
          features={[
            { icon: Video, label: 'Video uploads' },
            { icon: Users, label: '2B+ users' },
            { icon: BarChart2, label: 'Analytics' },
          ]}
          color={YOUTUBE_COLOR}
          learnMoreUrl="https://developers.google.com/youtube/v3"
        />
      ),
      canProceed: true,
    },
    {
      id: 'google-cloud',
      title: 'Google Cloud',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <Alert variant="info">
              <Shield size={16} />
              YouTube API uses Google Cloud Platform. You&apos;ll need a Google account to create a project.
            </Alert>

            <GoogleCloudCard>
              <GoogleCloudInner>
                <SmallText style={{ fontWeight: 600, marginBottom: 16, display: 'block' }}>
                  Setup in Google Cloud Console:
                </SmallText>

                <SetupStep>
                  <StepIcon $color="#4285f4">1</StepIcon>
                  <StepContent>
                    <StepTitle>Create a new project</StepTitle>
                    <StepDescription>Or select an existing one from the dropdown</StepDescription>
                  </StepContent>
                </SetupStep>

                <SetupStep>
                  <StepIcon $color="#34a853">2</StepIcon>
                  <StepContent>
                    <StepTitle>Enable YouTube Data API v3</StepTitle>
                    <StepDescription>Go to APIs & Services → Library → Search &quot;YouTube&quot;</StepDescription>
                  </StepContent>
                </SetupStep>

                <SetupStep>
                  <StepIcon $color="#fbbc04">3</StepIcon>
                  <StepContent>
                    <StepTitle>Configure OAuth consent screen</StepTitle>
                    <StepDescription>Choose &quot;External&quot; user type, add your app info</StepDescription>
                  </StepContent>
                </SetupStep>

                <SetupStep>
                  <StepIcon $color="#ea4335">4</StepIcon>
                  <StepContent>
                    <StepTitle>Create OAuth 2.0 credentials</StepTitle>
                    <StepDescription>Go to Credentials → Create → OAuth client ID → Web application</StepDescription>
                  </StepContent>
                </SetupStep>
              </GoogleCloudInner>
            </GoogleCloudCard>

            <PortalButton
              href="https://console.cloud.google.com/apis/dashboard"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Play size={16} />
              Open Google Cloud Console
              <ExternalLink size={14} />
            </PortalButton>
          </Stack>
        </StepContainer>
      ),
      canProceed: true,
    },
    {
      id: 'oauth',
      title: 'OAuth Setup',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <SmallText style={{ fontWeight: 600, display: 'block' }}>
              After creating OAuth credentials, you need to generate tokens:
            </SmallText>

            <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8 }}>
              <SmallText style={{ fontWeight: 500, marginBottom: 8, display: 'block' }}>
                Required OAuth Scopes:
              </SmallText>
              <code style={{ fontSize: 11, wordBreak: 'break-all', display: 'block', color: '#666' }}>
                https://www.googleapis.com/auth/youtube.force-ssl
              </code>
            </div>

            <Alert variant="warning">
              <AlertTriangle size={16} />
              Google OAuth requires app verification for public use. During development, add your email as a test user in the OAuth consent screen.
            </Alert>

            <ApiQuotaNote>
              <BarChart2 size={16} style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <strong>API Quota:</strong> YouTube API has daily quotas. Uploads cost 1600 units, reads cost 1-50 units. Default quota is 10,000 units/day.
              </div>
            </ApiQuotaNote>
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
            <CredentialsGrid>
              <Input
                label="Client ID"
                type="text"
                value={credentials.client_id || ''}
                onChange={(e) => onCredentialsChange({ ...credentials, client_id: e.target.value })}
                placeholder="xxxxx.apps.googleusercontent.com"
                hint="From OAuth 2.0 Client IDs"
                fullWidth
              />
              <Input
                label="Client Secret"
                type="password"
                value={credentials.client_secret || ''}
                onChange={(e) => onCredentialsChange({ ...credentials, client_secret: e.target.value })}
                placeholder="GOCSPX-xxxxxxxxxxxxxxx"
                fullWidth
              />
            </CredentialsGrid>

            <CredentialsGrid>
              <Input
                label="Access Token"
                type="password"
                value={credentials.access_token || ''}
                onChange={(e) => onCredentialsChange({ ...credentials, access_token: e.target.value })}
                placeholder="ya29.xxxxxxxxxxxxxxx"
                hint="Short-lived token"
                fullWidth
              />
              <Input
                label="Refresh Token"
                type="password"
                value={credentials.refresh_token || ''}
                onChange={(e) => onCredentialsChange({ ...credentials, refresh_token: e.target.value })}
                placeholder="1//xxxxxxxxxxxxxxx"
                hint="For automatic renewal"
                fullWidth
              />
            </CredentialsGrid>

            {credentials.client_id && !credentials.client_id.includes('.apps.googleusercontent.com') && (
              <Alert variant="warning">
                <AlertTriangle size={16} />
                Client ID should end with &quot;.apps.googleusercontent.com&quot;
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
              background: `linear-gradient(135deg, ${YOUTUBE_COLOR}08 0%, #fff0f0 100%)`,
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
                Your YouTube channel credentials are configured
              </SmallText>
            </div>

            <div style={{ padding: '0 16px' }}>
              <SmallText style={{ color: '#666' }}>
                <strong>Client ID:</strong> ••••••.apps.googleusercontent.com
              </SmallText>
              <SmallText style={{ color: '#666' }}>
                <strong>Client Secret:</strong> ••••••••••••
              </SmallText>
              <SmallText style={{ color: '#666' }}>
                <strong>Tokens:</strong> ✓ Configured
              </SmallText>
            </div>

            <Alert variant="info">
              <Video size={16} />
              ChirpSyncer can now manage your YouTube channel, post community updates, and sync content.
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
      completeButtonText="Connect YouTube"
      platformColor={YOUTUBE_COLOR}
    />
  );
}

export default YouTubeConnect;
