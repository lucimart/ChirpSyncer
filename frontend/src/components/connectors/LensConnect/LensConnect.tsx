'use client';

import { useMemo } from 'react';
import styled from 'styled-components';
import {
  Hexagon,
  Wallet,
  Shield,
  Sparkles,
  CheckCircle,
  ExternalLink,
  AlertTriangle,
  Globe,
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
interface LensConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

// ============ Constants ============
const LENS_COLOR = '#00501E';
const LENS_LIGHT = '#ABFE2C';

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const LensLogo = styled.div`
  width: 48px;
  height: 48px;
  background: ${LENS_COLOR};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${LENS_LIGHT};
`;

const Web3Visual = styled.div`
  background: linear-gradient(135deg, ${LENS_COLOR} 0%, #003d17 100%);
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing[6]};
  text-align: center;
  color: white;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ABFE2C' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  }
`;

const ProfileCard = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[4]};
  border: 1px solid rgba(171, 254, 44, 0.2);
`;

const LensHandle = styled.span`
  color: ${LENS_LIGHT};
  font-weight: 600;
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.spacing[3]};
`;

const FeatureCard = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
  background: white;
  border: 1px solid ${({ theme }) => theme.colors.neutral[200]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-align: center;
  transition: all 0.2s;

  &:hover {
    border-color: ${LENS_COLOR};
    box-shadow: 0 4px 12px ${LENS_COLOR}20;
  }
`;

const FeatureIcon = styled.div`
  width: 44px;
  height: 44px;
  background: ${LENS_COLOR}10;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${LENS_COLOR};
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
  background: ${LENS_COLOR};
  color: ${LENS_LIGHT};
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
  background: ${LENS_COLOR};
  color: ${LENS_LIGHT};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-decoration: none;
  font-weight: 600;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  transition: all 0.2s;

  &:hover {
    background: #003d17;
  }
`;

const Web3Note = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[3]};
  background: linear-gradient(135deg, ${LENS_COLOR}10 0%, ${LENS_LIGHT}10 100%);
  border: 1px solid ${LENS_COLOR}30;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

// ============ Component ============
export function LensConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: LensConnectProps) {
  const canConnect = useMemo((): boolean => {
    // Lens handle format: handle.lens or just handle
    const hasHandle = !!(credentials.lens_handle && credentials.lens_handle.length > 2);
    // Auth token from Lens API
    const hasToken = !!(credentials.auth_token && credentials.auth_token.length > 20);
    return hasHandle && hasToken;
  }, [credentials]);

  const steps: WizardStep[] = [
    {
      id: 'intro',
      title: 'Welcome',
      content: (
        <PlatformIntro
          logo={<LensLogo><Hexagon size={24} /></LensLogo>}
          name="Lens Protocol"
          tagline="Own your social graph"
          description="Connect to Lens Protocol, the decentralized social graph on Polygon. Own your content, followers, and data as NFTs. True web3 social networking."
          features={[
            { icon: Wallet, label: 'Web3 native' },
            { icon: Shield, label: 'You own it' },
            { icon: Sparkles, label: 'Composable' },
          ]}
          color={LENS_COLOR}
          learnMoreUrl="https://lens.xyz/"
        />
      ),
      canProceed: true,
    },
    {
      id: 'features',
      title: 'Features',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <Web3Visual>
              <SmallText style={{ opacity: 0.8 }}>DECENTRALIZED SOCIAL</SmallText>
              <h3 style={{ margin: '8px 0', fontSize: 24 }}>Own Your Identity</h3>
              <ProfileCard>
                <SmallText style={{ marginBottom: 8 }}>Your Profile NFT</SmallText>
                <LensHandle>@yourhandle.lens</LensHandle>
              </ProfileCard>
            </Web3Visual>

            <FeatureGrid>
              <FeatureCard>
                <FeatureIcon><Wallet size={22} /></FeatureIcon>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>Profile NFT</SmallText>
                <SmallText style={{ color: '#666', fontSize: 11 }}>Own your identity</SmallText>
              </FeatureCard>
              <FeatureCard>
                <FeatureIcon><Globe size={22} /></FeatureIcon>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>Portable</SmallText>
                <SmallText style={{ color: '#666', fontSize: 11 }}>Works across apps</SmallText>
              </FeatureCard>
              <FeatureCard>
                <FeatureIcon><Shield size={22} /></FeatureIcon>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>Censorship-Resistant</SmallText>
                <SmallText style={{ color: '#666', fontSize: 11 }}>On-chain content</SmallText>
              </FeatureCard>
              <FeatureCard>
                <FeatureIcon><Sparkles size={22} /></FeatureIcon>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>Composable</SmallText>
                <SmallText style={{ color: '#666', fontSize: 11 }}>Build on top</SmallText>
              </FeatureCard>
            </FeatureGrid>

            <Web3Note>
              <Hexagon size={16} style={{ color: LENS_COLOR, flexShrink: 0 }} />
              <span>Lens profiles are NFTs on Polygon - you truly own your social identity!</span>
            </Web3Note>
          </Stack>
        </StepContainer>
      ),
      canProceed: true,
    },
    {
      id: 'setup',
      title: 'Get Access',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <SetupSteps>
              <SmallText style={{ fontWeight: 600, marginBottom: 16, display: 'block' }}>
                Connect your Lens Profile:
              </SmallText>

              <SetupStep>
                <StepNumber>1</StepNumber>
                <SmallText>You need a Lens Profile NFT (claim at hey.xyz or orb.ac)</SmallText>
              </SetupStep>
              <SetupStep>
                <StepNumber>2</StepNumber>
                <SmallText>Go to Lens developer settings</SmallText>
              </SetupStep>
              <SetupStep>
                <StepNumber>3</StepNumber>
                <SmallText>Generate an API authentication token</SmallText>
              </SetupStep>
              <SetupStep>
                <StepNumber>4</StepNumber>
                <SmallText>Copy your handle and auth token</SmallText>
              </SetupStep>
            </SetupSteps>

            <Stack direction="row" gap={2}>
              <PortalButton
                href="https://hey.xyz/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Hexagon size={16} />
                Hey.xyz
                <ExternalLink size={14} />
              </PortalButton>
              <PortalButton
                href="https://orb.ac/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ background: '#6366f1', color: 'white' }}
              >
                <Globe size={16} />
                Orb
                <ExternalLink size={14} />
              </PortalButton>
            </Stack>
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
              label="Lens Handle"
              type="text"
              value={credentials.lens_handle || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, lens_handle: e.target.value })}
              placeholder="yourhandle.lens"
              hint="Your Lens profile handle (with or without .lens)"
              fullWidth
            />

            <Input
              label="Authentication Token"
              type="password"
              value={credentials.auth_token || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, auth_token: e.target.value })}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
              hint="JWT token from Lens API authentication"
              fullWidth
            />

            {(credentials.lens_handle || credentials.auth_token) && !canConnect && (
              <Alert variant="warning">
                <AlertTriangle size={16} />
                Both handle and auth token are required.
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
              background: `linear-gradient(135deg, ${LENS_COLOR}10 0%, ${LENS_LIGHT}10 100%)`,
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
                Your Lens Protocol account is configured
              </SmallText>
            </div>

            <div style={{ padding: '0 16px' }}>
              <SmallText style={{ color: '#666' }}>
                <strong>Handle:</strong> @{credentials.lens_handle?.replace('.lens', '')}.lens
              </SmallText>
            </div>

            <Alert variant="info">
              <Hexagon size={16} />
              ChirpSyncer can now publish posts to your Lens profile on the blockchain.
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
      completeButtonText="Connect Lens"
      platformColor={LENS_COLOR}
    />
  );
}

export default LensConnect;
