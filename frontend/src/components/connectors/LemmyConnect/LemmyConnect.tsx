'use client';

import { useState, useMemo } from 'react';
import styled from 'styled-components';
import {
  MessageSquare,
  Globe,
  Users,
  Shield,
  CheckCircle,
  ExternalLink,
  AlertTriangle,
  Search,
  Star,
  TrendingUp,
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
interface LemmyConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

// ============ Constants ============
const LEMMY_COLOR = '#00BC8C';

const POPULAR_INSTANCES = [
  { name: 'lemmy.world', users: '180K+', description: 'Largest general instance' },
  { name: 'lemmy.ml', users: '45K+', description: 'Original Lemmy instance' },
  { name: 'lemm.ee', users: '35K+', description: 'European focused' },
  { name: 'programming.dev', users: '20K+', description: 'Programming focused' },
  { name: 'sh.itjust.works', users: '50K+', description: 'General purpose' },
];

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const LemmyLogo = styled.div`
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, ${LEMMY_COLOR} 0%, #00a67d 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 20px;
`;

const FederationVisual = styled.div`
  background: linear-gradient(135deg, ${LEMMY_COLOR}08 0%, #f0fdf9 100%);
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing[4]};
  text-align: center;
`;

const InstanceGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin: ${({ theme }) => theme.spacing[3]} 0;
`;

const InstanceBubble = styled.div<{ $main?: boolean }>`
  width: ${({ $main }) => ($main ? '56px' : '40px')};
  height: ${({ $main }) => ($main ? '56px' : '40px')};
  background: ${({ $main }) => ($main ? LEMMY_COLOR : `${LEMMY_COLOR}30`)};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $main }) => ($main ? 'white' : LEMMY_COLOR)};
  font-size: ${({ $main }) => ($main ? '14px' : '10px')};
  font-weight: 600;
  border: 2px dashed ${({ $main }) => ($main ? 'transparent' : `${LEMMY_COLOR}50`)};
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
  background: ${({ $selected }) => ($selected ? `${LEMMY_COLOR}08` : 'white')};
  border: 2px solid ${({ $selected }) => ($selected ? LEMMY_COLOR : '#e5e7eb')};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  width: 100%;

  &:hover {
    border-color: ${LEMMY_COLOR};
  }
`;

const InstanceIcon = styled.div`
  width: 40px;
  height: 40px;
  background: ${LEMMY_COLOR}15;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${LEMMY_COLOR};
  flex-shrink: 0;
`;

const UserBadge = styled.span`
  background: ${LEMMY_COLOR}15;
  color: ${LEMMY_COLOR};
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
`;

const CommunityPreview = styled.div`
  background: white;
  border: 1px solid ${({ theme }) => theme.colors.neutral[200]};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  overflow: hidden;
`;

const CommunityHeader = styled.div`
  background: linear-gradient(135deg, ${LEMMY_COLOR} 0%, #00a67d 100%);
  padding: ${({ theme }) => theme.spacing[3]};
  color: white;
`;

const PostPreview = styled.div`
  padding: ${({ theme }) => theme.spacing[3]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral[100]};

  &:last-child {
    border-bottom: none;
  }
`;

const VoteButtons = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin-right: ${({ theme }) => theme.spacing[2]};
`;

const VoteBtn = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.neutral[400]};
  cursor: pointer;
  padding: 2px;

  &:hover {
    color: ${LEMMY_COLOR};
  }
`;

// ============ Component ============
export function LemmyConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: LemmyConnectProps) {
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
          logo={<LemmyLogo>🐀</LemmyLogo>}
          name="Lemmy"
          tagline="Link aggregator for the fediverse"
          description="Connect to Lemmy, the federated alternative to Reddit. Post to communities, share links, and participate in discussions across thousands of interconnected servers."
          features={[
            { icon: Globe, label: 'Federated' },
            { icon: Users, label: 'Communities' },
            { icon: Shield, label: 'Open source' },
          ]}
          color={LEMMY_COLOR}
          learnMoreUrl="https://join-lemmy.org/"
        />
      ),
      canProceed: true,
    },
    {
      id: 'federation',
      title: 'How it Works',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <FederationVisual>
              <SmallText style={{ fontWeight: 600, marginBottom: 16, display: 'block' }}>
                The Fediverse: Connected but Independent
              </SmallText>

              <InstanceGrid>
                <InstanceBubble>A</InstanceBubble>
                <InstanceBubble>B</InstanceBubble>
                <InstanceBubble $main>YOU</InstanceBubble>
                <InstanceBubble>C</InstanceBubble>
                <InstanceBubble>D</InstanceBubble>
              </InstanceGrid>

              <SmallText style={{ color: '#666', fontSize: 12 }}>
                Your account lives on one server but can interact with the entire network
              </SmallText>
            </FederationVisual>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: 12, background: '#f0fdf9', borderRadius: 8, textAlign: 'center' }}>
                <MessageSquare size={24} style={{ color: LEMMY_COLOR, marginBottom: 8 }} />
                <SmallText style={{ fontWeight: 600, display: 'block' }}>Communities</SmallText>
                <SmallText style={{ color: '#666', fontSize: 11 }}>Like subreddits</SmallText>
              </div>
              <div style={{ padding: 12, background: '#f0fdf9', borderRadius: 8, textAlign: 'center' }}>
                <TrendingUp size={24} style={{ color: LEMMY_COLOR, marginBottom: 8 }} />
                <SmallText style={{ fontWeight: 600, display: 'block' }}>Voting</SmallText>
                <SmallText style={{ color: '#666', fontSize: 11 }}>Upvote/downvote</SmallText>
              </div>
            </div>

            <CommunityPreview>
              <CommunityHeader>
                <Stack direction="row" gap={2} align="center">
                  <MessageSquare size={18} />
                  <span style={{ fontWeight: 600 }}>c/technology</span>
                </Stack>
              </CommunityHeader>
              <PostPreview>
                <Stack direction="row">
                  <VoteButtons>
                    <VoteBtn>▲</VoteBtn>
                    <SmallText style={{ fontWeight: 600, color: LEMMY_COLOR }}>42</SmallText>
                    <VoteBtn>▼</VoteBtn>
                  </VoteButtons>
                  <div>
                    <SmallText style={{ fontWeight: 500 }}>Interesting tech news...</SmallText>
                    <SmallText style={{ color: '#666', fontSize: 11 }}>Posted 2h ago • 15 comments</SmallText>
                  </div>
                </Stack>
              </PostPreview>
            </CommunityPreview>
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
              Select your Lemmy instance or enter a custom one
            </SmallText>

            <InstanceList>
              {POPULAR_INSTANCES.map((inst) => (
                <InstanceCard
                  key={inst.name}
                  $selected={credentials.instance === inst.name}
                  onClick={() => selectInstance(inst.name)}
                >
                  <InstanceIcon>
                    <Globe size={20} />
                  </InstanceIcon>
                  <div style={{ flex: 1 }}>
                    <SmallText style={{ fontWeight: 600, display: 'block' }}>{inst.name}</SmallText>
                    <SmallText style={{ color: '#666', fontSize: 12 }}>{inst.description}</SmallText>
                  </div>
                  <UserBadge>
                    <Users size={10} style={{ marginRight: 4 }} />
                    {inst.users}
                  </UserBadge>
                </InstanceCard>
              ))}
            </InstanceList>

            <button
              onClick={() => setShowCustom(!showCustom)}
              style={{
                background: 'none',
                border: 'none',
                color: LEMMY_COLOR,
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
                placeholder="lemmy.example.com"
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
            <div style={{
              textAlign: 'center',
              padding: 12,
              background: `${LEMMY_COLOR}08`,
              borderRadius: 8,
              marginBottom: 8
            }}>
              <SmallText style={{ fontWeight: 600 }}>
                Logging into: {credentials.instance || 'your instance'}
              </SmallText>
            </div>

            <Input
              label="Username or Email"
              type="text"
              value={credentials.username || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, username: e.target.value })}
              placeholder="your_username"
              hint="Your Lemmy account username or email"
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

            <Input
              label="2FA Code (if enabled)"
              type="text"
              value={credentials.totp || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, totp: e.target.value })}
              placeholder="123456"
              hint="Only required if you have 2FA enabled"
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
              href={`https://${credentials.instance || 'join-lemmy.org'}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                color: LEMMY_COLOR,
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
              background: `linear-gradient(135deg, ${LEMMY_COLOR}08 0%, #f0fdf9 100%)`,
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
                Your Lemmy account is configured
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
              <Star size={16} />
              ChirpSyncer can now post to Lemmy communities and sync your activity.
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
      completeButtonText="Connect Lemmy"
      platformColor={LEMMY_COLOR}
    />
  );
}

export default LemmyConnect;
