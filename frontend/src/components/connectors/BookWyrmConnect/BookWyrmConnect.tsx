'use client';

import { useState, useMemo } from 'react';
import styled from 'styled-components';
import {
  BookOpen,
  Star,
  Users,
  Globe,
  CheckCircle,
  ExternalLink,
  AlertTriangle,
  Search,
  Library,
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
interface BookWyrmConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

// ============ Constants ============
const BOOKWYRM_COLOR = '#002549';

const POPULAR_INSTANCES = [
  { name: 'bookwyrm.social', description: 'Flagship instance' },
  { name: 'books.theunseen.city', description: 'General community' },
  { name: 'bookrastinating.com', description: 'Book procrastinators' },
];

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const BookWyrmLogo = styled.div`
  width: 48px;
  height: 48px;
  background: ${BOOKWYRM_COLOR};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
`;

const BookShelf = styled.div`
  background: linear-gradient(135deg, ${BOOKWYRM_COLOR}08 0%, #f0f4f8 100%);
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing[4]};
`;

const ShelfRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const BookSpine = styled.div<{ $color: string }>`
  width: 32px;
  height: 120px;
  background: ${({ $color }) => $color};
  border-radius: 2px 4px 4px 2px;
  box-shadow: 2px 2px 4px rgba(0,0,0,0.2);
`;

const BookCard = styled.div`
  background: white;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing[3]};
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
`;

const BookCover = styled.div`
  width: 60px;
  height: 90px;
  background: linear-gradient(135deg, ${BOOKWYRM_COLOR} 0%, #004080 100%);
  border-radius: 4px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
`;

const StarRating = styled.div`
  color: #f59e0b;
  display: flex;
  gap: 2px;
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.spacing[2]};
`;

const FeatureCard = styled.div`
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${BOOKWYRM_COLOR}08;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-align: center;
`;

const FeatureIcon = styled.div`
  color: ${BOOKWYRM_COLOR};
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
  background: ${({ $selected }) => ($selected ? `${BOOKWYRM_COLOR}08` : 'white')};
  border: 2px solid ${({ $selected }) => ($selected ? BOOKWYRM_COLOR : '#e5e7eb')};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  width: 100%;

  &:hover {
    border-color: ${BOOKWYRM_COLOR};
  }
`;

const InstanceIcon = styled.div`
  width: 40px;
  height: 40px;
  background: ${BOOKWYRM_COLOR}15;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${BOOKWYRM_COLOR};
  flex-shrink: 0;
`;

// ============ Component ============
export function BookWyrmConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: BookWyrmConnectProps) {
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
          logo={<BookWyrmLogo><BookOpen size={24} /></BookWyrmLogo>}
          name="BookWyrm"
          tagline="Social reading in the fediverse"
          description="Connect to BookWyrm, the federated alternative to Goodreads. Track your reading, share reviews, and discover books through the fediverse community."
          features={[
            { icon: BookOpen, label: 'Track reading' },
            { icon: Star, label: 'Reviews' },
            { icon: Users, label: 'Book clubs' },
          ]}
          color={BOOKWYRM_COLOR}
          learnMoreUrl="https://bookwyrm.social/"
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
            <BookShelf>
              <SmallText style={{ fontWeight: 600, marginBottom: 16, display: 'block', textAlign: 'center' }}>
                Your Virtual Bookshelf
              </SmallText>
              <ShelfRow>
                <BookSpine $color="#8B4513" />
                <BookSpine $color="#2F4F4F" />
                <BookSpine $color="#800020" />
                <BookSpine $color="#1e3a5f" />
                <BookSpine $color="#4a3728" />
                <BookSpine $color="#2d5a27" />
              </ShelfRow>
            </BookShelf>

            <BookCard>
              <BookCover>📚</BookCover>
              <div>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>Currently Reading</SmallText>
                <SmallText style={{ color: '#666', fontSize: 12 }}>by Author Name</SmallText>
                <StarRating>
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                  <Star size={14} fill="currentColor" />
                  <Star size={14} />
                </StarRating>
                <SmallText style={{ color: '#666', fontSize: 11, marginTop: 4 }}>Page 142 of 320</SmallText>
              </div>
            </BookCard>

            <FeatureGrid>
              <FeatureCard>
                <FeatureIcon><Library size={20} /></FeatureIcon>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>Shelves</SmallText>
                <SmallText style={{ color: '#666', fontSize: 11 }}>Organize books</SmallText>
              </FeatureCard>
              <FeatureCard>
                <FeatureIcon><Star size={20} /></FeatureIcon>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>Reviews</SmallText>
                <SmallText style={{ color: '#666', fontSize: 11 }}>Share thoughts</SmallText>
              </FeatureCard>
              <FeatureCard>
                <FeatureIcon><Users size={20} /></FeatureIcon>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>Groups</SmallText>
                <SmallText style={{ color: '#666', fontSize: 11 }}>Book clubs</SmallText>
              </FeatureCard>
              <FeatureCard>
                <FeatureIcon><Globe size={20} /></FeatureIcon>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>Federated</SmallText>
                <SmallText style={{ color: '#666', fontSize: 11 }}>ActivityPub</SmallText>
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
              Select your BookWyrm instance
            </SmallText>

            <InstanceList>
              {POPULAR_INSTANCES.map((inst) => (
                <InstanceCard
                  key={inst.name}
                  $selected={credentials.instance === inst.name}
                  onClick={() => selectInstance(inst.name)}
                >
                  <InstanceIcon><BookOpen size={20} /></InstanceIcon>
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
                color: BOOKWYRM_COLOR,
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
                placeholder="bookwyrm.example.com"
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
            <Input
              label="Username"
              type="text"
              value={credentials.username || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, username: e.target.value })}
              placeholder="your_username"
              hint="Your BookWyrm username"
              fullWidth
            />

            <Input
              label="Password"
              type="password"
              value={credentials.password || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, password: e.target.value })}
              hint="Your password is encrypted"
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
              href={credentials.instance ? `https://${credentials.instance}` : 'https://bookwyrm.social/'}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                color: BOOKWYRM_COLOR,
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
              background: `linear-gradient(135deg, ${BOOKWYRM_COLOR}08 0%, #f0f4f8 100%)`,
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
                Your BookWyrm account is configured
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
              <BookOpen size={16} />
              ChirpSyncer can now post reading updates and reviews to BookWyrm.
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
      completeButtonText="Connect BookWyrm"
      platformColor={BOOKWYRM_COLOR}
    />
  );
}

export default BookWyrmConnect;
