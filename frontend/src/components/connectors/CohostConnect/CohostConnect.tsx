'use client';

import { useMemo } from 'react';
import styled from 'styled-components';
import {
  Egg,
  Heart,
  Palette,
  Shield,
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
interface CohostConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

// ============ Constants ============
const COHOST_COLOR = '#83254F';

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const CohostLogo = styled.div`
  width: 48px;
  height: 48px;
  background: ${COHOST_COLOR};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
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
  background: ${COHOST_COLOR}08;
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const FeatureIcon = styled.div`
  width: 36px;
  height: 36px;
  background: ${COHOST_COLOR}15;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${COHOST_COLOR};
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
  background: ${COHOST_COLOR};
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
  background: ${COHOST_COLOR};
  color: white;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-decoration: none;
  font-weight: 500;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  transition: all 0.2s;

  &:hover {
    background: #6a1d3f;
  }
`;

const CookieWarning = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[3]};
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: #92400e;
`;

// ============ Component ============
export function CohostConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: CohostConnectProps) {
  const canConnect = useMemo((): boolean => {
    const hasCookie = !!(credentials.session_cookie && credentials.session_cookie.length > 50);
    return hasCookie;
  }, [credentials.session_cookie]);

  const steps: WizardStep[] = [
    {
      id: 'intro',
      title: 'Welcome',
      content: (
        <PlatformIntro
          logo={<CohostLogo>🥚</CohostLogo>}
          name="Cohost"
          tagline="Posting, together"
          description="Connect your Cohost account to share posts on the ad-free, user-focused social platform with rich formatting and CSS support."
          features={[
            { icon: Shield, label: 'Ad-free' },
            { icon: Palette, label: 'CSS posts' },
            { icon: Heart, label: 'Community-owned' },
          ]}
          color={COHOST_COLOR}
          learnMoreUrl="https://cohost.org/"
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
            <FeatureList>
              <FeatureItem>
                <FeatureIcon><Shield size={18} /></FeatureIcon>
                <div>
                  <SmallText style={{ fontWeight: 600, display: 'block' }}>No Ads, No Algorithm</SmallText>
                  <SmallText style={{ color: '#666' }}>Chronological timeline, no tracking</SmallText>
                </div>
              </FeatureItem>
              <FeatureItem>
                <FeatureIcon><Palette size={18} /></FeatureIcon>
                <div>
                  <SmallText style={{ fontWeight: 600, display: 'block' }}>Rich Formatting</SmallText>
                  <SmallText style={{ color: '#666' }}>Full HTML and CSS in posts</SmallText>
                </div>
              </FeatureItem>
              <FeatureItem>
                <FeatureIcon><Heart size={18} /></FeatureIcon>
                <div>
                  <SmallText style={{ fontWeight: 600, display: 'block' }}>Worker-Owned</SmallText>
                  <SmallText style={{ color: '#666' }}>Community-focused platform</SmallText>
                </div>
              </FeatureItem>
            </FeatureList>

            <Alert variant="info">
              <Egg size={16} />
              Cohost supports Markdown, HTML, and even custom CSS in your posts!
            </Alert>
          </Stack>
        </StepContainer>
      ),
      canProceed: true,
    },
    {
      id: 'setup',
      title: 'Session Cookie',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <CookieWarning>
              <Info size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <SmallText style={{ fontWeight: 600, color: '#92400e', display: 'block', marginBottom: 4 }}>
                  Cookie-Based Authentication
                </SmallText>
                <SmallText style={{ color: '#92400e' }}>
                  Cohost doesn&apos;t have a public API, so we use session cookies for authentication.
                  Your cookie will be stored securely and encrypted.
                </SmallText>
              </div>
            </CookieWarning>

            <SetupSteps>
              <SmallText style={{ fontWeight: 600, marginBottom: 16, display: 'block' }}>
                Get your Cohost session cookie:
              </SmallText>

              <SetupStep>
                <StepNumber>1</StepNumber>
                <SmallText>Log in to cohost.org in your browser</SmallText>
              </SetupStep>

              <SetupStep>
                <StepNumber>2</StepNumber>
                <SmallText>Open Developer Tools (F12) → Application tab</SmallText>
              </SetupStep>

              <SetupStep>
                <StepNumber>3</StepNumber>
                <SmallText>Find Cookies → cohost.org in the sidebar</SmallText>
              </SetupStep>

              <SetupStep>
                <StepNumber>4</StepNumber>
                <SmallText>Copy the value of the &quot;connect.sid&quot; cookie</SmallText>
              </SetupStep>
            </SetupSteps>

            <PortalButton
              href="https://cohost.org/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Egg size={16} />
              Open Cohost
              <ExternalLink size={14} />
            </PortalButton>
          </Stack>
        </StepContainer>
      ),
      canProceed: true,
    },
    {
      id: 'cookie',
      title: 'Cookie',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <Input
              label="Session Cookie (connect.sid)"
              type="password"
              value={credentials.session_cookie || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, session_cookie: e.target.value })}
              placeholder="s%3Axxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx..."
              hint="The connect.sid cookie value from your browser"
              fullWidth
            />

            {credentials.session_cookie && !canConnect && (
              <Alert variant="warning">
                <AlertTriangle size={16} />
                Cookie looks too short. Make sure you copied the entire value.
              </Alert>
            )}

            {canConnect && (
              <Alert variant="success">
                <CheckCircle size={16} />
                Cookie format looks valid!
              </Alert>
            )}

            <Alert variant="warning">
              <AlertTriangle size={16} />
              Session cookies expire when you log out of Cohost. You may need to update this periodically.
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
              background: `linear-gradient(135deg, ${COHOST_COLOR}08 0%, #fdf0f5 100%)`,
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
                Your Cohost account is configured
              </SmallText>
            </div>

            <div style={{ padding: '0 16px' }}>
              <SmallText style={{ color: '#666' }}>
                <strong>Session Cookie:</strong> ••••••••••••
              </SmallText>
            </div>

            <Alert variant="info">
              <Egg size={16} />
              ChirpSyncer can now post to your Cohost page.
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
      completeButtonText="Connect Cohost"
      platformColor={COHOST_COLOR}
    />
  );
}

export default CohostConnect;
