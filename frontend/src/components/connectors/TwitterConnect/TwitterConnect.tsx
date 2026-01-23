'use client';

import { useState, useMemo } from 'react';
import styled from 'styled-components';
import {
  Twitter,
  DollarSign,
  Eye,
  Edit3,
  Zap,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Lock,
  Key,
} from 'lucide-react';
import {
  ConnectionWizard,
  WizardStep,
  PlatformIntro,
  OAuthGuide,
  Input,
  Stack,
  SmallText,
  Alert,
  SelectableCard,
} from '@/components/ui';

// ============ Types ============
interface TwitterConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

type ConnectionMode = 'api' | 'scraper';

// ============ Constants ============
const TWITTER_COLOR = '#000000';

const API_OAUTH_STEPS = [
  {
    title: 'Go to the Twitter Developer Portal',
    description: 'Log in with your Twitter account and navigate to the Projects & Apps section.',
    tip: 'You\'ll need a Twitter Developer account. Apply at developer.twitter.com if you don\'t have one.',
  },
  {
    title: 'Create a new Project and App',
    description: 'Click "Create Project", give it a name, and create an app within the project.',
  },
  {
    title: 'Generate API Keys',
    description: 'In your app settings, go to "Keys and tokens" and generate your API Key and Secret.',
    tip: 'Save these immediately - you won\'t be able to see the Secret again!',
  },
  {
    title: 'Generate Access Tokens',
    description: 'Below the API keys, click "Generate" for Access Token and Secret.',
    tip: 'Make sure your app has Read and Write permissions before generating.',
  },
];

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const ModeCard = styled(SelectableCard)`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[4]};
`;

const ModeIcon = styled.div<{ $variant: 'api' | 'scraper' }>`
  width: 56px;
  height: 56px;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background: ${({ $variant }) =>
    $variant === 'api'
      ? 'linear-gradient(135deg, #000 0%, #333 100%)'
      : 'linear-gradient(135deg, #666 0%, #888 100%)'};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const ModeContent = styled.div`
  flex: 1;
`;

const ModeTitle = styled.h4`
  margin: 0 0 ${({ theme }) => theme.spacing[1]};
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const ModeDescription = styled.p`
  margin: 0 0 ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const CapabilityList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const CapabilityBadge = styled.span<{ $type: 'can' | 'cannot' }>`
  font-size: 11px;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background: ${({ $type, theme }) =>
    $type === 'can' ? theme.colors.success[100] : theme.colors.neutral[100]};
  color: ${({ $type, theme }) =>
    $type === 'can' ? theme.colors.success[700] : theme.colors.neutral[500]};
`;

const PriceBadge = styled.span<{ $free?: boolean }>`
  font-size: 11px;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background: ${({ $free, theme }) =>
    $free ? theme.colors.success[100] : theme.colors.warning[100]};
  color: ${({ $free, theme }) =>
    $free ? theme.colors.success[700] : theme.colors.warning[700]};
  font-weight: 600;
`;

const CredentialsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[3]};

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

// ============ Component ============
export function TwitterConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: TwitterConnectProps) {
  const [mode, setMode] = useState<ConnectionMode>(
    (credentials._mode as ConnectionMode) || 'api'
  );

  const handleModeChange = (newMode: ConnectionMode) => {
    setMode(newMode);
    onCredentialsChange({ ...credentials, _mode: newMode });
  };

  const canConnectApi = useMemo(() => {
    return !!(
      credentials.api_key &&
      credentials.api_secret &&
      credentials.access_token &&
      credentials.access_secret
    );
  }, [credentials]);

  const canConnectScraper = useMemo(() => {
    return !!(credentials.username && credentials.password);
  }, [credentials]);

  const canConnect = mode === 'api' ? canConnectApi : canConnectScraper;

  const steps: WizardStep[] = [
    {
      id: 'intro',
      title: 'Welcome',
      content: (
        <PlatformIntro
          logo={<Twitter size={36} />}
          name="X (Twitter)"
          tagline="See what's happening in the world"
          description="Connect your X account to sync posts across platforms. Choose between full API access or read-only scraping based on your needs."
          features={[
            { icon: Edit3, label: 'Post & reply' },
            { icon: Eye, label: 'Read timeline' },
            { icon: Zap, label: 'Real-time sync' },
          ]}
          color={TWITTER_COLOR}
        />
      ),
      canProceed: true,
    },
    {
      id: 'mode',
      title: 'Choose Mode',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <div style={{ textAlign: 'center' }}>
              <SmallText style={{ color: '#666' }}>
                X offers two connection methods. Choose based on your needs and budget.
              </SmallText>
            </div>

            <ModeCard selected={mode === 'api'} onClick={() => handleModeChange('api')}>
              <ModeIcon $variant="api">
                <Key size={24} />
              </ModeIcon>
              <ModeContent>
                <ModeTitle>
                  API Keys
                  <PriceBadge>$100+/month</PriceBadge>
                </ModeTitle>
                <ModeDescription>
                  Full read and write access through official X API.
                  Requires a paid X Developer account.
                </ModeDescription>
                <CapabilityList>
                  <CapabilityBadge $type="can">✓ Post</CapabilityBadge>
                  <CapabilityBadge $type="can">✓ Read</CapabilityBadge>
                  <CapabilityBadge $type="can">✓ Like</CapabilityBadge>
                  <CapabilityBadge $type="can">✓ Repost</CapabilityBadge>
                  <CapabilityBadge $type="can">✓ Delete</CapabilityBadge>
                </CapabilityList>
              </ModeContent>
              {mode === 'api' && <CheckCircle size={20} color="#22c55e" />}
            </ModeCard>

            <ModeCard selected={mode === 'scraper'} onClick={() => handleModeChange('scraper')}>
              <ModeIcon $variant="scraper">
                <Eye size={24} />
              </ModeIcon>
              <ModeContent>
                <ModeTitle>
                  Scraper
                  <PriceBadge $free>Free</PriceBadge>
                </ModeTitle>
                <ModeDescription>
                  Read-only access by logging into your account.
                  Perfect for monitoring and archiving.
                </ModeDescription>
                <CapabilityList>
                  <CapabilityBadge $type="can">✓ Read</CapabilityBadge>
                  <CapabilityBadge $type="cannot">✗ Post</CapabilityBadge>
                  <CapabilityBadge $type="cannot">✗ Like</CapabilityBadge>
                  <CapabilityBadge $type="cannot">✗ Repost</CapabilityBadge>
                </CapabilityList>
              </ModeContent>
              {mode === 'scraper' && <CheckCircle size={20} color="#22c55e" />}
            </ModeCard>
          </Stack>
        </StepContainer>
      ),
      canProceed: true,
    },
    {
      id: 'credentials',
      title: mode === 'api' ? 'API Keys' : 'Login',
      content: (
        <StepContainer>
          {mode === 'api' ? (
            <Stack gap={4}>
              <OAuthGuide
                platform="X"
                portalName="X Developer Portal"
                portalUrl="https://developer.twitter.com/en/portal/dashboard"
                steps={API_OAUTH_STEPS}
                warning="X API requires a paid subscription starting at $100/month for Basic access."
                color={TWITTER_COLOR}
              />

              <CredentialsGrid>
                <Input
                  label="API Key"
                  type="text"
                  value={credentials.api_key || ''}
                  onChange={(e) => onCredentialsChange({ ...credentials, api_key: e.target.value })}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxx"
                  fullWidth
                />
                <Input
                  label="API Secret"
                  type="password"
                  value={credentials.api_secret || ''}
                  onChange={(e) => onCredentialsChange({ ...credentials, api_secret: e.target.value })}
                  fullWidth
                />
                <Input
                  label="Access Token"
                  type="text"
                  value={credentials.access_token || ''}
                  onChange={(e) => onCredentialsChange({ ...credentials, access_token: e.target.value })}
                  fullWidth
                />
                <Input
                  label="Access Secret"
                  type="password"
                  value={credentials.access_secret || ''}
                  onChange={(e) => onCredentialsChange({ ...credentials, access_secret: e.target.value })}
                  fullWidth
                />
              </CredentialsGrid>

              <Input
                label="Bearer Token (Optional)"
                type="password"
                value={credentials.bearer_token || ''}
                onChange={(e) => onCredentialsChange({ ...credentials, bearer_token: e.target.value })}
                hint="For faster read operations"
                fullWidth
              />
            </Stack>
          ) : (
            <Stack gap={4}>
              <Alert variant="info">
                <Lock size={16} />
                Scraper mode logs into your X account to read your timeline.
                Your credentials are encrypted and never shared.
              </Alert>

              <Alert variant="warning">
                <AlertTriangle size={16} />
                X may occasionally require verification. Avoid using accounts with
                2FA enabled, or use an app-specific password if available.
              </Alert>

              <Input
                label="Username or Email"
                type="text"
                value={credentials.username || ''}
                onChange={(e) => onCredentialsChange({ ...credentials, username: e.target.value })}
                placeholder="@username or email@example.com"
                fullWidth
              />

              <Input
                label="Password"
                type="password"
                value={credentials.password || ''}
                onChange={(e) => onCredentialsChange({ ...credentials, password: e.target.value })}
                fullWidth
              />
            </Stack>
          )}
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
              background: '#f0f9ff',
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
                {mode === 'api' ? 'API credentials' : 'Login credentials'} configured
              </SmallText>
            </div>

            <div style={{ padding: '0 16px' }}>
              <SmallText style={{ color: '#666' }}>
                <strong>Mode:</strong> {mode === 'api' ? 'API Keys (Full Access)' : 'Scraper (Read-Only)'}
              </SmallText>
              {mode === 'api' ? (
                <SmallText style={{ color: '#666' }}>
                  <strong>Capabilities:</strong> Read, Post, Like, Repost, Delete
                </SmallText>
              ) : (
                <>
                  <SmallText style={{ color: '#666' }}>
                    <strong>Username:</strong> {credentials.username}
                  </SmallText>
                  <SmallText style={{ color: '#666' }}>
                    <strong>Capabilities:</strong> Read only
                  </SmallText>
                </>
              )}
            </div>

            <Alert variant="info">
              {mode === 'api'
                ? 'ChirpSyncer will use the official X API to sync your posts.'
                : 'ChirpSyncer will read your timeline. Posting is not available in scraper mode.'}
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
      completeButtonText={`Connect X (${mode === 'api' ? 'API' : 'Scraper'})`}
      platformColor={TWITTER_COLOR}
    />
  );
}

export default TwitterConnect;
