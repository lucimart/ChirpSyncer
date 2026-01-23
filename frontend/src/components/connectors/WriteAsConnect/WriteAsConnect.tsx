'use client';

import { useMemo } from 'react';
import styled from 'styled-components';
import {
  PenLine,
  Eye,
  Lock,
  Feather,
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
interface WriteAsConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

// ============ Constants ============
const WRITEAS_COLOR = '#5D9CEC';

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const WriteAsLogo = styled.div`
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, ${WRITEAS_COLOR} 0%, #3a78c7 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
`;

const MinimalEditor = styled.div`
  background: #fafafa;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing[6]};
  text-align: center;
  font-family: 'Georgia', serif;
`;

const EditorCursor = styled.span`
  animation: blink 1s infinite;
  border-right: 2px solid ${WRITEAS_COLOR};
  margin-left: 2px;

  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }
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
  background: ${WRITEAS_COLOR}08;
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const FeatureIcon = styled.div`
  width: 36px;
  height: 36px;
  background: ${WRITEAS_COLOR}15;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${WRITEAS_COLOR};
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
  background: ${WRITEAS_COLOR};
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
  background: ${WRITEAS_COLOR};
  color: white;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-decoration: none;
  font-weight: 500;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  transition: all 0.2s;

  &:hover {
    background: #4a89d9;
  }
`;

// ============ Component ============
export function WriteAsConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: WriteAsConnectProps) {
  const canConnect = useMemo((): boolean => {
    const hasToken = !!(credentials.access_token && credentials.access_token.length > 20);
    return hasToken;
  }, [credentials]);

  const steps: WizardStep[] = [
    {
      id: 'intro',
      title: 'Welcome',
      content: (
        <PlatformIntro
          logo={<WriteAsLogo><PenLine size={24} /></WriteAsLogo>}
          name="Write.as"
          tagline="Distraction-free writing"
          description="Connect to Write.as, the minimalist blogging platform focused on writing. Publish anonymously or build your blog with a clean, reader-friendly experience."
          features={[
            { icon: Feather, label: 'Minimal' },
            { icon: Lock, label: 'Privacy' },
            { icon: Eye, label: 'No tracking' },
          ]}
          color={WRITEAS_COLOR}
          learnMoreUrl="https://write.as/"
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
            <MinimalEditor>
              <SmallText style={{ color: '#999', marginBottom: 16, display: 'block' }}>
                Just write.
              </SmallText>
              <p style={{ fontSize: 18, color: '#333', margin: 0 }}>
                Your words matter<EditorCursor />
              </p>
            </MinimalEditor>

            <FeatureList>
              <FeatureItem>
                <FeatureIcon><Feather size={18} /></FeatureIcon>
                <div>
                  <SmallText style={{ fontWeight: 600, display: 'block' }}>Distraction-Free</SmallText>
                  <SmallText style={{ color: '#666' }}>Clean editor, no clutter</SmallText>
                </div>
              </FeatureItem>
              <FeatureItem>
                <FeatureIcon><Lock size={18} /></FeatureIcon>
                <div>
                  <SmallText style={{ fontWeight: 600, display: 'block' }}>Privacy First</SmallText>
                  <SmallText style={{ color: '#666' }}>Anonymous publishing supported</SmallText>
                </div>
              </FeatureItem>
              <FeatureItem>
                <FeatureIcon><Eye size={18} /></FeatureIcon>
                <div>
                  <SmallText style={{ fontWeight: 600, display: 'block' }}>No Tracking</SmallText>
                  <SmallText style={{ color: '#666' }}>Reader privacy respected</SmallText>
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
      title: 'Get Token',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <SetupSteps>
              <SmallText style={{ fontWeight: 600, marginBottom: 16, display: 'block' }}>
                Get your Write.as access token:
              </SmallText>

              <SetupStep>
                <StepNumber>1</StepNumber>
                <SmallText>Sign in to your Write.as account</SmallText>
              </SetupStep>
              <SetupStep>
                <StepNumber>2</StepNumber>
                <SmallText>Go to Settings → Applications</SmallText>
              </SetupStep>
              <SetupStep>
                <StepNumber>3</StepNumber>
                <SmallText>Create a new application token</SmallText>
              </SetupStep>
              <SetupStep>
                <StepNumber>4</StepNumber>
                <SmallText>Copy the generated access token</SmallText>
              </SetupStep>
            </SetupSteps>

            <PortalButton
              href="https://write.as/me/settings/apps"
              target="_blank"
              rel="noopener noreferrer"
            >
              <PenLine size={16} />
              Open Write.as Settings
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
              label="Access Token"
              type="password"
              value={credentials.access_token || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, access_token: e.target.value })}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              hint="Your Write.as API access token"
              fullWidth
            />

            <Input
              label="Blog Alias (optional)"
              type="text"
              value={credentials.blog_alias || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, blog_alias: e.target.value })}
              placeholder="myblog"
              hint="Leave empty to publish to your default blog"
              fullWidth
            />

            {credentials.access_token && !canConnect && (
              <Alert variant="warning">
                <AlertTriangle size={16} />
                Access token seems too short.
              </Alert>
            )}

            {canConnect && (
              <Alert variant="success">
                <CheckCircle size={16} />
                Token looks valid!
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
              background: `linear-gradient(135deg, ${WRITEAS_COLOR}08 0%, #f0f7ff 100%)`,
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
                Your Write.as account is configured
              </SmallText>
            </div>

            <div style={{ padding: '0 16px' }}>
              <SmallText style={{ color: '#666' }}>
                <strong>Token:</strong> ••••••••••••
              </SmallText>
              {credentials.blog_alias && (
                <SmallText style={{ color: '#666' }}>
                  <strong>Blog:</strong> {credentials.blog_alias}
                </SmallText>
              )}
            </div>

            <Alert variant="info">
              <PenLine size={16} />
              ChirpSyncer can now publish posts to Write.as.
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
      completeButtonText="Connect Write.as"
      platformColor={WRITEAS_COLOR}
    />
  );
}

export default WriteAsConnect;
