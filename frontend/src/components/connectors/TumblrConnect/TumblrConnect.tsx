'use client';

import { useMemo } from 'react';
import styled from 'styled-components';
import {
  FileText,
  Image as ImageIcon,
  Heart,
  RefreshCw,
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
interface TumblrConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

// ============ Constants ============
const TUMBLR_COLOR = '#001935';

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const TumblrLogo = styled.div`
  width: 48px;
  height: 48px;
  background: ${TUMBLR_COLOR};
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 28px;
  font-family: 'Georgia', serif;
`;

const OAuth1Warning = styled.div`
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 1px solid #f59e0b;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing[3]};
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[3]};
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
  background: ${TUMBLR_COLOR};
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
  background: ${TUMBLR_COLOR};
  color: white;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-decoration: none;
  font-weight: 500;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  transition: all 0.2s;

  &:hover {
    background: #003366;
  }
`;

const CredentialsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[3]};

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

const PostTypeChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 4px 8px;
  background: ${TUMBLR_COLOR}10;
  color: ${TUMBLR_COLOR};
  border-radius: 4px;
  margin: 2px;
`;

// ============ Component ============
export function TumblrConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: TumblrConnectProps) {
  const canConnect = useMemo((): boolean => {
    const hasConsumerKey = !!(credentials.consumer_key && credentials.consumer_key.length > 20);
    const hasConsumerSecret = !!(credentials.consumer_secret && credentials.consumer_secret.length > 20);
    const hasOAuthToken = !!(credentials.oauth_token && credentials.oauth_token.length > 20);
    const hasOAuthSecret = !!(credentials.oauth_token_secret && credentials.oauth_token_secret.length > 20);
    return hasConsumerKey && hasConsumerSecret && hasOAuthToken && hasOAuthSecret;
  }, [credentials]);

  const steps: WizardStep[] = [
    {
      id: 'intro',
      title: 'Welcome',
      content: (
        <PlatformIntro
          logo={<TumblrLogo>t</TumblrLogo>}
          name="Tumblr"
          tagline="Come for what you love. Stay for what you discover."
          description="Connect your Tumblr blog to share multimedia posts, engage with the community, and sync content across platforms."
          features={[
            { icon: FileText, label: 'Rich posts' },
            { icon: Heart, label: 'Likes & reblogs' },
            { icon: RefreshCw, label: 'Queue & drafts' },
          ]}
          color={TUMBLR_COLOR}
          learnMoreUrl="https://www.tumblr.com/developers"
        />
      ),
      canProceed: true,
    },
    {
      id: 'post-types',
      title: 'Post Types',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <div style={{ textAlign: 'center' }}>
              <SmallText style={{ color: '#666' }}>
                Tumblr supports multiple post types. ChirpSyncer can create all of them.
              </SmallText>
            </div>

            <div style={{ textAlign: 'center' }}>
              <PostTypeChip><FileText size={12} /> Text</PostTypeChip>
              <PostTypeChip><ImageIcon size={12} /> Photo</PostTypeChip>
              <PostTypeChip>📹 Video</PostTypeChip>
              <PostTypeChip>🎵 Audio</PostTypeChip>
              <PostTypeChip>💬 Quote</PostTypeChip>
              <PostTypeChip>🔗 Link</PostTypeChip>
              <PostTypeChip>💭 Chat</PostTypeChip>
            </div>

            <OAuth1Warning>
              <Info size={20} style={{ color: '#92400e', flexShrink: 0, marginTop: 2 }} />
              <div>
                <SmallText style={{ fontWeight: 600, color: '#92400e', display: 'block', marginBottom: 4 }}>
                  OAuth 1.0a Authentication
                </SmallText>
                <SmallText style={{ color: '#92400e' }}>
                  Tumblr uses OAuth 1.0a which is more complex than OAuth 2.0.
                  You&apos;ll need four separate credentials to authenticate.
                </SmallText>
              </div>
            </OAuth1Warning>
          </Stack>
        </StepContainer>
      ),
      canProceed: true,
    },
    {
      id: 'setup',
      title: 'Register App',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <SetupSteps>
              <SmallText style={{ fontWeight: 600, marginBottom: 16, display: 'block' }}>
                Tumblr OAuth 1.0a Setup:
              </SmallText>

              <SetupStep>
                <StepNumber>1</StepNumber>
                <SmallText>Go to Tumblr OAuth Apps and click &quot;Register application&quot;</SmallText>
              </SetupStep>

              <SetupStep>
                <StepNumber>2</StepNumber>
                <SmallText>Fill in your application name, website, and description</SmallText>
              </SetupStep>

              <SetupStep>
                <StepNumber>3</StepNumber>
                <SmallText>Copy the Consumer Key and Consumer Secret</SmallText>
              </SetupStep>

              <SetupStep>
                <StepNumber>4</StepNumber>
                <SmallText>Complete the OAuth 1.0a three-legged flow to get access tokens</SmallText>
              </SetupStep>
            </SetupSteps>

            <Alert variant="info">
              <Info size={16} />
              OAuth 1.0a is more complex. Consider using a library or online tool to help generate your access tokens.
            </Alert>

            <PortalButton
              href="https://www.tumblr.com/oauth/apps"
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileText size={16} />
              Open Tumblr OAuth Apps
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
            <SmallText style={{ fontWeight: 600, display: 'block' }}>
              Consumer Credentials (from your app):
            </SmallText>
            <CredentialsGrid>
              <Input
                label="Consumer Key"
                type="text"
                value={credentials.consumer_key || ''}
                onChange={(e) => onCredentialsChange({ ...credentials, consumer_key: e.target.value })}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                fullWidth
              />
              <Input
                label="Consumer Secret"
                type="password"
                value={credentials.consumer_secret || ''}
                onChange={(e) => onCredentialsChange({ ...credentials, consumer_secret: e.target.value })}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                fullWidth
              />
            </CredentialsGrid>

            <SmallText style={{ fontWeight: 600, display: 'block' }}>
              Access Tokens (from OAuth flow):
            </SmallText>
            <CredentialsGrid>
              <Input
                label="OAuth Token"
                type="text"
                value={credentials.oauth_token || ''}
                onChange={(e) => onCredentialsChange({ ...credentials, oauth_token: e.target.value })}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                fullWidth
              />
              <Input
                label="OAuth Token Secret"
                type="password"
                value={credentials.oauth_token_secret || ''}
                onChange={(e) => onCredentialsChange({ ...credentials, oauth_token_secret: e.target.value })}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                fullWidth
              />
            </CredentialsGrid>

            {!canConnect && credentials.consumer_key && (
              <Alert variant="warning">
                <AlertTriangle size={16} />
                Please fill in all four credential fields to continue.
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
              background: `linear-gradient(135deg, ${TUMBLR_COLOR}08 0%, #f0f4f8 100%)`,
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
                Your Tumblr blog is configured
              </SmallText>
            </div>

            <div style={{ padding: '0 16px' }}>
              <SmallText style={{ color: '#666' }}>
                <strong>Consumer Key:</strong> {credentials.consumer_key?.slice(0, 8)}••••••
              </SmallText>
              <SmallText style={{ color: '#666' }}>
                <strong>OAuth Tokens:</strong> ✓ Configured
              </SmallText>
            </div>

            <Alert variant="info">
              <Heart size={16} />
              ChirpSyncer can now post to your Tumblr blog and sync content across platforms.
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
      completeButtonText="Connect Tumblr"
      platformColor={TUMBLR_COLOR}
    />
  );
}

export default TumblrConnect;
