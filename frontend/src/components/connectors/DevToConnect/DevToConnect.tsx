'use client';

import { useMemo } from 'react';
import styled from 'styled-components';
import {
  Code,
  Users,
  Heart,
  BookOpen,
  CheckCircle,
  ExternalLink,
  AlertTriangle,
  Hash,
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
interface DevToConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

// ============ Constants ============
const DEVTO_COLOR = '#0A0A0A';

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const DevToLogo = styled.div`
  width: 48px;
  height: 48px;
  background: ${DEVTO_COLOR};
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 12px;
  font-family: monospace;
`;

const ArticlePreview = styled.div`
  background: white;
  border: 2px solid ${({ theme }) => theme.colors.neutral[200]};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  overflow: hidden;
`;

const ArticleHeader = styled.div`
  height: 80px;
  background: linear-gradient(135deg, #5f5fc4 0%, #001eff 50%, #00d4ff 100%);
`;

const ArticleBody = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
`;

const ArticleTitle = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const TagsRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[1]};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const Tag = styled.span`
  font-size: 12px;
  color: #666;

  &::before {
    content: '#';
    color: #999;
  }
`;

const ArticleReactions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  padding-top: ${({ theme }) => theme.spacing[2]};
  border-top: 1px solid ${({ theme }) => theme.colors.neutral[100]};
`;

const Reaction = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #666;
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
  background: ${DEVTO_COLOR};
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
  background: ${DEVTO_COLOR};
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

// ============ Component ============
export function DevToConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: DevToConnectProps) {
  const canConnect = useMemo((): boolean => {
    return !!(credentials.api_key && credentials.api_key.length > 20);
  }, [credentials.api_key]);

  const steps: WizardStep[] = [
    {
      id: 'intro',
      title: 'Welcome',
      content: (
        <PlatformIntro
          logo={<DevToLogo>DEV</DevToLogo>}
          name="Dev.to"
          tagline="Where programmers share ideas"
          description="Connect your DEV account to publish technical articles, share tutorials, and engage with a community of developers."
          features={[
            { icon: Code, label: 'Tech articles' },
            { icon: Users, label: 'Dev community' },
            { icon: Heart, label: 'Reactions' },
          ]}
          color={DEVTO_COLOR}
          learnMoreUrl="https://dev.to/"
        />
      ),
      canProceed: true,
    },
    {
      id: 'article-preview',
      title: 'Articles',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <ArticlePreview>
              <ArticleHeader />
              <ArticleBody>
                <ArticleTitle>Your technical article title</ArticleTitle>
                <TagsRow>
                  <Tag>javascript</Tag>
                  <Tag>tutorial</Tag>
                  <Tag>webdev</Tag>
                </TagsRow>
                <SmallText style={{ color: '#666' }}>
                  ChirpSyncer can publish your articles with full markdown support, cover images, and tags...
                </SmallText>
                <ArticleReactions>
                  <Reaction><Heart size={16} /> 42</Reaction>
                  <Reaction><Hash size={16} /> 8 comments</Reaction>
                  <Reaction><BookOpen size={16} /> 5 min read</Reaction>
                </ArticleReactions>
              </ArticleBody>
            </ArticlePreview>

            <Alert variant="info">
              <Code size={16} />
              DEV supports full markdown, code blocks with syntax highlighting, and embedded media.
            </Alert>
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
                Generate your DEV API key:
              </SmallText>

              <SetupStep>
                <StepNumber>1</StepNumber>
                <SmallText>Go to DEV and sign in to your account</SmallText>
              </SetupStep>

              <SetupStep>
                <StepNumber>2</StepNumber>
                <SmallText>Click your profile → Settings → Extensions</SmallText>
              </SetupStep>

              <SetupStep>
                <StepNumber>3</StepNumber>
                <SmallText>Scroll to &quot;DEV Community API Keys&quot;</SmallText>
              </SetupStep>

              <SetupStep>
                <StepNumber>4</StepNumber>
                <SmallText>Enter a description (e.g., &quot;ChirpSyncer&quot;) and generate a new key</SmallText>
              </SetupStep>

              <SetupStep>
                <StepNumber>5</StepNumber>
                <SmallText>Copy the API key (it&apos;s only shown once!)</SmallText>
              </SetupStep>
            </SetupSteps>

            <PortalButton
              href="https://dev.to/settings/extensions"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Code size={16} />
              Open DEV Settings
              <ExternalLink size={14} />
            </PortalButton>
          </Stack>
        </StepContainer>
      ),
      canProceed: true,
    },
    {
      id: 'token',
      title: 'API Key',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <Input
              label="DEV API Key"
              type="password"
              value={credentials.api_key || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, api_key: e.target.value })}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
              hint="The API key from your DEV settings"
              fullWidth
            />

            {credentials.api_key && !canConnect && (
              <Alert variant="warning">
                <AlertTriangle size={16} />
                API key looks too short.
              </Alert>
            )}

            {canConnect && (
              <Alert variant="success">
                <CheckCircle size={16} />
                API key format looks valid!
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
              background: 'linear-gradient(135deg, #f8f8f8 0%, #f0f0f0 100%)',
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
                Your DEV account is configured
              </SmallText>
            </div>

            <div style={{ padding: '0 16px' }}>
              <SmallText style={{ color: '#666' }}>
                <strong>API Key:</strong> ••••••••••••
              </SmallText>
            </div>

            <Alert variant="info">
              <Code size={16} />
              ChirpSyncer can now publish articles to your DEV profile.
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
      completeButtonText="Connect DEV"
      platformColor={DEVTO_COLOR}
    />
  );
}

export default DevToConnect;
