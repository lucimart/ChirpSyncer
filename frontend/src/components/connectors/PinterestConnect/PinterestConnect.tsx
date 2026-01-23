'use client';

import { useMemo } from 'react';
import styled from 'styled-components';
import {
  Image as ImageIcon,
  Grid,
  TrendingUp,
  Bookmark,
  CheckCircle,
  ExternalLink,
  AlertTriangle,
  Eye,
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
interface PinterestConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

// ============ Constants ============
const PINTEREST_COLOR = '#E60023';

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const PinterestLogo = styled.div`
  width: 48px;
  height: 48px;
  background: ${PINTEREST_COLOR};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 28px;
`;

const BoardsPreview = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.neutral[50]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const BoardPlaceholder = styled.div<{ $height: number }>`
  background: linear-gradient(135deg, ${PINTEREST_COLOR}20 0%, ${PINTEREST_COLOR}10 100%);
  border-radius: 8px;
  height: ${({ $height }) => $height}px;
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
  background: ${PINTEREST_COLOR};
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
  background: ${PINTEREST_COLOR};
  color: white;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  text-decoration: none;
  font-weight: 500;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  transition: all 0.2s;

  &:hover {
    background: #ad081b;
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

const ScopeChip = styled.code`
  display: inline-block;
  font-size: 11px;
  padding: 4px 8px;
  background: ${PINTEREST_COLOR}15;
  color: ${PINTEREST_COLOR};
  border-radius: 4px;
  margin: 2px;
`;

// ============ Component ============
export function PinterestConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: PinterestConnectProps) {
  const canConnect = useMemo((): boolean => {
    const hasClientId = !!(credentials.client_id && credentials.client_id.length > 10);
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
          logo={<PinterestLogo>P</PinterestLogo>}
          name="Pinterest"
          tagline="Get your next great idea"
          description="Connect your Pinterest account to create pins, manage boards, and share visual content with millions of users seeking inspiration."
          features={[
            { icon: ImageIcon, label: 'Rich pins' },
            { icon: Grid, label: 'Boards' },
            { icon: Eye, label: '450M+ users' },
          ]}
          color={PINTEREST_COLOR}
          learnMoreUrl="https://developers.pinterest.com/"
        />
      ),
      canProceed: true,
    },
    {
      id: 'visual-preview',
      title: 'Pinterest Pins',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <div style={{ textAlign: 'center' }}>
              <SmallText style={{ color: '#666' }}>
                Pinterest is a visual discovery platform. Pins link to external content.
              </SmallText>
            </div>

            <BoardsPreview>
              <BoardPlaceholder $height={80} />
              <BoardPlaceholder $height={120} />
              <BoardPlaceholder $height={90} />
              <BoardPlaceholder $height={100} />
              <BoardPlaceholder $height={70} />
              <BoardPlaceholder $height={110} />
            </BoardsPreview>

            <Alert variant="info">
              <Bookmark size={16} />
              Pins can include images, links, titles, and descriptions. ChirpSyncer can create pins from your content.
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
                Pinterest API Setup:
              </SmallText>

              <SetupStep>
                <StepNumber>1</StepNumber>
                <SmallText>Go to Pinterest Developer Portal and create an app</SmallText>
              </SetupStep>

              <SetupStep>
                <StepNumber>2</StepNumber>
                <SmallText>Configure your redirect URI in app settings</SmallText>
              </SetupStep>

              <SetupStep>
                <StepNumber>3</StepNumber>
                <SmallText>Copy your App ID and App Secret</SmallText>
              </SetupStep>

              <SetupStep>
                <StepNumber>4</StepNumber>
                <SmallText>Complete OAuth flow to get access and refresh tokens</SmallText>
              </SetupStep>
            </SetupSteps>

            <div>
              <SmallText style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>
                Required Scopes:
              </SmallText>
              <div>
                <ScopeChip>boards:read</ScopeChip>
                <ScopeChip>boards:write</ScopeChip>
                <ScopeChip>pins:read</ScopeChip>
                <ScopeChip>pins:write</ScopeChip>
              </div>
            </div>

            <PortalButton
              href="https://developers.pinterest.com/apps/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ImageIcon size={16} />
              Open Pinterest Developer Portal
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
                label="App ID"
                type="text"
                value={credentials.client_id || ''}
                onChange={(e) => onCredentialsChange({ ...credentials, client_id: e.target.value })}
                placeholder="1234567890123456789"
                hint="Your Pinterest App ID"
                fullWidth
              />
              <Input
                label="App Secret"
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
                placeholder="pina_xxxxxxxxxxxxxxxx"
                hint="From OAuth flow"
                fullWidth
              />
              <Input
                label="Refresh Token"
                type="password"
                value={credentials.refresh_token || ''}
                onChange={(e) => onCredentialsChange({ ...credentials, refresh_token: e.target.value })}
                placeholder="pinr_xxxxxxxxxxxxxxxx"
                hint="For automatic renewal"
                fullWidth
              />
            </CredentialsGrid>

            {!canConnect && credentials.client_id && (
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
              background: `linear-gradient(135deg, ${PINTEREST_COLOR}08 0%, #fff0f3 100%)`,
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
                Your Pinterest account is configured
              </SmallText>
            </div>

            <div style={{ padding: '0 16px' }}>
              <SmallText style={{ color: '#666' }}>
                <strong>App ID:</strong> {credentials.client_id?.slice(0, 8)}••••••
              </SmallText>
              <SmallText style={{ color: '#666' }}>
                <strong>Tokens:</strong> ✓ Configured
              </SmallText>
            </div>

            <Alert variant="info">
              <TrendingUp size={16} />
              ChirpSyncer can now create pins and manage your Pinterest boards.
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
      completeButtonText="Connect Pinterest"
      platformColor={PINTEREST_COLOR}
    />
  );
}

export default PinterestConnect;
