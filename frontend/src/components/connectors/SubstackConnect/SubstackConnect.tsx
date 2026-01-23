'use client';

import { useMemo } from 'react';
import styled from 'styled-components';
import {
  Mail,
  Users,
  DollarSign,
  FileText,
  CheckCircle,
  ExternalLink,
  AlertTriangle,
  Info,
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
interface SubstackConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

// ============ Constants ============
const SUBSTACK_COLOR = '#FF6719';

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const SubstackLogo = styled.div`
  width: 48px;
  height: 48px;
  background: ${SUBSTACK_COLOR};
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
`;

const NewsletterPreview = styled.div`
  background: white;
  border: 2px solid ${SUBSTACK_COLOR}30;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  overflow: hidden;
`;

const NewsletterHeader = styled.div`
  background: ${SUBSTACK_COLOR};
  padding: ${({ theme }) => theme.spacing[3]};
  color: white;
  text-align: center;
`;

const NewsletterBody = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
`;

const NewsletterTitle = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const NewsletterExcerpt = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.6;
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
  background: ${SUBSTACK_COLOR};
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
  background: ${SUBSTACK_COLOR};
  color: white;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-decoration: none;
  font-weight: 500;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  transition: all 0.2s;

  &:hover {
    background: #e55a15;
  }
`;

const FeatureCard = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${SUBSTACK_COLOR}08;
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const FeatureIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: ${SUBSTACK_COLOR}15;
  color: ${SUBSTACK_COLOR};
  display: flex;
  align-items: center;
  justify-content: center;
`;

// ============ Component ============
export function SubstackConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: SubstackConnectProps) {
  const canConnect = useMemo((): boolean => {
    const hasSubdomain = !!(credentials.subdomain && credentials.subdomain.length > 2);
    const hasApiKey = !!(credentials.api_key && credentials.api_key.length > 20);
    return hasSubdomain && hasApiKey;
  }, [credentials]);

  const steps: WizardStep[] = [
    {
      id: 'intro',
      title: 'Welcome',
      content: (
        <PlatformIntro
          logo={<SubstackLogo>📧</SubstackLogo>}
          name="Substack"
          tagline="A place for independent writing"
          description="Connect your Substack newsletter to publish posts, send to subscribers, and grow your independent publication."
          features={[
            { icon: Mail, label: 'Email delivery' },
            { icon: Users, label: 'Subscribers' },
            { icon: DollarSign, label: 'Paid options' },
          ]}
          color={SUBSTACK_COLOR}
          learnMoreUrl="https://substack.com/"
        />
      ),
      canProceed: true,
    },
    {
      id: 'newsletter-preview',
      title: 'Newsletter',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <NewsletterPreview>
              <NewsletterHeader>
                <SmallText style={{ fontWeight: 600, color: 'white' }}>Your Newsletter</SmallText>
              </NewsletterHeader>
              <NewsletterBody>
                <NewsletterTitle>Your post title here</NewsletterTitle>
                <NewsletterExcerpt>
                  ChirpSyncer can publish posts to your Substack newsletter, automatically sending them to your subscribers. Perfect for cross-posting your content...
                </NewsletterExcerpt>
              </NewsletterBody>
            </NewsletterPreview>

            <Stack gap={2}>
              <FeatureCard>
                <FeatureIcon><FileText size={20} /></FeatureIcon>
                <div>
                  <SmallText style={{ fontWeight: 600, display: 'block' }}>Draft & Publish</SmallText>
                  <SmallText style={{ color: '#666' }}>Create drafts or publish directly</SmallText>
                </div>
              </FeatureCard>
              <FeatureCard>
                <FeatureIcon><Mail size={20} /></FeatureIcon>
                <div>
                  <SmallText style={{ fontWeight: 600, display: 'block' }}>Email Delivery</SmallText>
                  <SmallText style={{ color: '#666' }}>Send to all subscribers automatically</SmallText>
                </div>
              </FeatureCard>
            </Stack>
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
                Get your Substack API credentials:
              </SmallText>

              <SetupStep>
                <StepNumber>1</StepNumber>
                <SmallText>Go to your Substack dashboard</SmallText>
              </SetupStep>

              <SetupStep>
                <StepNumber>2</StepNumber>
                <SmallText>Navigate to Settings → Developers</SmallText>
              </SetupStep>

              <SetupStep>
                <StepNumber>3</StepNumber>
                <SmallText>Generate or copy your API key</SmallText>
              </SetupStep>

              <SetupStep>
                <StepNumber>4</StepNumber>
                <SmallText>Note your subdomain (e.g., &quot;yourname&quot; from yourname.substack.com)</SmallText>
              </SetupStep>
            </SetupSteps>

            <PortalButton
              href="https://substack.com/settings"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Mail size={16} />
              Open Substack Settings
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
              label="Substack Subdomain"
              type="text"
              value={credentials.subdomain || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, subdomain: e.target.value })}
              placeholder="yourname"
              hint="The subdomain from yourname.substack.com"
              fullWidth
            />

            <Input
              label="API Key"
              type="password"
              value={credentials.api_key || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, api_key: e.target.value })}
              placeholder="sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              hint="From your Substack developer settings"
              fullWidth
            />

            {credentials.subdomain && credentials.api_key && !canConnect && (
              <Alert variant="warning">
                <AlertTriangle size={16} />
                Please ensure both fields are filled in correctly.
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
              background: `linear-gradient(135deg, ${SUBSTACK_COLOR}10 0%, #fff5f0 100%)`,
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
                Your Substack newsletter is configured
              </SmallText>
            </div>

            <div style={{ padding: '0 16px' }}>
              <SmallText style={{ color: '#666' }}>
                <strong>Subdomain:</strong> {credentials.subdomain}.substack.com
              </SmallText>
              <SmallText style={{ color: '#666' }}>
                <strong>API Key:</strong> ••••••••••••
              </SmallText>
            </div>

            <Alert variant="info">
              <Mail size={16} />
              ChirpSyncer can now publish posts to your Substack newsletter.
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
      completeButtonText="Connect Substack"
      platformColor={SUBSTACK_COLOR}
    />
  );
}

export default SubstackConnect;
