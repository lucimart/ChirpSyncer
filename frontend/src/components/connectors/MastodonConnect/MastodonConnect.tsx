'use client';

import { useState, useMemo } from 'react';
import styled from 'styled-components';
import { MessageSquare, Globe, Users, Shield, Lock, CheckCircle } from 'lucide-react';
import {
  ConnectionWizard,
  WizardStep,
  PlatformIntro,
  ServerSelector,
  ServerOption,
  Stack,
  SmallText,
  Alert,
} from '@/components/ui';

// ============ Types ============
interface MastodonConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

// ============ Constants ============
const MASTODON_COLOR = '#6364FF';

const POPULAR_INSTANCES: ServerOption[] = [
  {
    url: 'mastodon.social',
    name: 'Mastodon Social',
    description: 'The original server operated by the Mastodon gGmbH non-profit',
    users: 2100000,
    badges: ['official', 'popular'],
  },
  {
    url: 'mastodon.online',
    name: 'Mastodon Online',
    description: 'A newer server operated by the Mastodon gGmbH non-profit',
    users: 210000,
    badges: ['official', 'fast'],
  },
  {
    url: 'mstdn.social',
    name: 'mstdn.social',
    description: 'For enthusiasts of free, open source software',
    users: 450000,
    badges: ['popular'],
  },
  {
    url: 'fosstodon.org',
    name: 'Fosstodon',
    description: 'For people interested in technology, especially FOSS',
    users: 65000,
    badges: ['reliable'],
  },
  {
    url: 'techhub.social',
    name: 'TechHub',
    description: 'A Mastodon instance for the tech community',
    users: 45000,
    badges: ['fast'],
  },
  {
    url: 'hachyderm.io',
    name: 'Hachyderm',
    description: 'A safe space for tech folks, run by the Hachyderm community',
    users: 55000,
    badges: ['reliable'],
  },
  {
    url: 'infosec.exchange',
    name: 'Infosec Exchange',
    description: 'For the information security community',
    users: 75000,
    badges: ['popular'],
  },
  {
    url: 'journa.host',
    name: 'Journa.host',
    description: 'A home for journalists on the fediverse',
    users: 8000,
    badges: ['reliable'],
  },
];

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const SelectedInstanceCard = styled.div`
  background: ${MASTODON_COLOR}10;
  border: 1px solid ${MASTODON_COLOR}30;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing[4]};
  text-align: center;
`;

const InstanceUrl = styled.code`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.lg};
  color: ${MASTODON_COLOR};
  font-weight: 600;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

// ============ Component ============
export function MastodonConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: MastodonConnectProps) {
  const selectedInstance = credentials.instance || '';

  const canConnect = useMemo(() => {
    return !!selectedInstance && selectedInstance.length > 0;
  }, [selectedInstance]);

  const steps: WizardStep[] = [
    {
      id: 'intro',
      title: 'Welcome',
      content: (
        <PlatformIntro
          logo={<MessageSquare size={36} />}
          name="Mastodon"
          tagline="Social networking, back in your hands"
          description="Mastodon is part of the fediverse - a network of interconnected servers. You can follow people on any server, and your posts reach the entire network."
          features={[
            { icon: Globe, label: 'Decentralized' },
            { icon: Users, label: 'Community servers' },
            { icon: Shield, label: 'No algorithms' },
          ]}
          color={MASTODON_COLOR}
          learnMoreUrl="https://joinmastodon.org"
        />
      ),
      canProceed: true,
    },
    {
      id: 'instance',
      title: 'Choose Server',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <div style={{ textAlign: 'center' }}>
              <SmallText style={{ color: '#666' }}>
                Choose your Mastodon server (instance). Each server is run by a different community,
                but they all connect together.
              </SmallText>
            </div>

            <ServerSelector
              servers={POPULAR_INSTANCES}
              value={selectedInstance}
              onChange={(url) => onCredentialsChange({ ...credentials, instance: url })}
              allowCustom
              customPlaceholder="your-server.social"
              searchPlaceholder="Search instances..."
              platformColor={MASTODON_COLOR}
              hint="Don't have an account? Pick a server to create one after connecting."
            />
          </Stack>
        </StepContainer>
      ),
      canProceed: canConnect,
    },
    {
      id: 'confirm',
      title: 'Authorize',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <div style={{ textAlign: 'center' }}>
              <SmallText style={{ color: '#666', marginBottom: 16, display: 'block' }}>
                You&apos;ll be redirected to your Mastodon server to authorize ChirpSyncer.
              </SmallText>
            </div>

            <SelectedInstanceCard>
              <SmallText style={{ color: '#666', marginBottom: 8, display: 'block' }}>
                Selected Server
              </SmallText>
              <InstanceUrl>{selectedInstance}</InstanceUrl>
              <SmallText style={{ color: '#666' }}>
                {POPULAR_INSTANCES.find(i => i.url === selectedInstance)?.description ||
                 'Custom Mastodon instance'}
              </SmallText>
            </SelectedInstanceCard>

            <Alert variant="info">
              <Lock size={16} />
              ChirpSyncer will request permission to read and post on your behalf.
              You can revoke access anytime from your Mastodon settings.
            </Alert>

            <div style={{
              textAlign: 'center',
              padding: '24px',
              background: '#f0f9ff',
              borderRadius: '12px'
            }}>
              <div style={{
                width: 48,
                height: 48,
                background: '#dcfce7',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                color: '#22c55e'
              }}>
                <CheckCircle size={24} />
              </div>
              <SmallText style={{ fontWeight: 500 }}>
                Click &quot;Connect Mastodon&quot; to open the authorization page
              </SmallText>
            </div>
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
      completeButtonText="Connect Mastodon"
      platformColor={MASTODON_COLOR}
    />
  );
}

export default MastodonConnect;
