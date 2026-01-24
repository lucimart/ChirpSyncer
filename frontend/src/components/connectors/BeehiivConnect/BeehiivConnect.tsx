'use client';

import { useMemo } from 'react';
import styled from 'styled-components';
import {
  Mail,
  Hexagon,
  DollarSign,
  BarChart3,
  CheckCircle,
  ExternalLink,
  AlertTriangle,
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
interface BeehiivConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

// ============ Constants ============
const BEEHIIV_COLOR = '#FFCC00';
const BEEHIIV_DARK = '#1a1a1a';

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const BeehiivLogo = styled.div`
  width: 48px;
  height: 48px;
  background: ${BEEHIIV_COLOR};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${BEEHIIV_DARK};
`;

const HoneycombPattern = styled.div`
  background: linear-gradient(135deg, ${BEEHIIV_COLOR}20 0%, #fff9e6 100%);
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing[4]};
  text-align: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '🐝';
    position: absolute;
    font-size: 48px;
    opacity: 0.1;
    right: 10px;
    top: 10px;
  }
`;

const FeatureCards = styled.div`
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
    border-color: ${BEEHIIV_COLOR};
    box-shadow: 0 4px 12px ${BEEHIIV_COLOR}30;
  }
`;

const FeatureIcon = styled.div`
  width: 44px;
  height: 44px;
  background: ${BEEHIIV_COLOR}20;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${BEEHIIV_DARK};
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
  background: ${BEEHIIV_COLOR};
  color: ${BEEHIIV_DARK};
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
  background: ${BEEHIIV_COLOR};
  color: ${BEEHIIV_DARK};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-decoration: none;
  font-weight: 600;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  transition: all 0.2s;

  &:hover {
    background: #e6b800;
  }
`;

// ============ Component ============
export function BeehiivConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: BeehiivConnectProps) {
  const canConnect = useMemo((): boolean => {
    const hasKey = !!(credentials.api_key && credentials.api_key.length > 20);
    const hasPubId = !!(credentials.publication_id && credentials.publication_id.length > 5);
    return hasKey && hasPubId;
  }, [credentials]);

  const steps: WizardStep[] = [
    {
      id: 'intro',
      title: 'Welcome',
      content: (
        <PlatformIntro
          logo={<BeehiivLogo><Hexagon size={24} /></BeehiivLogo>}
          name="Beehiiv"
          tagline="Newsletter platform for growth"
          description="Connect to Beehiiv, the newsletter platform built for scale. Monetize your audience with ads, premium subscriptions, and powerful growth tools."
          features={[
            { icon: BarChart3, label: 'Analytics' },
            { icon: DollarSign, label: 'Monetize' },
            { icon: Mail, label: 'Automations' },
          ]}
          color={BEEHIIV_COLOR}
          learnMoreUrl="https://beehiiv.com/"
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
            <HoneycombPattern>
              <SmallText style={{ fontWeight: 700, fontSize: 18, color: BEEHIIV_DARK, marginBottom: 8, display: 'block' }}>
                Built for Growth
              </SmallText>
              <SmallText style={{ color: '#666' }}>
                The newsletter platform trusted by the biggest creators
              </SmallText>
            </HoneycombPattern>

            <FeatureCards>
              <FeatureCard>
                <FeatureIcon><BarChart3 size={22} /></FeatureIcon>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>Deep Analytics</SmallText>
                <SmallText style={{ color: '#666', fontSize: 11 }}>Track every metric</SmallText>
              </FeatureCard>
              <FeatureCard>
                <FeatureIcon><DollarSign size={22} /></FeatureIcon>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>Ad Network</SmallText>
                <SmallText style={{ color: '#666', fontSize: 11 }}>Native monetization</SmallText>
              </FeatureCard>
              <FeatureCard>
                <FeatureIcon><Mail size={22} /></FeatureIcon>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>Automations</SmallText>
                <SmallText style={{ color: '#666', fontSize: 11 }}>Welcome sequences</SmallText>
              </FeatureCard>
              <FeatureCard>
                <FeatureIcon><Hexagon size={22} /></FeatureIcon>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>Boosts</SmallText>
                <SmallText style={{ color: '#666', fontSize: 11 }}>Cross-promotion</SmallText>
              </FeatureCard>
            </FeatureCards>
          </Stack>
        </StepContainer>
      ),
      canProceed: true,
    },
    {
      id: 'setup',
      title: 'Get Credentials',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <SetupSteps>
              <SmallText style={{ fontWeight: 600, marginBottom: 16, display: 'block' }}>
                Get your Beehiiv API credentials:
              </SmallText>

              <SetupStep>
                <StepNumber>1</StepNumber>
                <SmallText>Sign in to Beehiiv</SmallText>
              </SetupStep>
              <SetupStep>
                <StepNumber>2</StepNumber>
                <SmallText>Go to Settings → Integrations → API</SmallText>
              </SetupStep>
              <SetupStep>
                <StepNumber>3</StepNumber>
                <SmallText>Create a new API key with write permissions</SmallText>
              </SetupStep>
              <SetupStep>
                <StepNumber>4</StepNumber>
                <SmallText>Copy your API key and Publication ID</SmallText>
              </SetupStep>
            </SetupSteps>

            <PortalButton
              href="https://app.beehiiv.com/settings/integrations"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Hexagon size={16} />
              Open Beehiiv Settings
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
              label="API Key"
              type="password"
              value={credentials.api_key || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, api_key: e.target.value })}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              hint="Your Beehiiv API key"
              fullWidth
            />

            <Input
              label="Publication ID"
              type="text"
              value={credentials.publication_id || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, publication_id: e.target.value })}
              placeholder="pub_xxxxxxxx"
              hint="Found in your publication settings"
              fullWidth
            />

            {(credentials.api_key || credentials.publication_id) && !canConnect && (
              <Alert variant="warning">
                <AlertTriangle size={16} />
                Both API Key and Publication ID are required.
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
              background: `linear-gradient(135deg, ${BEEHIIV_COLOR}15 0%, #fffaeb 100%)`,
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
                Your Beehiiv account is configured
              </SmallText>
            </div>

            <Alert variant="info">
              <Hexagon size={16} />
              ChirpSyncer can now publish posts to your Beehiiv newsletter.
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
      completeButtonText="Connect Beehiiv"
      platformColor={BEEHIIV_COLOR}
    />
  );
}

export default BeehiivConnect;
