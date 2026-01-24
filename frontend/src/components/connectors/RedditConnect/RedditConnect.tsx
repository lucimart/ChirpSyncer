'use client';

import { useMemo, useState } from 'react';
import styled from 'styled-components';
import {
  MessageSquare,
  TrendingUp,
  Users,
  Award,
  CheckCircle,
  ExternalLink,
  AlertCircle,
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
interface RedditConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

type AppType = 'script' | 'web';

// ============ Constants ============
const REDDIT_COLOR = '#FF4500';

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const RedditLogo = styled.div`
  width: 48px;
  height: 48px;
  background: ${REDDIT_COLOR};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 28px;
`;

const AppTypeCard = styled.div<{ $selected?: boolean }>`
  border: 2px solid ${({ $selected }) => $selected ? REDDIT_COLOR : '#e5e7eb'};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing[4]};
  cursor: pointer;
  transition: all 0.2s;
  background: ${({ $selected }) => $selected ? `${REDDIT_COLOR}05` : 'white'};

  &:hover {
    border-color: ${REDDIT_COLOR};
  }
`;

const AppTypeHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const AppTypeName = styled.h4`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

const RecommendedBadge = styled.span`
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  background: ${REDDIT_COLOR};
  color: white;
`;

const AppTypeDescription = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const InstructionCard = styled.div`
  background: linear-gradient(135deg, ${REDDIT_COLOR}08 0%, #fff5f2 100%);
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing[4]};
`;

const StepItem = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[2]} 0;

  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.neutral[200]};
  }
`;

const StepNumber = styled.span`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${REDDIT_COLOR};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
`;

const StepContent = styled.div`
  flex: 1;
`;

const StepTitle = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 2px;
`;

const StepDescription = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};

  code {
    background: ${({ theme }) => theme.colors.neutral[100]};
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 11px;
  }
`;

const PortalButton = styled.a`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background: ${REDDIT_COLOR};
  color: white;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-decoration: none;
  font-weight: 500;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  transition: all 0.2s;

  &:hover {
    background: #e03d00;
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

const KarmaNote = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[3]};
  background: #fef3c7;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: #92400e;

  svg {
    flex-shrink: 0;
  }
`;

// ============ Component ============
export function RedditConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: RedditConnectProps) {
  const [appType, setAppType] = useState<AppType>('script');

  const canConnect = useMemo((): boolean => {
    const hasClientId = !!(credentials.client_id && credentials.client_id.length > 10);
    const hasClientSecret = !!(credentials.client_secret && credentials.client_secret.length > 10);
    const hasRefreshToken = !!(credentials.refresh_token && credentials.refresh_token.length > 10);
    return hasClientId && hasClientSecret && hasRefreshToken;
  }, [credentials]);

  const steps: WizardStep[] = [
    {
      id: 'intro',
      title: 'Welcome',
      content: (
        <PlatformIntro
          logo={<RedditLogo>👽</RedditLogo>}
          name="Reddit"
          tagline="The front page of the internet"
          description="Connect your Reddit account to post content to subreddits, share links, and engage with communities across thousands of topics."
          features={[
            { icon: MessageSquare, label: 'Posts & comments' },
            { icon: TrendingUp, label: 'Trending topics' },
            { icon: Users, label: 'Communities' },
          ]}
          color={REDDIT_COLOR}
          learnMoreUrl="https://www.reddit.com/dev/api"
        />
      ),
      canProceed: true,
    },
    {
      id: 'app-type',
      title: 'App Type',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <SmallText style={{ textAlign: 'center', color: '#666' }}>
              Choose the type of Reddit app to create:
            </SmallText>

            <AppTypeCard $selected={appType === 'script'} onClick={() => setAppType('script')}>
              <AppTypeHeader>
                <AppTypeName>Script App</AppTypeName>
                <RecommendedBadge>Recommended</RecommendedBadge>
              </AppTypeHeader>
              <AppTypeDescription>
                For personal use. Simpler setup, works great for automating your own posts.
                No redirect URL required.
              </AppTypeDescription>
            </AppTypeCard>

            <AppTypeCard $selected={appType === 'web'} onClick={() => setAppType('web')}>
              <AppTypeHeader>
                <AppTypeName>Web App</AppTypeName>
              </AppTypeHeader>
              <AppTypeDescription>
                For applications that will be used by other Reddit users.
                Requires OAuth redirect URL and more complex setup.
              </AppTypeDescription>
            </AppTypeCard>

            <KarmaNote>
              <Award size={18} />
              Your Reddit account needs some karma and age to post in most subreddits.
            </KarmaNote>
          </Stack>
        </StepContainer>
      ),
      canProceed: true,
    },
    {
      id: 'setup',
      title: 'Create App',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <InstructionCard>
              <SmallText style={{ fontWeight: 600, marginBottom: 16, display: 'block' }}>
                Create a {appType === 'script' ? 'Script' : 'Web'} App:
              </SmallText>

              <StepItem>
                <StepNumber>1</StepNumber>
                <StepContent>
                  <StepTitle>Go to Reddit App Preferences</StepTitle>
                  <StepDescription>Scroll to the bottom and click &quot;create an app&quot;</StepDescription>
                </StepContent>
              </StepItem>

              <StepItem>
                <StepNumber>2</StepNumber>
                <StepContent>
                  <StepTitle>Fill in app details</StepTitle>
                  <StepDescription>
                    Name: &quot;ChirpSyncer&quot;, select <code>{appType}</code> type
                  </StepDescription>
                </StepContent>
              </StepItem>

              <StepItem>
                <StepNumber>3</StepNumber>
                <StepContent>
                  <StepTitle>Set redirect URI</StepTitle>
                  <StepDescription>
                    {appType === 'script'
                      ? 'Use: http://localhost:8080'
                      : 'Use your app callback URL'}
                  </StepDescription>
                </StepContent>
              </StepItem>

              <StepItem>
                <StepNumber>4</StepNumber>
                <StepContent>
                  <StepTitle>Copy your credentials</StepTitle>
                  <StepDescription>
                    Client ID (under app name) and Secret (labeled &quot;secret&quot;)
                  </StepDescription>
                </StepContent>
              </StepItem>
            </InstructionCard>

            <PortalButton
              href="https://www.reddit.com/prefs/apps"
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageSquare size={16} />
              Open Reddit App Preferences
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
            <CredentialsGrid>
              <Input
                label="Client ID"
                type="text"
                value={credentials.client_id || ''}
                onChange={(e) => onCredentialsChange({ ...credentials, client_id: e.target.value })}
                placeholder="xxxxxxxxxxxxxx"
                hint="Found under your app name"
                fullWidth
              />
              <Input
                label="Client Secret"
                type="password"
                value={credentials.client_secret || ''}
                onChange={(e) => onCredentialsChange({ ...credentials, client_secret: e.target.value })}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxx"
                hint="Labeled 'secret'"
                fullWidth
              />
            </CredentialsGrid>

            <Input
              label="Refresh Token"
              type="password"
              value={credentials.refresh_token || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, refresh_token: e.target.value })}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              hint="For long-term access without re-authentication"
              fullWidth
            />

            <Alert variant="info">
              <Info size={16} />
              Getting a refresh token requires completing the OAuth flow. There are several online tools that can help generate Reddit OAuth tokens.
            </Alert>

            {credentials.client_id && credentials.client_secret && !credentials.refresh_token && (
              <Alert variant="warning">
                <AlertCircle size={16} />
                Refresh token is required for persistent access. Without it, you&apos;ll need to re-authenticate frequently.
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
              background: `linear-gradient(135deg, ${REDDIT_COLOR}08 0%, #fff5f2 100%)`,
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
                Your Reddit credentials are configured
              </SmallText>
            </div>

            <div style={{ padding: '0 16px' }}>
              <SmallText style={{ color: '#666' }}>
                <strong>Client ID:</strong> {credentials.client_id?.slice(0, 6)}••••••
              </SmallText>
              <SmallText style={{ color: '#666' }}>
                <strong>Client Secret:</strong> ••••••••••••
              </SmallText>
              <SmallText style={{ color: '#666' }}>
                <strong>Refresh Token:</strong> ••••••••••••
              </SmallText>
            </div>

            <Alert variant="info">
              <TrendingUp size={16} />
              ChirpSyncer can now post to subreddits and sync your content across Reddit communities.
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
      completeButtonText="Connect Reddit"
      platformColor={REDDIT_COLOR}
    />
  );
}

export default RedditConnect;
