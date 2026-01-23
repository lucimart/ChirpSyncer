'use client';

import { useMemo } from 'react';
import styled from 'styled-components';
import {
  Radio,
  Podcast,
  BookOpen,
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
interface MicroblogConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

// ============ Constants ============
const MICROBLOG_COLOR = '#FF8800';

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const MicroblogLogo = styled.div`
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, ${MICROBLOG_COLOR} 0%, #ff6600 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 20px;
`;

const TimelinePreview = styled.div`
  background: #f9f9f9;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  overflow: hidden;
`;

const TimelineHeader = styled.div`
  background: linear-gradient(135deg, ${MICROBLOG_COLOR} 0%, #ff6600 100%);
  padding: ${({ theme }) => theme.spacing[3]};
  color: white;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-weight: 600;
`;

const MicroPost = styled.div`
  padding: ${({ theme }) => theme.spacing[3]};
  border-bottom: 1px solid #eee;
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};

  &:last-child {
    border-bottom: none;
  }
`;

const PostAvatar = styled.div`
  width: 36px;
  height: 36px;
  background: ${MICROBLOG_COLOR}30;
  border-radius: 50%;
  flex-shrink: 0;
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.spacing[2]};
`;

const FeatureCard = styled.div`
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${MICROBLOG_COLOR}08;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-align: center;
`;

const FeatureIcon = styled.div`
  color: ${MICROBLOG_COLOR};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
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
  background: ${MICROBLOG_COLOR};
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
  background: ${MICROBLOG_COLOR};
  color: white;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-decoration: none;
  font-weight: 500;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  transition: all 0.2s;

  &:hover {
    background: #e67a00;
  }
`;

const IndieWebNote = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[3]};
  background: linear-gradient(135deg, ${MICROBLOG_COLOR}10 0%, #fff3e6 100%);
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

// ============ Component ============
export function MicroblogConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: MicroblogConnectProps) {
  const canConnect = useMemo((): boolean => {
    const hasToken = !!(credentials.app_token && credentials.app_token.length > 20);
    return hasToken;
  }, [credentials]);

  const steps: WizardStep[] = [
    {
      id: 'intro',
      title: 'Welcome',
      content: (
        <PlatformIntro
          logo={<MicroblogLogo>M</MicroblogLogo>}
          name="Micro.blog"
          tagline="Small posts, big community"
          description="Connect to Micro.blog, the indie social network that supports the open web. Share short posts, photos, and long-form content with a friendly community."
          features={[
            { icon: Radio, label: 'IndieWeb' },
            { icon: Podcast, label: 'Podcasts' },
            { icon: Heart, label: 'Community' },
          ]}
          color={MICROBLOG_COLOR}
          learnMoreUrl="https://micro.blog/"
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
            <TimelinePreview>
              <TimelineHeader>
                <Radio size={18} />
                Timeline
              </TimelineHeader>
              <MicroPost>
                <PostAvatar />
                <div>
                  <SmallText style={{ fontWeight: 500 }}>Just posted a quick thought...</SmallText>
                  <SmallText style={{ color: '#999', fontSize: 11 }}>2m ago</SmallText>
                </div>
              </MicroPost>
              <MicroPost>
                <PostAvatar />
                <div>
                  <SmallText style={{ fontWeight: 500 }}>📸 Beautiful sunset today!</SmallText>
                  <SmallText style={{ color: '#999', fontSize: 11 }}>15m ago</SmallText>
                </div>
              </MicroPost>
            </TimelinePreview>

            <FeatureGrid>
              <FeatureCard>
                <FeatureIcon><Radio size={20} /></FeatureIcon>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>Microblogging</SmallText>
                <SmallText style={{ color: '#666', fontSize: 11 }}>Short posts</SmallText>
              </FeatureCard>
              <FeatureCard>
                <FeatureIcon><BookOpen size={20} /></FeatureIcon>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>Long Posts</SmallText>
                <SmallText style={{ color: '#666', fontSize: 11 }}>Full articles</SmallText>
              </FeatureCard>
              <FeatureCard>
                <FeatureIcon><Podcast size={20} /></FeatureIcon>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>Podcasts</SmallText>
                <SmallText style={{ color: '#666', fontSize: 11 }}>Audio hosting</SmallText>
              </FeatureCard>
              <FeatureCard>
                <FeatureIcon><Heart size={20} /></FeatureIcon>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>Community</SmallText>
                <SmallText style={{ color: '#666', fontSize: 11 }}>Friendly space</SmallText>
              </FeatureCard>
            </FeatureGrid>

            <IndieWebNote>
              <Radio size={16} style={{ color: MICROBLOG_COLOR, flexShrink: 0 }} />
              <span>Micro.blog supports the IndieWeb and cross-posting to other platforms!</span>
            </IndieWebNote>
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
                Get your Micro.blog app token:
              </SmallText>

              <SetupStep>
                <StepNumber>1</StepNumber>
                <SmallText>Sign in to Micro.blog</SmallText>
              </SetupStep>
              <SetupStep>
                <StepNumber>2</StepNumber>
                <SmallText>Go to Account → App tokens</SmallText>
              </SetupStep>
              <SetupStep>
                <StepNumber>3</StepNumber>
                <SmallText>Click &quot;New token&quot;</SmallText>
              </SetupStep>
              <SetupStep>
                <StepNumber>4</StepNumber>
                <SmallText>Name it &quot;ChirpSyncer&quot; and generate</SmallText>
              </SetupStep>
              <SetupStep>
                <StepNumber>5</StepNumber>
                <SmallText>Copy the generated token</SmallText>
              </SetupStep>
            </SetupSteps>

            <PortalButton
              href="https://micro.blog/account/apps"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Radio size={16} />
              Open Micro.blog App Tokens
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
              label="App Token"
              type="password"
              value={credentials.app_token || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, app_token: e.target.value })}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              hint="Your Micro.blog app token"
              fullWidth
            />

            <Input
              label="Blog URL (optional)"
              type="url"
              value={credentials.blog_url || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, blog_url: e.target.value })}
              placeholder="https://yourusername.micro.blog"
              hint="Leave empty to use your default blog"
              fullWidth
            />

            {credentials.app_token && !canConnect && (
              <Alert variant="warning">
                <AlertTriangle size={16} />
                Token seems too short.
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
              background: `linear-gradient(135deg, ${MICROBLOG_COLOR}08 0%, #fff8f0 100%)`,
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
                Your Micro.blog account is configured
              </SmallText>
            </div>

            <div style={{ padding: '0 16px' }}>
              <SmallText style={{ color: '#666' }}>
                <strong>Token:</strong> ••••••••••••
              </SmallText>
              {credentials.blog_url && (
                <SmallText style={{ color: '#666' }}>
                  <strong>Blog:</strong> {credentials.blog_url}
                </SmallText>
              )}
            </div>

            <Alert variant="info">
              <Radio size={16} />
              ChirpSyncer can now post to your Micro.blog.
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
      completeButtonText="Connect Micro.blog"
      platformColor={MICROBLOG_COLOR}
    />
  );
}

export default MicroblogConnect;
