'use client';

import { useMemo } from 'react';
import styled from 'styled-components';
import {
  Mail,
  Zap,
  Code,
  Heart,
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
interface ButtondownConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

// ============ Constants ============
const BUTTONDOWN_COLOR = '#0069FF';

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const ButtondownLogo = styled.div`
  width: 48px;
  height: 48px;
  background: ${BUTTONDOWN_COLOR};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
`;

const EmailPreview = styled.div`
  background: white;
  border: 1px solid ${({ theme }) => theme.colors.neutral[200]};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const EmailHeader = styled.div`
  background: ${BUTTONDOWN_COLOR};
  padding: ${({ theme }) => theme.spacing[4]};
  color: white;
  text-align: center;
`;

const EmailBody = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
`;

const EmailSubject = styled.div`
  font-weight: 600;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
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
  background: ${BUTTONDOWN_COLOR}08;
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const FeatureIcon = styled.div`
  width: 36px;
  height: 36px;
  background: ${BUTTONDOWN_COLOR}15;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${BUTTONDOWN_COLOR};
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
  background: ${BUTTONDOWN_COLOR};
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
  background: ${BUTTONDOWN_COLOR};
  color: white;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-decoration: none;
  font-weight: 500;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  transition: all 0.2s;

  &:hover {
    background: #0055cc;
  }
`;

// ============ Component ============
export function ButtondownConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: ButtondownConnectProps) {
  const canConnect = useMemo((): boolean => {
    const hasKey = !!(credentials.api_key && credentials.api_key.length > 30);
    return hasKey;
  }, [credentials]);

  const steps: WizardStep[] = [
    {
      id: 'intro',
      title: 'Welcome',
      content: (
        <PlatformIntro
          logo={<ButtondownLogo><Mail size={24} /></ButtondownLogo>}
          name="Buttondown"
          tagline="The easiest way to start a newsletter"
          description="Connect to Buttondown, the minimalist newsletter service for writers and creators. Simple, fast, and built by a single developer who cares."
          features={[
            { icon: Zap, label: 'Simple' },
            { icon: Code, label: 'Markdown' },
            { icon: Heart, label: 'Indie-made' },
          ]}
          color={BUTTONDOWN_COLOR}
          learnMoreUrl="https://buttondown.email/"
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
            <EmailPreview>
              <EmailHeader>
                <SmallText style={{ opacity: 0.8 }}>Your Newsletter</SmallText>
              </EmailHeader>
              <EmailBody>
                <EmailSubject>📬 This week&apos;s thoughts...</EmailSubject>
                <SmallText style={{ color: '#666' }}>
                  A quick update on what I&apos;ve been working on...
                </SmallText>
              </EmailBody>
            </EmailPreview>

            <FeatureList>
              <FeatureItem>
                <FeatureIcon><Zap size={18} /></FeatureIcon>
                <div>
                  <SmallText style={{ fontWeight: 600, display: 'block' }}>Dead Simple</SmallText>
                  <SmallText style={{ color: '#666' }}>No bloat, just newsletters</SmallText>
                </div>
              </FeatureItem>
              <FeatureItem>
                <FeatureIcon><Code size={18} /></FeatureIcon>
                <div>
                  <SmallText style={{ fontWeight: 600, display: 'block' }}>Markdown Native</SmallText>
                  <SmallText style={{ color: '#666' }}>Write in plain text</SmallText>
                </div>
              </FeatureItem>
              <FeatureItem>
                <FeatureIcon><Heart size={18} /></FeatureIcon>
                <div>
                  <SmallText style={{ fontWeight: 600, display: 'block' }}>Indie-Made</SmallText>
                  <SmallText style={{ color: '#666' }}>Built by a solo developer</SmallText>
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
      title: 'Get API Key',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <SetupSteps>
              <SmallText style={{ fontWeight: 600, marginBottom: 16, display: 'block' }}>
                Get your Buttondown API key:
              </SmallText>

              <SetupStep>
                <StepNumber>1</StepNumber>
                <SmallText>Sign in to Buttondown</SmallText>
              </SetupStep>
              <SetupStep>
                <StepNumber>2</StepNumber>
                <SmallText>Go to Settings → API</SmallText>
              </SetupStep>
              <SetupStep>
                <StepNumber>3</StepNumber>
                <SmallText>Copy your API key</SmallText>
              </SetupStep>
            </SetupSteps>

            <PortalButton
              href="https://buttondown.email/settings/api"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Mail size={16} />
              Open Buttondown API Settings
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
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              hint="Your Buttondown API key"
              fullWidth
            />

            {credentials.api_key && !canConnect && (
              <Alert variant="warning">
                <AlertTriangle size={16} />
                API key seems too short.
              </Alert>
            )}

            {canConnect && (
              <Alert variant="success">
                <CheckCircle size={16} />
                API key looks valid!
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
              background: `linear-gradient(135deg, ${BUTTONDOWN_COLOR}08 0%, #f0f7ff 100%)`,
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
                Your Buttondown account is configured
              </SmallText>
            </div>

            <Alert variant="info">
              <Mail size={16} />
              ChirpSyncer can now send emails to your Buttondown subscribers.
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
      completeButtonText="Connect Buttondown"
      platformColor={BUTTONDOWN_COLOR}
    />
  );
}

export default ButtondownConnect;
