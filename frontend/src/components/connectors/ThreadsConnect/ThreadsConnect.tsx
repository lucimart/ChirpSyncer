'use client';

import { useMemo } from 'react';
import styled from 'styled-components';
import {
  AtSign,
  Zap,
  Users,
  Link2,
  CheckCircle,
  ExternalLink,
  AlertTriangle,
  Instagram,
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
interface ThreadsConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

// ============ Constants ============
const THREADS_COLOR = '#000000';

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const ThreadsLogo = styled.div`
  width: 48px;
  height: 48px;
  background: ${THREADS_COLOR};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 28px;
  font-weight: bold;
`;

const MetaEcosystemCard = styled.div`
  background: linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%);
  padding: 2px;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
`;

const MetaEcosystemInner = styled.div`
  background: white;
  border-radius: ${({ theme }) => `calc(${theme.borderRadius.lg} - 2px)`};
  padding: ${({ theme }) => theme.spacing[4]};
`;

const ConnectionFlow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]} 0;
`;

const FlowIcon = styled.div<{ $active?: boolean }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $active }) => $active ? 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)' : '#f3f4f6'};
  color: ${({ $active }) => $active ? 'white' : '#9ca3af'};
`;

const FlowArrow = styled.div`
  color: #d1d5db;
  font-size: 24px;
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
  background: ${THREADS_COLOR};
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
  background: ${THREADS_COLOR};
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

const ScopeChip = styled.code`
  display: inline-block;
  font-size: 11px;
  padding: 4px 8px;
  background: ${THREADS_COLOR}10;
  color: ${THREADS_COLOR};
  border-radius: 4px;
  margin: 2px;
`;

// ============ Component ============
export function ThreadsConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: ThreadsConnectProps) {
  const canConnect = useMemo(() => {
    return !!(credentials.access_token && credentials.access_token.length > 30);
  }, [credentials.access_token]);

  const steps: WizardStep[] = [
    {
      id: 'intro',
      title: 'Welcome',
      content: (
        <PlatformIntro
          logo={<ThreadsLogo>@</ThreadsLogo>}
          name="Threads"
          tagline="Where ideas meet"
          description="Connect your Threads account to share text-based content, engage in conversations, and sync posts with Meta's text-focused social platform."
          features={[
            { icon: AtSign, label: 'Text posts' },
            { icon: Link2, label: 'Instagram linked' },
            { icon: Users, label: '200M+ users' },
          ]}
          color={THREADS_COLOR}
          learnMoreUrl="https://developers.facebook.com/docs/threads"
        />
      ),
      canProceed: true,
    },
    {
      id: 'instagram-link',
      title: 'Instagram Link',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <MetaEcosystemCard>
              <MetaEcosystemInner>
                <SmallText style={{ fontWeight: 600, marginBottom: 8, display: 'block', textAlign: 'center' }}>
                  Threads is connected through Instagram
                </SmallText>

                <ConnectionFlow>
                  <FlowIcon $active>
                    <Instagram size={24} />
                  </FlowIcon>
                  <FlowArrow>→</FlowArrow>
                  <FlowIcon $active>
                    <AtSign size={24} />
                  </FlowIcon>
                </ConnectionFlow>

                <SmallText style={{ color: '#666', textAlign: 'center' }}>
                  Your Threads account is linked to your Instagram account.
                  API access goes through Meta&apos;s developer platform.
                </SmallText>
              </MetaEcosystemInner>
            </MetaEcosystemCard>

            <Alert variant="info">
              <Zap size={16} />
              You&apos;ll need a professional Instagram account (Business or Creator) to use the Threads API.
            </Alert>
          </Stack>
        </StepContainer>
      ),
      canProceed: true,
    },
    {
      id: 'setup',
      title: 'API Setup',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <SetupSteps>
              <SmallText style={{ fontWeight: 600, marginBottom: 12, display: 'block' }}>
                Enable Threads API access:
              </SmallText>

              <SetupStep>
                <StepNumber>1</StepNumber>
                <SmallText>Go to Meta for Developers and create/select your app</SmallText>
              </SetupStep>

              <SetupStep>
                <StepNumber>2</StepNumber>
                <SmallText>In &quot;Add Products&quot;, find and enable the Threads API</SmallText>
              </SetupStep>

              <SetupStep>
                <StepNumber>3</StepNumber>
                <SmallText>Configure OAuth redirect URLs in Settings</SmallText>
              </SetupStep>

              <SetupStep>
                <StepNumber>4</StepNumber>
                <SmallText>Complete the OAuth flow to get your access token</SmallText>
              </SetupStep>
            </SetupSteps>

            <div>
              <SmallText style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>
                Required Permissions:
              </SmallText>
              <div>
                <ScopeChip>threads_basic</ScopeChip>
                <ScopeChip>threads_content_publish</ScopeChip>
                <ScopeChip>threads_manage_insights</ScopeChip>
              </div>
            </div>

            <PortalButton
              href="https://developers.facebook.com/apps"
              target="_blank"
              rel="noopener noreferrer"
            >
              <AtSign size={16} />
              Open Meta Developer Portal
              <ExternalLink size={14} />
            </PortalButton>
          </Stack>
        </StepContainer>
      ),
      canProceed: true,
    },
    {
      id: 'token',
      title: 'Access Token',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <Input
              label="Threads Access Token"
              type="password"
              value={credentials.access_token || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, access_token: e.target.value })}
              placeholder="THQWxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              hint="OAuth access token from the Threads API"
              fullWidth
            />

            {credentials.access_token && !canConnect && (
              <Alert variant="warning">
                <AlertTriangle size={16} />
                Token looks too short. Threads tokens are usually longer.
              </Alert>
            )}

            {canConnect && (
              <Alert variant="success">
                <CheckCircle size={16} />
                Token format looks valid!
              </Alert>
            )}

            <Alert variant="info">
              <Zap size={16} />
              Threads access tokens expire. Make sure to implement token refresh in your app settings.
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
              background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
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
                Your Threads account is configured
              </SmallText>
            </div>

            <div style={{ padding: '0 16px' }}>
              <SmallText style={{ color: '#666' }}>
                <strong>Access Token:</strong> ••••••••••••
              </SmallText>
            </div>

            <Alert variant="info">
              <AtSign size={16} />
              ChirpSyncer can now post to Threads and sync your text content across platforms.
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
      completeButtonText="Connect Threads"
      platformColor={THREADS_COLOR}
    />
  );
}

export default ThreadsConnect;
