'use client';

import { useState, useMemo } from 'react';
import styled from 'styled-components';
import { Hash, Globe, Shield, Lock, Users, ExternalLink, CheckCircle, Info } from 'lucide-react';
import {
  ConnectionWizard,
  WizardStep,
  PlatformIntro,
  ServerSelector,
  ServerOption,
  Input,
  Stack,
  SmallText,
  Alert,
} from '@/components/ui';

// ============ Types ============
interface MatrixConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

// ============ Constants ============
const MATRIX_COLOR = '#0DBD8B';

const POPULAR_HOMESERVERS: ServerOption[] = [
  {
    url: 'https://matrix.org',
    name: 'Matrix.org',
    description: 'The flagship server run by the Matrix.org Foundation',
    users: 28000000,
    badges: ['official', 'popular'],
  },
  {
    url: 'https://matrix.im',
    name: 'Matrix.im',
    description: 'Alternative Matrix.org server',
    users: 500000,
    badges: ['fast'],
  },
  {
    url: 'https://envs.net',
    name: 'envs.net',
    description: 'Community homeserver with good uptime',
    users: 15000,
    badges: ['reliable'],
  },
  {
    url: 'https://nitro.chat',
    name: 'Nitro Chat',
    description: 'Fast, privacy-focused homeserver',
    users: 10000,
    badges: ['fast'],
  },
  {
    url: 'https://tchncs.de',
    name: 'tchncs.de',
    description: 'German community server with strong privacy',
    users: 25000,
    badges: ['reliable'],
    region: 'Europe',
  },
];

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const InstructionsCard = styled.div`
  background: ${({ theme }) => theme.colors.neutral[50]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing[4]};
  margin: ${({ theme }) => theme.spacing[3]} 0;
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
  background: ${MATRIX_COLOR}20;
  color: ${MATRIX_COLOR};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
`;

const SelectedServerCard = styled.div`
  background: ${MATRIX_COLOR}10;
  border: 1px solid ${MATRIX_COLOR}30;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const ServerUrl = styled.code`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${MATRIX_COLOR};
  font-weight: 500;
`;

// ============ Component ============
export function MatrixConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: MatrixConnectProps) {
  const selectedHomeserver = credentials.homeserver || '';
  const accessToken = credentials.access_token || '';

  const canProceedToToken = useMemo(() => {
    return !!selectedHomeserver;
  }, [selectedHomeserver]);

  const canConnect = useMemo(() => {
    return !!selectedHomeserver && !!accessToken && accessToken.length > 10;
  }, [selectedHomeserver, accessToken]);

  const steps: WizardStep[] = [
    {
      id: 'intro',
      title: 'Welcome',
      content: (
        <PlatformIntro
          logo={<Hash size={36} />}
          name="Matrix"
          tagline="Open, decentralized communication"
          description="Matrix is an open network for secure, decentralized communication. Connect with anyone on any Matrix homeserver through a unified protocol."
          features={[
            { icon: Globe, label: 'Federated' },
            { icon: Shield, label: 'End-to-end encrypted' },
            { icon: Users, label: 'Bridged to other networks' },
          ]}
          color={MATRIX_COLOR}
          learnMoreUrl="https://matrix.org"
        />
      ),
      canProceed: true,
    },
    {
      id: 'homeserver',
      title: 'Homeserver',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <div style={{ textAlign: 'center' }}>
              <SmallText style={{ color: '#666' }}>
                Select your Matrix homeserver. This is where your account lives.
              </SmallText>
            </div>

            <ServerSelector
              servers={POPULAR_HOMESERVERS}
              value={selectedHomeserver}
              onChange={(url) => onCredentialsChange({ ...credentials, homeserver: url })}
              allowCustom
              customPlaceholder="https://your-homeserver.com"
              searchPlaceholder="Search homeservers..."
              platformColor={MATRIX_COLOR}
              hint="Most users are on matrix.org, but you can use any homeserver."
            />
          </Stack>
        </StepContainer>
      ),
      canProceed: canProceedToToken,
    },
    {
      id: 'token',
      title: 'Access Token',
      content: (
        <StepContainer>
          <Stack gap={4}>
            {selectedHomeserver && (
              <SelectedServerCard>
                <SmallText style={{ color: '#666', marginBottom: 4, display: 'block' }}>
                  Homeserver
                </SmallText>
                <ServerUrl>{selectedHomeserver}</ServerUrl>
              </SelectedServerCard>
            )}

            <Alert variant="info">
              <Lock size={16} />
              Access tokens let apps access your Matrix account without your password.
              You can create one from your Matrix client.
            </Alert>

            <InstructionsCard>
              <SmallText style={{ fontWeight: 600, marginBottom: 12, display: 'block' }}>
                How to get your Access Token from Element:
              </SmallText>
              <InstructionStep>
                <StepNumber>1</StepNumber>
                <SmallText>Open Element (web or desktop)</SmallText>
              </InstructionStep>
              <InstructionStep>
                <StepNumber>2</StepNumber>
                <SmallText>Go to Settings → Help & About</SmallText>
              </InstructionStep>
              <InstructionStep>
                <StepNumber>3</StepNumber>
                <SmallText>Scroll down to &quot;Advanced&quot;</SmallText>
              </InstructionStep>
              <InstructionStep>
                <StepNumber>4</StepNumber>
                <SmallText>Click &quot;Access Token&quot; to reveal it</SmallText>
              </InstructionStep>
              <InstructionStep>
                <StepNumber>5</StepNumber>
                <SmallText>Copy and paste it below</SmallText>
              </InstructionStep>
            </InstructionsCard>

            <Input
              label="Access Token"
              type="password"
              value={accessToken}
              onChange={(e) => onCredentialsChange({ ...credentials, access_token: e.target.value })}
              placeholder="syt_xxxxxxxxxxxxxxxxxxxxx"
              hint="Starts with 'syt_' for synapse tokens"
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
                Your Matrix credentials are configured
              </SmallText>
            </div>

            <div style={{ padding: '0 16px' }}>
              <SmallText style={{ color: '#666' }}>
                <strong>Homeserver:</strong> {selectedHomeserver}
              </SmallText>
              <SmallText style={{ color: '#666' }}>
                <strong>Access Token:</strong> ••••••••••••
              </SmallText>
            </div>

            <Alert variant="info">
              <Info size={16} />
              ChirpSyncer can sync messages to Matrix rooms you specify in the sync configuration.
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
      completeButtonText="Connect Matrix"
      platformColor={MATRIX_COLOR}
    />
  );
}

export default MatrixConnect;
