'use client';

import { useState, useMemo } from 'react';
import styled from 'styled-components';
import { Cloud, Shield, Users, Lock, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
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
interface BlueskyConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

// ============ Constants ============
const BLUESKY_COLOR = '#0085ff';

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const InstructionsCard = styled.div`
  background: ${({ theme }) => theme.colors.neutral[50]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing[4]};
  margin: ${({ theme }) => theme.spacing[4]} 0;
`;

const InstructionStep = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};

  &:last-child {
    margin-bottom: 0;
  }
`;

const StepNumber = styled.span`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${BLUESKY_COLOR}20;
  color: ${BLUESKY_COLOR};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
`;

const PortalLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${BLUESKY_COLOR}10;
  border: 1px solid ${BLUESKY_COLOR}30;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${BLUESKY_COLOR};
  text-decoration: none;
  font-weight: 500;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin: ${({ theme }) => theme.spacing[3]} 0;
  transition: all 0.2s;

  &:hover {
    background: ${BLUESKY_COLOR}20;
  }
`;

const ValidationMessage = styled.div<{ $valid: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  background: ${({ $valid, theme }) =>
    $valid ? theme.colors.success[50] : theme.colors.danger[50]};
  color: ${({ $valid, theme }) =>
    $valid ? theme.colors.success[700] : theme.colors.danger[700]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-top: ${({ theme }) => theme.spacing[2]};
`;

// ============ Component ============
export function BlueskyConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: BlueskyConnectProps) {
  const [handleValidation, setHandleValidation] = useState<{ valid: boolean; message: string } | null>(null);

  const validateHandle = (handle: string) => {
    if (!handle) {
      setHandleValidation(null);
      return;
    }

    // Remove @ if present
    const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;

    // Check if it's a valid handle format
    if (cleanHandle.includes('.')) {
      setHandleValidation({ valid: true, message: 'Valid handle format' });
    } else if (/^[a-zA-Z0-9_]+$/.test(cleanHandle)) {
      setHandleValidation({ valid: true, message: `Will use ${cleanHandle}.bsky.social` });
      onCredentialsChange({ ...credentials, handle: `${cleanHandle}.bsky.social` });
      return;
    } else {
      setHandleValidation({ valid: false, message: 'Invalid handle format' });
    }

    onCredentialsChange({ ...credentials, handle: cleanHandle });
  };

  const canProceedToCredentials = useMemo(() => {
    return !!credentials.handle && handleValidation?.valid;
  }, [credentials.handle, handleValidation]);

  const canConnect = useMemo(() => {
    return !!credentials.handle && !!credentials.app_password && credentials.app_password.length >= 10;
  }, [credentials.handle, credentials.app_password]);

  const steps: WizardStep[] = [
    {
      id: 'intro',
      title: 'Welcome',
      content: (
        <PlatformIntro
          logo={<Cloud size={36} />}
          name="Bluesky"
          tagline="The decentralized social network"
          description="Bluesky is built on the AT Protocol, giving you control over your social identity. Your data is portable and you can move between providers freely."
          features={[
            { icon: Users, label: 'Open network' },
            { icon: Shield, label: 'You own your data' },
            { icon: Cloud, label: 'Portable identity' },
          ]}
          color={BLUESKY_COLOR}
          learnMoreUrl="https://bsky.app/about"
        />
      ),
      canProceed: true,
    },
    {
      id: 'handle',
      title: 'Your Handle',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <div style={{ textAlign: 'center' }}>
              <SmallText style={{ color: '#666' }}>
                Enter your Bluesky handle. This is your username on the network.
              </SmallText>
            </div>

            <Input
              label="Bluesky Handle"
              type="text"
              value={credentials.handle || ''}
              onChange={(e) => validateHandle(e.target.value)}
              placeholder="username.bsky.social"
              hint="Your full handle or just your username"
              fullWidth
            />

            {handleValidation && (
              <ValidationMessage $valid={handleValidation.valid}>
                {handleValidation.valid ? (
                  <CheckCircle size={16} />
                ) : (
                  <AlertCircle size={16} />
                )}
                {handleValidation.message}
              </ValidationMessage>
            )}
          </Stack>
        </StepContainer>
      ),
      canProceed: canProceedToCredentials,
    },
    {
      id: 'app-password',
      title: 'App Password',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <Alert variant="info">
              <Lock size={16} />
              App Passwords are special passwords that let apps access your account without exposing your main password. You can revoke them anytime.
            </Alert>

            <InstructionsCard>
              <SmallText style={{ fontWeight: 600, marginBottom: 12, display: 'block' }}>
                How to create an App Password:
              </SmallText>
              <InstructionStep>
                <StepNumber>1</StepNumber>
                <SmallText>Go to Bluesky Settings → App Passwords</SmallText>
              </InstructionStep>
              <InstructionStep>
                <StepNumber>2</StepNumber>
                <SmallText>Click &quot;Add App Password&quot;</SmallText>
              </InstructionStep>
              <InstructionStep>
                <StepNumber>3</StepNumber>
                <SmallText>Name it &quot;ChirpSyncer&quot; and click &quot;Create&quot;</SmallText>
              </InstructionStep>
              <InstructionStep>
                <StepNumber>4</StepNumber>
                <SmallText>Copy the generated password and paste it below</SmallText>
              </InstructionStep>
            </InstructionsCard>

            <PortalLink
              href="https://bsky.app/settings/app-passwords"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Bluesky App Passwords
              <ExternalLink size={16} />
            </PortalLink>

            <Input
              label="App Password"
              type="password"
              value={credentials.app_password || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, app_password: e.target.value })}
              placeholder="xxxx-xxxx-xxxx-xxxx"
              hint="The app password you just created"
              fullWidth
            />
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
                Your Bluesky credentials are configured
              </SmallText>
            </div>

            <div style={{ padding: '0 16px' }}>
              <SmallText style={{ color: '#666' }}>
                <strong>Handle:</strong> @{credentials.handle}
              </SmallText>
              <SmallText style={{ color: '#666' }}>
                <strong>App Password:</strong> ••••••••••••
              </SmallText>
            </div>

            <Alert variant="info">
              Once connected, ChirpSyncer can sync your posts between Bluesky and other platforms.
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
      completeButtonText="Connect Bluesky"
      platformColor={BLUESKY_COLOR}
    />
  );
}

export default BlueskyConnect;
