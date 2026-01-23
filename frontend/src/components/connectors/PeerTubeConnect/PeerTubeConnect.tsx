'use client';

import { useState, useMemo } from 'react';
import styled from 'styled-components';
import {
  PlayCircle,
  Globe,
  Shield,
  Users,
  CheckCircle,
  ExternalLink,
  AlertTriangle,
  Search,
  Video,
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
interface PeerTubeConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

// ============ Constants ============
const PEERTUBE_COLOR = '#F1680D';

const POPULAR_INSTANCES = [
  { name: 'framatube.org', description: 'Framasoft flagship instance' },
  { name: 'peertube.tv', description: 'General purpose' },
  { name: 'tilvids.com', description: 'Tech and educational' },
  { name: 'video.blender.org', description: 'Blender official videos' },
];

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const PeerTubeLogo = styled.div`
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, ${PEERTUBE_COLOR} 0%, #ff8534 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
`;

const VideoPreview = styled.div`
  background: #000;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  overflow: hidden;
  aspect-ratio: 16/9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  position: relative;
`;

const PlayButton = styled.div`
  width: 64px;
  height: 64px;
  background: ${PEERTUBE_COLOR};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const VideoInfo = styled.div`
  padding: ${({ theme }) => theme.spacing[3]};
  background: white;
  border: 1px solid ${({ theme }) => theme.colors.neutral[200]};
  border-top: none;
  border-radius: 0 0 ${({ theme }) => theme.borderRadius.lg} ${({ theme }) => theme.borderRadius.lg};
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
  background: ${PEERTUBE_COLOR}08;
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const FeatureIcon = styled.div`
  width: 36px;
  height: 36px;
  background: ${PEERTUBE_COLOR}15;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${PEERTUBE_COLOR};
  flex-shrink: 0;
`;

const InstanceList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const InstanceCard = styled.button<{ $selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ $selected }) => ($selected ? `${PEERTUBE_COLOR}08` : 'white')};
  border: 2px solid ${({ $selected }) => ($selected ? PEERTUBE_COLOR : '#e5e7eb')};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  width: 100%;

  &:hover {
    border-color: ${PEERTUBE_COLOR};
  }
`;

const InstanceIcon = styled.div`
  width: 40px;
  height: 40px;
  background: ${PEERTUBE_COLOR}15;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${PEERTUBE_COLOR};
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
  background: ${PEERTUBE_COLOR};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
`;

// ============ Component ============
export function PeerTubeConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: PeerTubeConnectProps) {
  const [showCustom, setShowCustom] = useState(false);

  const canConnect = useMemo((): boolean => {
    const hasInstance = !!(credentials.instance && credentials.instance.length > 3);
    const hasUsername = !!(credentials.username && credentials.username.length > 1);
    const hasPassword = !!(credentials.password && credentials.password.length > 3);
    return hasInstance && hasUsername && hasPassword;
  }, [credentials]);

  const selectInstance = (instance: string) => {
    onCredentialsChange({ ...credentials, instance });
    setShowCustom(false);
  };

  const steps: WizardStep[] = [
    {
      id: 'intro',
      title: 'Welcome',
      content: (
        <PlatformIntro
          logo={<PeerTubeLogo><PlayCircle size={24} /></PeerTubeLogo>}
          name="PeerTube"
          tagline="Decentralized video platform"
          description="Connect to PeerTube, the federated video platform. Upload videos to your channel and reach audiences across the fediverse without corporate control."
          features={[
            { icon: Globe, label: 'Federated' },
            { icon: Shield, label: 'No tracking' },
            { icon: Users, label: 'P2P streaming' },
          ]}
          color={PEERTUBE_COLOR}
          learnMoreUrl="https://joinpeertube.org/"
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
            <div>
              <VideoPreview>
                <PlayButton>
                  <PlayCircle size={32} />
                </PlayButton>
              </VideoPreview>
              <VideoInfo>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>Your video title</SmallText>
                <SmallText style={{ color: '#666' }}>123 views • 2 hours ago</SmallText>
              </VideoInfo>
            </div>

            <FeatureList>
              <FeatureItem>
                <FeatureIcon><Globe size={18} /></FeatureIcon>
                <div>
                  <SmallText style={{ fontWeight: 600, display: 'block' }}>Federated</SmallText>
                  <SmallText style={{ color: '#666' }}>Videos visible across instances</SmallText>
                </div>
              </FeatureItem>
              <FeatureItem>
                <FeatureIcon><Users size={18} /></FeatureIcon>
                <div>
                  <SmallText style={{ fontWeight: 600, display: 'block' }}>P2P Streaming</SmallText>
                  <SmallText style={{ color: '#666' }}>WebTorrent for efficient delivery</SmallText>
                </div>
              </FeatureItem>
              <FeatureItem>
                <FeatureIcon><Video size={18} /></FeatureIcon>
                <div>
                  <SmallText style={{ fontWeight: 600, display: 'block' }}>Live Streaming</SmallText>
                  <SmallText style={{ color: '#666' }}>RTMP live broadcast support</SmallText>
                </div>
              </FeatureItem>
            </FeatureList>
          </Stack>
        </StepContainer>
      ),
      canProceed: true,
    },
    {
      id: 'instance',
      title: 'Choose Instance',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <SmallText style={{ textAlign: 'center', color: '#666' }}>
              Select your PeerTube instance
            </SmallText>

            <InstanceList>
              {POPULAR_INSTANCES.map((inst) => (
                <InstanceCard
                  key={inst.name}
                  $selected={credentials.instance === inst.name}
                  onClick={() => selectInstance(inst.name)}
                >
                  <InstanceIcon><PlayCircle size={20} /></InstanceIcon>
                  <div style={{ flex: 1 }}>
                    <SmallText style={{ fontWeight: 600, display: 'block' }}>{inst.name}</SmallText>
                    <SmallText style={{ color: '#666', fontSize: 12 }}>{inst.description}</SmallText>
                  </div>
                </InstanceCard>
              ))}
            </InstanceList>

            <button
              onClick={() => setShowCustom(!showCustom)}
              style={{
                background: 'none',
                border: 'none',
                color: PEERTUBE_COLOR,
                cursor: 'pointer',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <Search size={14} />
              {showCustom ? 'Hide custom' : 'Use different instance'}
            </button>

            {showCustom && (
              <Input
                label="Custom Instance"
                type="text"
                value={credentials.instance || ''}
                onChange={(e) => onCredentialsChange({ ...credentials, instance: e.target.value })}
                placeholder="peertube.example.com"
                hint="Enter the domain without https://"
                fullWidth
              />
            )}

            {credentials.instance && (
              <Alert variant="success">
                <CheckCircle size={16} />
                Selected: {credentials.instance}
              </Alert>
            )}
          </Stack>
        </StepContainer>
      ),
      canProceed: !!(credentials.instance && credentials.instance.length > 3),
    },
    {
      id: 'credentials',
      title: 'Login',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <SetupSteps>
              <SmallText style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>
                PeerTube uses OAuth for API access
              </SmallText>
              <SmallText style={{ color: '#666' }}>
                Enter your account credentials. ChirpSyncer will securely request API access.
              </SmallText>
            </SetupSteps>

            <Input
              label="Username"
              type="text"
              value={credentials.username || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, username: e.target.value })}
              placeholder="your_username"
              hint="Your PeerTube username"
              fullWidth
            />

            <Input
              label="Password"
              type="password"
              value={credentials.password || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, password: e.target.value })}
              hint="Your password is encrypted and used only for OAuth"
              fullWidth
            />

            <Input
              label="Channel Name (optional)"
              type="text"
              value={credentials.channel || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, channel: e.target.value })}
              placeholder="my_channel"
              hint="Specific channel to upload to (default: your main channel)"
              fullWidth
            />

            {credentials.username && credentials.password && !canConnect && (
              <Alert variant="warning">
                <AlertTriangle size={16} />
                Please fill in all required fields.
              </Alert>
            )}

            {canConnect && (
              <Alert variant="success">
                <CheckCircle size={16} />
                Ready to connect!
              </Alert>
            )}

            <a
              href={credentials.instance ? `https://${credentials.instance}` : 'https://joinpeertube.org/instances'}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                color: PEERTUBE_COLOR,
                fontSize: 13,
                textDecoration: 'none',
              }}
            >
              Don&apos;t have an account? Sign up
              <ExternalLink size={12} />
            </a>
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
              background: `linear-gradient(135deg, ${PEERTUBE_COLOR}08 0%, #fff5f0 100%)`,
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
                Your PeerTube account is configured
              </SmallText>
            </div>

            <div style={{ padding: '0 16px' }}>
              <SmallText style={{ color: '#666' }}>
                <strong>Instance:</strong> {credentials.instance}
              </SmallText>
              <SmallText style={{ color: '#666' }}>
                <strong>User:</strong> @{credentials.username}
              </SmallText>
            </div>

            <Alert variant="info">
              <PlayCircle size={16} />
              ChirpSyncer can now upload videos to your PeerTube channel.
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
      completeButtonText="Connect PeerTube"
      platformColor={PEERTUBE_COLOR}
    />
  );
}

export default PeerTubeConnect;
