'use client';

import { useState, useMemo } from 'react';
import styled from 'styled-components';
import {
  Sparkles,
  Music,
  Palette,
  Globe,
  CheckCircle,
  ExternalLink,
  AlertTriangle,
  Search,
  Heart,
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
interface MisskeyConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

// ============ Constants ============
const MISSKEY_COLOR = '#86B300';

const POPULAR_INSTANCES = [
  { name: 'misskey.io', users: '400K+', description: 'Largest Misskey instance (Japanese)' },
  { name: 'misskey.art', users: '15K+', description: 'For artists and creators' },
  { name: 'firefish.social', users: '10K+', description: 'Firefish flagship' },
  { name: 'calckey.social', users: '8K+', description: 'Calckey instance' },
];

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const MisskeyLogo = styled.div`
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, ${MISSKEY_COLOR} 0%, #69a800 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
`;

const NotePreview = styled.div`
  background: linear-gradient(135deg, ${MISSKEY_COLOR}10 0%, #f0fff0 100%);
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing[4]};
`;

const NoteCard = styled.div`
  background: white;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing[3]};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
`;

const NoteHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const NoteAvatar = styled.div`
  width: 36px;
  height: 36px;
  background: ${MISSKEY_COLOR}30;
  border-radius: 50%;
`;

const ReactionBar = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[2]};
  padding-top: ${({ theme }) => theme.spacing[2]};
  border-top: 1px solid ${({ theme }) => theme.colors.neutral[100]};
`;

const Reaction = styled.span`
  font-size: 14px;
  padding: 2px 8px;
  background: ${({ theme }) => theme.colors.neutral[100]};
  border-radius: 12px;
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.spacing[2]};
`;

const FeatureCard = styled.div`
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${MISSKEY_COLOR}08;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-align: center;
`;

const FeatureIcon = styled.div`
  color: ${MISSKEY_COLOR};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
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
  background: ${({ $selected }) => ($selected ? `${MISSKEY_COLOR}08` : 'white')};
  border: 2px solid ${({ $selected }) => ($selected ? MISSKEY_COLOR : '#e5e7eb')};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  width: 100%;

  &:hover {
    border-color: ${MISSKEY_COLOR};
  }
`;

const InstanceIcon = styled.div`
  width: 40px;
  height: 40px;
  background: ${MISSKEY_COLOR}15;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${MISSKEY_COLOR};
  flex-shrink: 0;
`;

const UserBadge = styled.span`
  background: ${MISSKEY_COLOR}15;
  color: ${MISSKEY_COLOR};
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
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
  background: ${MISSKEY_COLOR};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
`;

// ============ Component ============
export function MisskeyConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: MisskeyConnectProps) {
  const [showCustom, setShowCustom] = useState(false);

  const canConnect = useMemo((): boolean => {
    const hasInstance = !!(credentials.instance && credentials.instance.length > 3);
    const hasToken = !!(credentials.access_token && credentials.access_token.length > 10);
    return hasInstance && hasToken;
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
          logo={<MisskeyLogo><Sparkles size={24} /></MisskeyLogo>}
          name="Misskey / Firefish"
          tagline="Expressive microblogging"
          description="Connect to Misskey, Firefish, or any compatible instance. Enjoy custom reactions, drive storage, and a feature-rich social experience in the fediverse."
          features={[
            { icon: Sparkles, label: 'Reactions' },
            { icon: Music, label: 'MFM markup' },
            { icon: Palette, label: 'Customizable' },
          ]}
          color={MISSKEY_COLOR}
          learnMoreUrl="https://misskey-hub.net/"
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
            <NotePreview>
              <SmallText style={{ fontWeight: 600, marginBottom: 12, display: 'block' }}>
                Notes with Custom Reactions
              </SmallText>
              <NoteCard>
                <NoteHeader>
                  <NoteAvatar />
                  <div>
                    <SmallText style={{ fontWeight: 600 }}>@user</SmallText>
                    <SmallText style={{ color: '#999', fontSize: 11 }}>2m ago</SmallText>
                  </div>
                </NoteHeader>
                <SmallText>✨ Hello fediverse! $[sparkle Misskey is fun!]</SmallText>
                <ReactionBar>
                  <Reaction>❤️ 5</Reaction>
                  <Reaction>🎉 3</Reaction>
                  <Reaction>⭐ 2</Reaction>
                </ReactionBar>
              </NoteCard>
            </NotePreview>

            <FeatureGrid>
              <FeatureCard>
                <FeatureIcon><Sparkles size={20} /></FeatureIcon>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>Custom Reactions</SmallText>
                <SmallText style={{ color: '#666', fontSize: 11 }}>Any emoji</SmallText>
              </FeatureCard>
              <FeatureCard>
                <FeatureIcon><Music size={20} /></FeatureIcon>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>MFM Markup</SmallText>
                <SmallText style={{ color: '#666', fontSize: 11 }}>Animated text</SmallText>
              </FeatureCard>
              <FeatureCard>
                <FeatureIcon><Palette size={20} /></FeatureIcon>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>Themes</SmallText>
                <SmallText style={{ color: '#666', fontSize: 11 }}>Fully custom</SmallText>
              </FeatureCard>
              <FeatureCard>
                <FeatureIcon><Heart size={20} /></FeatureIcon>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>Channels</SmallText>
                <SmallText style={{ color: '#666', fontSize: 11 }}>Topic streams</SmallText>
              </FeatureCard>
            </FeatureGrid>
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
              Select your Misskey/Firefish instance
            </SmallText>

            <InstanceList>
              {POPULAR_INSTANCES.map((inst) => (
                <InstanceCard
                  key={inst.name}
                  $selected={credentials.instance === inst.name}
                  onClick={() => selectInstance(inst.name)}
                >
                  <InstanceIcon><Sparkles size={20} /></InstanceIcon>
                  <div style={{ flex: 1 }}>
                    <SmallText style={{ fontWeight: 600, display: 'block' }}>{inst.name}</SmallText>
                    <SmallText style={{ color: '#666', fontSize: 12 }}>{inst.description}</SmallText>
                  </div>
                  <UserBadge>{inst.users}</UserBadge>
                </InstanceCard>
              ))}
            </InstanceList>

            <button
              onClick={() => setShowCustom(!showCustom)}
              style={{
                background: 'none',
                border: 'none',
                color: MISSKEY_COLOR,
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
                placeholder="misskey.example.com"
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
      id: 'setup',
      title: 'Get Token',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <SetupSteps>
              <SmallText style={{ fontWeight: 600, marginBottom: 16, display: 'block' }}>
                Create an access token:
              </SmallText>

              <SetupStep>
                <StepNumber>1</StepNumber>
                <SmallText>Go to your instance settings</SmallText>
              </SetupStep>
              <SetupStep>
                <StepNumber>2</StepNumber>
                <SmallText>Navigate to API → Access tokens</SmallText>
              </SetupStep>
              <SetupStep>
                <StepNumber>3</StepNumber>
                <SmallText>Create new token with &quot;Write notes&quot; permission</SmallText>
              </SetupStep>
              <SetupStep>
                <StepNumber>4</StepNumber>
                <SmallText>Copy the generated token</SmallText>
              </SetupStep>
            </SetupSteps>

            <a
              href={credentials.instance ? `https://${credentials.instance}/settings/api` : 'https://misskey-hub.net/'}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 16px',
                background: MISSKEY_COLOR,
                color: 'white',
                borderRadius: 8,
                textDecoration: 'none',
                fontWeight: 500,
                fontSize: 14,
              }}
            >
              <Globe size={16} />
              Open Instance Settings
              <ExternalLink size={14} />
            </a>
          </Stack>
        </StepContainer>
      ),
      canProceed: true,
    },
    {
      id: 'credentials',
      title: 'Token',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <Input
              label="Access Token"
              type="password"
              value={credentials.access_token || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, access_token: e.target.value })}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              hint="Your Misskey/Firefish access token"
              fullWidth
            />

            {credentials.access_token && !canConnect && (
              <Alert variant="warning">
                <AlertTriangle size={16} />
                Token seems too short.
              </Alert>
            )}

            {canConnect && (
              <Alert variant="success">
                <CheckCircle size={16} />
                Ready to connect!
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
              background: `linear-gradient(135deg, ${MISSKEY_COLOR}08 0%, #f0fff0 100%)`,
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
                Your Misskey account is configured
              </SmallText>
            </div>

            <div style={{ padding: '0 16px' }}>
              <SmallText style={{ color: '#666' }}>
                <strong>Instance:</strong> {credentials.instance}
              </SmallText>
            </div>

            <Alert variant="info">
              <Sparkles size={16} />
              ChirpSyncer can now post notes to your Misskey account.
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
      completeButtonText="Connect Misskey"
      platformColor={MISSKEY_COLOR}
    />
  );
}

export default MisskeyConnect;
