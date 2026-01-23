'use client';

import { useState, useMemo } from 'react';
import styled from 'styled-components';
import {
  Camera,
  Globe,
  Heart,
  Shield,
  CheckCircle,
  ExternalLink,
  AlertTriangle,
  Search,
  Grid,
  Bookmark,
  MessageCircle,
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
interface PixelfedConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

// ============ Constants ============
const PIXELFED_COLOR = '#FF5E5E';

const POPULAR_INSTANCES = [
  { name: 'pixelfed.social', users: '90K+', description: 'Main flagship instance' },
  { name: 'pixel.tchncs.de', users: '15K+', description: 'German hosted' },
  { name: 'pixelfed.de', users: '10K+', description: 'Germany focused' },
  { name: 'pxlfd.me', users: '5K+', description: 'General purpose' },
  { name: 'pixelfed.uno', users: '8K+', description: 'Spanish community' },
];

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const PixelfedLogo = styled.div`
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, ${PIXELFED_COLOR} 0%, #ff8585 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
`;

const PhotoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  overflow: hidden;
`;

const PhotoCell = styled.div<{ $color: string }>`
  aspect-ratio: 1;
  background: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
`;

const FeatureRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${PIXELFED_COLOR}08;
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const FeatureIcon = styled.div`
  width: 40px;
  height: 40px;
  background: ${PIXELFED_COLOR}15;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${PIXELFED_COLOR};
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
  background: ${({ $selected }) => ($selected ? `${PIXELFED_COLOR}08` : 'white')};
  border: 2px solid ${({ $selected }) => ($selected ? PIXELFED_COLOR : '#e5e7eb')};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  width: 100%;

  &:hover {
    border-color: ${PIXELFED_COLOR};
  }
`;

const InstanceIcon = styled.div`
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, ${PIXELFED_COLOR}20 0%, #fecaca 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${PIXELFED_COLOR};
  flex-shrink: 0;
`;

const UserBadge = styled.span`
  background: ${PIXELFED_COLOR}15;
  color: ${PIXELFED_COLOR};
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
`;

const ProfilePreview = styled.div`
  background: white;
  border: 1px solid ${({ theme }) => theme.colors.neutral[200]};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  overflow: hidden;
`;

const ProfileHeader = styled.div`
  background: linear-gradient(135deg, ${PIXELFED_COLOR}15 0%, #fff0f0 100%);
  padding: ${({ theme }) => theme.spacing[4]};
  text-align: center;
`;

const ProfileAvatar = styled.div`
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, ${PIXELFED_COLOR} 0%, #ff8585 100%);
  border-radius: 50%;
  border: 3px solid white;
  margin: 0 auto ${({ theme }) => theme.spacing[2]};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 28px;
`;

const ProfileStats = styled.div`
  display: flex;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[3]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral[100]};
`;

const StatItem = styled.div`
  text-align: center;
`;

const ActionBar = styled.div`
  display: flex;
  justify-content: space-around;
  padding: ${({ theme }) => theme.spacing[2]};
  background: ${({ theme }) => theme.colors.neutral[50]};
`;

const ActionIcon = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.neutral[500]};
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  transition: all 0.2s;

  &:hover {
    color: ${PIXELFED_COLOR};
    background: ${PIXELFED_COLOR}10;
  }
`;

const FediverseNote = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[3]};
  background: linear-gradient(135deg, #8b5cf615 0%, #c4b5fd15 100%);
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

// ============ Component ============
export function PixelfedConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: PixelfedConnectProps) {
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
          logo={<PixelfedLogo><Camera size={24} /></PixelfedLogo>}
          name="Pixelfed"
          tagline="Decentralized photo sharing"
          description="Connect to Pixelfed, the federated and privacy-focused alternative to Instagram. Share photos, stories, and connect with the fediverse community."
          features={[
            { icon: Camera, label: 'Photo sharing' },
            { icon: Globe, label: 'Federated' },
            { icon: Shield, label: 'Privacy first' },
          ]}
          color={PIXELFED_COLOR}
          learnMoreUrl="https://pixelfed.org/"
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
            <PhotoGrid>
              <PhotoCell $color="#ff6b6b">🌅</PhotoCell>
              <PhotoCell $color="#f06595">🌸</PhotoCell>
              <PhotoCell $color="#cc5de8">🎨</PhotoCell>
              <PhotoCell $color="#845ef7">🌆</PhotoCell>
              <PhotoCell $color="#5c7cfa">🏔️</PhotoCell>
              <PhotoCell $color="#339af0">🌊</PhotoCell>
              <PhotoCell $color="#22b8cf">🌿</PhotoCell>
              <PhotoCell $color="#20c997">🍃</PhotoCell>
              <PhotoCell $color="#51cf66">🌳</PhotoCell>
            </PhotoGrid>

            <Stack gap={2}>
              <FeatureRow>
                <FeatureIcon><Camera size={20} /></FeatureIcon>
                <div>
                  <SmallText style={{ fontWeight: 600 }}>Photo Albums</SmallText>
                  <SmallText style={{ color: '#666', fontSize: 12 }}>Up to 10 photos per post</SmallText>
                </div>
              </FeatureRow>
              <FeatureRow>
                <FeatureIcon><Grid size={20} /></FeatureIcon>
                <div>
                  <SmallText style={{ fontWeight: 600 }}>Collections</SmallText>
                  <SmallText style={{ color: '#666', fontSize: 12 }}>Organize your photos</SmallText>
                </div>
              </FeatureRow>
              <FeatureRow>
                <FeatureIcon><Heart size={20} /></FeatureIcon>
                <div>
                  <SmallText style={{ fontWeight: 600 }}>Stories</SmallText>
                  <SmallText style={{ color: '#666', fontSize: 12 }}>24-hour ephemeral content</SmallText>
                </div>
              </FeatureRow>
            </Stack>

            <FediverseNote>
              <Globe size={18} style={{ color: '#8b5cf6', flexShrink: 0 }} />
              <span>Pixelfed connects to Mastodon, Lemmy, and the wider fediverse!</span>
            </FediverseNote>
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
              Select your Pixelfed instance or enter a custom one
            </SmallText>

            <InstanceList>
              {POPULAR_INSTANCES.map((inst) => (
                <InstanceCard
                  key={inst.name}
                  $selected={credentials.instance === inst.name}
                  onClick={() => selectInstance(inst.name)}
                >
                  <InstanceIcon>
                    <Camera size={20} />
                  </InstanceIcon>
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
                color: PIXELFED_COLOR,
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
                placeholder="pixelfed.example.com"
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
            <ProfilePreview>
              <ProfileHeader>
                <ProfileAvatar>📷</ProfileAvatar>
                <SmallText style={{ fontWeight: 600 }}>@{credentials.username || 'you'}</SmallText>
                <SmallText style={{ color: '#666', fontSize: 12 }}>@{credentials.instance || 'instance'}</SmallText>
              </ProfileHeader>
              <ProfileStats>
                <StatItem>
                  <SmallText style={{ fontWeight: 700 }}>--</SmallText>
                  <SmallText style={{ color: '#666', fontSize: 11 }}>Posts</SmallText>
                </StatItem>
                <StatItem>
                  <SmallText style={{ fontWeight: 700 }}>--</SmallText>
                  <SmallText style={{ color: '#666', fontSize: 11 }}>Followers</SmallText>
                </StatItem>
                <StatItem>
                  <SmallText style={{ fontWeight: 700 }}>--</SmallText>
                  <SmallText style={{ color: '#666', fontSize: 11 }}>Following</SmallText>
                </StatItem>
              </ProfileStats>
              <ActionBar>
                <ActionIcon><Grid size={18} /></ActionIcon>
                <ActionIcon><Bookmark size={18} /></ActionIcon>
                <ActionIcon><Heart size={18} /></ActionIcon>
                <ActionIcon><MessageCircle size={18} /></ActionIcon>
              </ActionBar>
            </ProfilePreview>

            <Input
              label="Username or Email"
              type="text"
              value={credentials.username || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, username: e.target.value })}
              placeholder="your_username"
              hint="Your Pixelfed account username or email"
              fullWidth
            />

            <Input
              label="Password"
              type="password"
              value={credentials.password || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, password: e.target.value })}
              hint="Your password is encrypted and never stored in plain text"
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
              href={`https://${credentials.instance || 'pixelfed.social'}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                color: PIXELFED_COLOR,
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
              background: `linear-gradient(135deg, ${PIXELFED_COLOR}08 0%, #fff0f0 100%)`,
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
                Your Pixelfed account is configured
              </SmallText>
            </div>

            <div style={{ padding: '0 16px' }}>
              <SmallText style={{ color: '#666' }}>
                <strong>Instance:</strong> {credentials.instance}
              </SmallText>
              <SmallText style={{ color: '#666' }}>
                <strong>Username:</strong> @{credentials.username}
              </SmallText>
            </div>

            <Alert variant="info">
              <Camera size={16} />
              ChirpSyncer can now share photos to your Pixelfed profile and interact with the fediverse.
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
      completeButtonText="Connect Pixelfed"
      platformColor={PIXELFED_COLOR}
    />
  );
}

export default PixelfedConnect;
