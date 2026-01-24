'use client';

import { useMemo } from 'react';
import styled from 'styled-components';
import {
  BookOpen,
  Users,
  TrendingUp,
  PenTool,
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
interface MediumConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

// ============ Constants ============
const MEDIUM_COLOR = '#000000';

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const MediumLogo = styled.div`
  width: 48px;
  height: 48px;
  background: ${MEDIUM_COLOR};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 28px;
  font-family: 'Georgia', serif;
`;

const ArticlePreview = styled.div`
  background: white;
  border: 1px solid ${({ theme }) => theme.colors.neutral[200]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing[4]};
`;

const ArticleTitle = styled.div`
  font-family: 'Georgia', serif;
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const ArticleMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const AuthorAvatar = styled.div`
  width: 24px;
  height: 24px;
  background: ${({ theme }) => theme.colors.neutral[300]};
  border-radius: 50%;
`;

const ArticleExcerpt = styled.div`
  font-family: 'Georgia', serif;
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
  background: ${MEDIUM_COLOR};
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
  background: ${MEDIUM_COLOR};
  color: white;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  text-decoration: none;
  font-weight: 500;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  transition: all 0.2s;

  &:hover {
    background: #333;
  }
`;

const LimitationNote = styled.div`
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
export function MediumConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: MediumConnectProps) {
  const canConnect = useMemo((): boolean => {
    return !!(credentials.integration_token && credentials.integration_token.length > 100);
  }, [credentials.integration_token]);

  const steps: WizardStep[] = [
    {
      id: 'intro',
      title: 'Welcome',
      content: (
        <PlatformIntro
          logo={<MediumLogo>M</MediumLogo>}
          name="Medium"
          tagline="Where good ideas find you"
          description="Connect your Medium account to publish stories, share ideas, and reach millions of readers on the world's premier publishing platform."
          features={[
            { icon: BookOpen, label: 'Long-form articles' },
            { icon: Users, label: '100M+ readers' },
            { icon: TrendingUp, label: 'Built-in audience' },
          ]}
          color={MEDIUM_COLOR}
          learnMoreUrl="https://medium.com/creators"
        />
      ),
      canProceed: true,
    },
    {
      id: 'article-preview',
      title: 'Publishing',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <ArticlePreview>
              <ArticleTitle>Your story title here</ArticleTitle>
              <ArticleMeta>
                <AuthorAvatar />
                <SmallText style={{ color: '#666' }}>Your Name · 5 min read</SmallText>
              </ArticleMeta>
              <ArticleExcerpt>
                ChirpSyncer can publish your articles directly to Medium, maintaining formatting, images, and links. Perfect for cross-posting from your blog or other platforms...
              </ArticleExcerpt>
            </ArticlePreview>

            <LimitationNote>
              <Info size={16} style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <strong>API Limitations:</strong> Medium&apos;s API only supports publishing new posts. Editing and deleting must be done on Medium directly.
              </div>
            </LimitationNote>
          </Stack>
        </StepContainer>
      ),
      canProceed: true,
    },
    {
      id: 'setup',
      title: 'Get Token',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <SetupSteps>
              <SmallText style={{ fontWeight: 600, marginBottom: 16, display: 'block' }}>
                Get your Medium Integration Token:
              </SmallText>

              <SetupStep>
                <StepNumber>1</StepNumber>
                <SmallText>Go to Medium.com and sign in to your account</SmallText>
              </SetupStep>

              <SetupStep>
                <StepNumber>2</StepNumber>
                <SmallText>Click your profile picture → Settings</SmallText>
              </SetupStep>

              <SetupStep>
                <StepNumber>3</StepNumber>
                <SmallText>Scroll down to &quot;Integration tokens&quot;</SmallText>
              </SetupStep>

              <SetupStep>
                <StepNumber>4</StepNumber>
                <SmallText>Enter a description (e.g., &quot;ChirpSyncer&quot;) and click &quot;Get token&quot;</SmallText>
              </SetupStep>

              <SetupStep>
                <StepNumber>5</StepNumber>
                <SmallText>Copy the token immediately (it&apos;s only shown once!)</SmallText>
              </SetupStep>
            </SetupSteps>

            <PortalButton
              href="https://medium.com/me/settings/security"
              target="_blank"
              rel="noopener noreferrer"
            >
              <PenTool size={16} />
              Open Medium Settings
              <ExternalLink size={14} />
            </PortalButton>
          </Stack>
        </StepContainer>
      ),
      canProceed: true,
    },
    {
      id: 'token',
      title: 'Token',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <Input
              label="Integration Token"
              type="password"
              value={credentials.integration_token || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, integration_token: e.target.value })}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              hint="The integration token from your Medium settings"
              fullWidth
            />

            {credentials.integration_token && !canConnect && (
              <Alert variant="warning">
                <AlertTriangle size={16} />
                Token looks too short. Medium tokens are usually longer.
              </Alert>
            )}

            {canConnect && (
              <Alert variant="success">
                <CheckCircle size={16} />
                Token format looks valid!
              </Alert>
            )}

            <Alert variant="info">
              <Info size={16} />
              Medium tokens don&apos;t expire, but you can revoke them from your settings at any time.
            </Alert>
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
                Your Medium account is configured
              </SmallText>
            </div>

            <div style={{ padding: '0 16px' }}>
              <SmallText style={{ color: '#666' }}>
                <strong>Integration Token:</strong> ••••••••••••
              </SmallText>
            </div>

            <Alert variant="info">
              <BookOpen size={16} />
              ChirpSyncer can now publish stories to your Medium account.
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
      completeButtonText="Connect Medium"
      platformColor={MEDIUM_COLOR}
    />
  );
}

export default MediumConnect;
