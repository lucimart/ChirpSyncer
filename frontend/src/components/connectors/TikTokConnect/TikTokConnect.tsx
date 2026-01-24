'use client';

import { useMemo } from 'react';
import styled from 'styled-components';
import {
  Music,
  Video,
  TrendingUp,
  Users,
  CheckCircle,
  ExternalLink,
  AlertTriangle,
  Clock,
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
interface TikTokConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

// ============ Constants ============
const TIKTOK_COLOR = '#000000';
const TIKTOK_ACCENT = '#25F4EE';

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const TikTokLogo = styled.div`
  width: 48px;
  height: 48px;
  background: ${TIKTOK_COLOR};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '♪';
    position: absolute;
    color: ${TIKTOK_ACCENT};
    transform: translate(-2px, -1px);
  }

  &::after {
    content: '♪';
    position: absolute;
    color: #FE2C55;
    transform: translate(2px, 1px);
  }
`;

const ReviewWarning = styled.div`
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 1px solid #f59e0b;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing[4]};
  text-align: center;
`;

const ReviewIcon = styled.div`
  width: 56px;
  height: 56px;
  background: #f59e0b;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto ${({ theme }) => theme.spacing[3]};
  color: white;
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
  background: ${TIKTOK_COLOR};
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
  background: ${TIKTOK_COLOR};
  color: white;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-decoration: none;
  font-weight: 500;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  transition: all 0.2s;

  &:hover {
    background: #333;
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

const BusinessNote = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[3]};
  background: linear-gradient(135deg, ${TIKTOK_ACCENT}15 0%, #FE2C5515 100%);
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

// ============ Component ============
export function TikTokConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: TikTokConnectProps) {
  const canConnect = useMemo((): boolean => {
    const hasClientKey = !!(credentials.client_key && credentials.client_key.length > 20);
    const hasClientSecret = !!(credentials.client_secret && credentials.client_secret.length > 20);
    const hasAccessToken = !!(credentials.access_token && credentials.access_token.length > 20);
    const hasRefreshToken = !!(credentials.refresh_token && credentials.refresh_token.length > 20);
    return hasClientKey && hasClientSecret && hasAccessToken && hasRefreshToken;
  }, [credentials]);

  const steps: WizardStep[] = [
    {
      id: 'intro',
      title: 'Welcome',
      content: (
        <PlatformIntro
          logo={<TikTokLogo><span style={{ opacity: 0 }}>♪</span></TikTokLogo>}
          name="TikTok"
          tagline="Make your day"
          description="Connect your TikTok Business account to share videos and sync content with the world's fastest-growing video platform."
          features={[
            { icon: Video, label: 'Video posts' },
            { icon: TrendingUp, label: '1B+ users' },
            { icon: Music, label: 'Sounds & trends' },
          ]}
          color={TIKTOK_COLOR}
          learnMoreUrl="https://developers.tiktok.com/"
        />
      ),
      canProceed: true,
    },
    {
      id: 'review-warning',
      title: 'App Review',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <ReviewWarning>
              <ReviewIcon>
                <Clock size={28} />
              </ReviewIcon>
              <h4 style={{ margin: '0 0 8px', fontSize: '16px', color: '#92400e' }}>
                TikTok Requires App Review
              </h4>
              <SmallText style={{ color: '#92400e' }}>
                TikTok API access requires manual approval from TikTok.
                This process can take 1-2 weeks.
              </SmallText>
            </ReviewWarning>

            <BusinessNote>
              <Shield size={18} style={{ color: TIKTOK_COLOR, flexShrink: 0 }} />
              <span>
                You need a <strong>TikTok Business Account</strong> to use the API.
                Personal accounts cannot access the Content Publishing API.
              </span>
            </BusinessNote>

            <Alert variant="info">
              <Users size={16} />
              If you already have an approved TikTok app, continue to enter your credentials.
            </Alert>
          </Stack>
        </StepContainer>
      ),
      canProceed: true,
    },
    {
      id: 'setup',
      title: 'Create App',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <SetupSteps>
              <SmallText style={{ fontWeight: 600, marginBottom: 16, display: 'block' }}>
                TikTok Developer Setup:
              </SmallText>

              <SetupStep>
                <StepNumber>1</StepNumber>
                <SmallText>Create a TikTok Developer account at developers.tiktok.com</SmallText>
              </SetupStep>

              <SetupStep>
                <StepNumber>2</StepNumber>
                <SmallText>Go to &quot;Manage Apps&quot; and create a new application</SmallText>
              </SetupStep>

              <SetupStep>
                <StepNumber>3</StepNumber>
                <SmallText>Request access to &quot;Content Posting API&quot; and &quot;Login Kit&quot;</SmallText>
              </SetupStep>

              <SetupStep>
                <StepNumber>4</StepNumber>
                <SmallText>Wait for TikTok&apos;s review and approval (1-2 weeks)</SmallText>
              </SetupStep>

              <SetupStep>
                <StepNumber>5</StepNumber>
                <SmallText>Once approved, configure OAuth redirect URLs</SmallText>
              </SetupStep>
            </SetupSteps>

            <PortalButton
              href="https://developers.tiktok.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Music size={16} />
              Open TikTok Developer Portal
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
            <CredentialsGrid>
              <Input
                label="Client Key"
                type="text"
                value={credentials.client_key || ''}
                onChange={(e) => onCredentialsChange({ ...credentials, client_key: e.target.value })}
                placeholder="awxxxxxxxxxxxxxxxx"
                hint="From your TikTok app settings"
                fullWidth
              />
              <Input
                label="Client Secret"
                type="password"
                value={credentials.client_secret || ''}
                onChange={(e) => onCredentialsChange({ ...credentials, client_secret: e.target.value })}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
                fullWidth
              />
            </CredentialsGrid>

            <CredentialsGrid>
              <Input
                label="Access Token"
                type="password"
                value={credentials.access_token || ''}
                onChange={(e) => onCredentialsChange({ ...credentials, access_token: e.target.value })}
                placeholder="act.xxxxxxxxxxxxxxxx"
                hint="From OAuth flow"
                fullWidth
              />
              <Input
                label="Refresh Token"
                type="password"
                value={credentials.refresh_token || ''}
                onChange={(e) => onCredentialsChange({ ...credentials, refresh_token: e.target.value })}
                placeholder="rft.xxxxxxxxxxxxxxxx"
                hint="For automatic renewal"
                fullWidth
              />
            </CredentialsGrid>

            {!canConnect && credentials.client_key && (
              <Alert variant="warning">
                <AlertTriangle size={16} />
                Please fill in all credential fields to continue.
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
              background: `linear-gradient(135deg, ${TIKTOK_ACCENT}10 0%, #FE2C5510 100%)`,
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
                Your TikTok Business account is configured
              </SmallText>
            </div>

            <div style={{ padding: '0 16px' }}>
              <SmallText style={{ color: '#666' }}>
                <strong>Client Key:</strong> {credentials.client_key?.slice(0, 8)}••••••
              </SmallText>
              <SmallText style={{ color: '#666' }}>
                <strong>Tokens:</strong> ✓ Configured
              </SmallText>
            </div>

            <Alert variant="info">
              <Video size={16} />
              ChirpSyncer can now post videos to your TikTok account and sync content.
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
      completeButtonText="Connect TikTok"
      platformColor={TIKTOK_COLOR}
    />
  );
}

export default TikTokConnect;
