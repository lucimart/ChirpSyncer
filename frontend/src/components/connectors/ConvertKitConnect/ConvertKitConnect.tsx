'use client';

import { useMemo } from 'react';
import styled from 'styled-components';
import {
  Mail,
  Users,
  Sparkles,
  TrendingUp,
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
interface ConvertKitConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

// ============ Constants ============
const CK_COLOR = '#FB6970';

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const CKLogo = styled.div`
  width: 48px;
  height: 48px;
  background: ${CK_COLOR};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
`;

const StatsPreview = styled.div`
  background: linear-gradient(135deg, ${CK_COLOR}10 0%, #fff0f1 100%);
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing[4]};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.spacing[3]};
  text-align: center;
`;

const StatCard = styled.div`
  padding: ${({ theme }) => theme.spacing[3]};
  background: white;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
`;

const StatNumber = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: ${CK_COLOR};
`;

const FeatureList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const FeatureItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${CK_COLOR}08;
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const FeatureIcon = styled.div`
  width: 36px;
  height: 36px;
  background: ${CK_COLOR}15;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${CK_COLOR};
  flex-shrink: 0;
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
  background: ${CK_COLOR};
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
  background: ${CK_COLOR};
  color: white;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-decoration: none;
  font-weight: 500;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  transition: all 0.2s;

  &:hover {
    background: #e55960;
  }
`;

// ============ Component ============
export function ConvertKitConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: ConvertKitConnectProps) {
  const canConnect = useMemo((): boolean => {
    const hasKey = !!(credentials.api_key && credentials.api_key.length > 20);
    const hasSecret = !!(credentials.api_secret && credentials.api_secret.length > 20);
    return hasKey && hasSecret;
  }, [credentials]);

  const steps: WizardStep[] = [
    {
      id: 'intro',
      title: 'Welcome',
      content: (
        <PlatformIntro
          logo={<CKLogo>CK</CKLogo>}
          name="ConvertKit"
          tagline="The creator marketing platform"
          description="Connect to ConvertKit (now Kit), the email marketing platform built for creators. Grow your audience with powerful automations and beautiful landing pages."
          features={[
            { icon: Users, label: 'For creators' },
            { icon: Sparkles, label: 'Automations' },
            { icon: TrendingUp, label: 'Growth tools' },
          ]}
          color={CK_COLOR}
          learnMoreUrl="https://convertkit.com/"
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
            <StatsPreview>
              <SmallText style={{ fontWeight: 600, marginBottom: 16, display: 'block', textAlign: 'center' }}>
                Your Newsletter Dashboard
              </SmallText>
              <StatsGrid>
                <StatCard>
                  <StatNumber>--</StatNumber>
                  <SmallText style={{ color: '#666' }}>Subscribers</SmallText>
                </StatCard>
                <StatCard>
                  <StatNumber>--%</StatNumber>
                  <SmallText style={{ color: '#666' }}>Open Rate</SmallText>
                </StatCard>
                <StatCard>
                  <StatNumber>--</StatNumber>
                  <SmallText style={{ color: '#666' }}>Sequences</SmallText>
                </StatCard>
              </StatsGrid>
            </StatsPreview>

            <FeatureList>
              <FeatureItem>
                <FeatureIcon><Users size={18} /></FeatureIcon>
                <div>
                  <SmallText style={{ fontWeight: 600, display: 'block' }}>Subscriber Tags</SmallText>
                  <SmallText style={{ color: '#666' }}>Segment your audience</SmallText>
                </div>
              </FeatureItem>
              <FeatureItem>
                <FeatureIcon><Sparkles size={18} /></FeatureIcon>
                <div>
                  <SmallText style={{ fontWeight: 600, display: 'block' }}>Visual Automations</SmallText>
                  <SmallText style={{ color: '#666' }}>Build complex email sequences</SmallText>
                </div>
              </FeatureItem>
              <FeatureItem>
                <FeatureIcon><TrendingUp size={18} /></FeatureIcon>
                <div>
                  <SmallText style={{ fontWeight: 600, display: 'block' }}>Creator Network</SmallText>
                  <SmallText style={{ color: '#666' }}>Cross-promote with others</SmallText>
                </div>
              </FeatureItem>
            </FeatureList>
          </Stack>
        </StepContainer>
      ),
      canProceed: true,
    },
    {
      id: 'setup',
      title: 'Get API Keys',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <SetupSteps>
              <SmallText style={{ fontWeight: 600, marginBottom: 16, display: 'block' }}>
                Get your ConvertKit API credentials:
              </SmallText>

              <SetupStep>
                <StepNumber>1</StepNumber>
                <SmallText>Sign in to ConvertKit</SmallText>
              </SetupStep>
              <SetupStep>
                <StepNumber>2</StepNumber>
                <SmallText>Go to Settings → Advanced</SmallText>
              </SetupStep>
              <SetupStep>
                <StepNumber>3</StepNumber>
                <SmallText>Find your API Key and API Secret</SmallText>
              </SetupStep>
              <SetupStep>
                <StepNumber>4</StepNumber>
                <SmallText>Copy both values</SmallText>
              </SetupStep>
            </SetupSteps>

            <PortalButton
              href="https://app.convertkit.com/account_settings/advanced_settings"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Mail size={16} />
              Open ConvertKit Settings
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
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
              hint="Your ConvertKit API key"
              fullWidth
            />

            <Input
              label="API Secret"
              type="password"
              value={credentials.api_secret || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, api_secret: e.target.value })}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
              hint="Your ConvertKit API secret (for broadcast creation)"
              fullWidth
            />

            {(credentials.api_key || credentials.api_secret) && !canConnect && (
              <Alert variant="warning">
                <AlertTriangle size={16} />
                Both API Key and API Secret are required.
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
              background: `linear-gradient(135deg, ${CK_COLOR}08 0%, #fff0f1 100%)`,
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
                Your ConvertKit account is configured
              </SmallText>
            </div>

            <Alert variant="info">
              <Mail size={16} />
              ChirpSyncer can now send broadcasts and manage subscribers.
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
      completeButtonText="Connect ConvertKit"
      platformColor={CK_COLOR}
    />
  );
}

export default ConvertKitConnect;
