'use client';

import { useMemo } from 'react';
import styled from 'styled-components';
import {
  Hash,
  Globe,
  Code2,
  Sparkles,
  CheckCircle,
  ExternalLink,
  AlertTriangle,
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
interface HashnodeConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

// ============ Constants ============
const HASHNODE_COLOR = '#2962FF';

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const HashnodeLogo = styled.div`
  width: 48px;
  height: 48px;
  background: ${HASHNODE_COLOR};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 28px;
`;

const FeatureCards = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.spacing[2]};
`;

const FeatureCard = styled.div`
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${HASHNODE_COLOR}08;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-align: center;
`;

const FeatureIcon = styled.div`
  width: 40px;
  height: 40px;
  background: ${HASHNODE_COLOR}15;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${HASHNODE_COLOR};
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
  background: ${HASHNODE_COLOR};
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
  background: ${HASHNODE_COLOR};
  color: white;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-decoration: none;
  font-weight: 500;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  transition: all 0.2s;

  &:hover {
    background: #1e4bd8;
  }
`;

const GraphQLNote = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[3]};
  background: linear-gradient(135deg, #e535ab15 0%, ${HASHNODE_COLOR}10 100%);
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

// ============ Component ============
export function HashnodeConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: HashnodeConnectProps) {
  const canConnect = useMemo((): boolean => {
    const hasToken = !!(credentials.api_token && credentials.api_token.length > 30);
    const hasPublication = !!(credentials.publication_id && credentials.publication_id.length > 10);
    return hasToken && hasPublication;
  }, [credentials]);

  const steps: WizardStep[] = [
    {
      id: 'intro',
      title: 'Welcome',
      content: (
        <PlatformIntro
          logo={<HashnodeLogo>#</HashnodeLogo>}
          name="Hashnode"
          tagline="Blog on your domain"
          description="Connect your Hashnode blog to publish technical articles with a custom domain, headless CMS features, and built-in developer tools."
          features={[
            { icon: Globe, label: 'Custom domain' },
            { icon: Code2, label: 'GraphQL API' },
            { icon: Sparkles, label: 'AI features' },
          ]}
          color={HASHNODE_COLOR}
          learnMoreUrl="https://hashnode.com/"
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
            <FeatureCards>
              <FeatureCard>
                <FeatureIcon><Globe size={20} /></FeatureIcon>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>Custom Domain</SmallText>
                <SmallText style={{ color: '#666', fontSize: 12 }}>Your blog, your URL</SmallText>
              </FeatureCard>
              <FeatureCard>
                <FeatureIcon><Code2 size={20} /></FeatureIcon>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>Headless CMS</SmallText>
                <SmallText style={{ color: '#666', fontSize: 12 }}>Use as API backend</SmallText>
              </FeatureCard>
              <FeatureCard>
                <FeatureIcon><Hash size={20} /></FeatureIcon>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>Series & Tags</SmallText>
                <SmallText style={{ color: '#666', fontSize: 12 }}>Organize content</SmallText>
              </FeatureCard>
              <FeatureCard>
                <FeatureIcon><Sparkles size={20} /></FeatureIcon>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>AI Tools</SmallText>
                <SmallText style={{ color: '#666', fontSize: 12 }}>Writing assistance</SmallText>
              </FeatureCard>
            </FeatureCards>

            <GraphQLNote>
              <Code2 size={18} style={{ color: '#e535ab', flexShrink: 0 }} />
              <span>Hashnode uses a powerful GraphQL API for programmatic access.</span>
            </GraphQLNote>
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
                Get your Hashnode API credentials:
              </SmallText>

              <SetupStep>
                <StepNumber>1</StepNumber>
                <SmallText>Go to Hashnode and sign in to your account</SmallText>
              </SetupStep>

              <SetupStep>
                <StepNumber>2</StepNumber>
                <SmallText>Click your avatar → Account Settings → Developer</SmallText>
              </SetupStep>

              <SetupStep>
                <StepNumber>3</StepNumber>
                <SmallText>Generate a new Personal Access Token</SmallText>
              </SetupStep>

              <SetupStep>
                <StepNumber>4</StepNumber>
                <SmallText>Go to your blog dashboard to find your Publication ID</SmallText>
              </SetupStep>
            </SetupSteps>

            <PortalButton
              href="https://hashnode.com/settings/developer"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Settings size={16} />
              Open Hashnode Settings
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
              label="Personal Access Token"
              type="password"
              value={credentials.api_token || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, api_token: e.target.value })}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              hint="From Developer settings"
              fullWidth
            />

            <Input
              label="Publication ID"
              type="text"
              value={credentials.publication_id || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, publication_id: e.target.value })}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
              hint="Found in your blog dashboard URL or API"
              fullWidth
            />

            {credentials.api_token && credentials.publication_id && !canConnect && (
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
              background: `linear-gradient(135deg, ${HASHNODE_COLOR}08 0%, #f0f4ff 100%)`,
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
                Your Hashnode blog is configured
              </SmallText>
            </div>

            <div style={{ padding: '0 16px' }}>
              <SmallText style={{ color: '#666' }}>
                <strong>Access Token:</strong> ••••••••••••
              </SmallText>
              <SmallText style={{ color: '#666' }}>
                <strong>Publication ID:</strong> {credentials.publication_id?.slice(0, 8)}••••••
              </SmallText>
            </div>

            <Alert variant="info">
              <Hash size={16} />
              ChirpSyncer can now publish articles to your Hashnode blog.
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
      completeButtonText="Connect Hashnode"
      platformColor={HASHNODE_COLOR}
    />
  );
}

export default HashnodeConnect;
