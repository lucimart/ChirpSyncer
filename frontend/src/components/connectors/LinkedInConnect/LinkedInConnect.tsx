'use client';

import { useMemo } from 'react';
import styled from 'styled-components';
import {
  Briefcase,
  Users,
  Award,
  TrendingUp,
  Building2,
  CheckCircle,
  ExternalLink,
  AlertTriangle,
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
interface LinkedInConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

// ============ Constants ============
const LINKEDIN_COLOR = '#0A66C2';

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const LinkedInLogo = styled.div`
  width: 48px;
  height: 48px;
  background: ${LINKEDIN_COLOR};
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 28px;
  font-family: system-ui, -apple-system, sans-serif;
`;

const ApiAccessCard = styled.div`
  background: linear-gradient(135deg, ${LINKEDIN_COLOR}08 0%, ${LINKEDIN_COLOR}03 100%);
  border: 1px solid ${LINKEDIN_COLOR}20;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing[4]};
`;

const ApiTier = styled.div<{ $recommended?: boolean }>`
  border: 2px solid ${({ $recommended }) => $recommended ? LINKEDIN_COLOR : '#e5e7eb'};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  position: relative;
  background: ${({ $recommended }) => $recommended ? `${LINKEDIN_COLOR}05` : 'white'};

  &:last-child {
    margin-bottom: 0;
  }
`;

const TierBadge = styled.span`
  position: absolute;
  top: -10px;
  left: 16px;
  background: ${LINKEDIN_COLOR};
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
`;

const TierTitle = styled.h4`
  margin: 0 0 ${({ theme }) => theme.spacing[1]};
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const TierDescription = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const StepsList = styled.ol`
  margin: 0;
  padding: 0 0 0 20px;
  list-style: decimal;

  li {
    padding: ${({ theme }) => theme.spacing[2]} 0;
    font-size: ${({ theme }) => theme.fontSizes.sm};
    color: ${({ theme }) => theme.colors.text.secondary};

    strong {
      color: ${({ theme }) => theme.colors.text.primary};
    }

    code {
      background: ${({ theme }) => theme.colors.neutral[100]};
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
    }
  }
`;

const PortalButton = styled.a`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background: ${LINKEDIN_COLOR};
  color: white;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-decoration: none;
  font-weight: 500;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  transition: all 0.2s;

  &:hover {
    background: #004182;
  }
`;

const ScopesList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[1]};
  margin-top: ${({ theme }) => theme.spacing[2]};
`;

const ScopeBadge = styled.code`
  font-size: 11px;
  padding: 4px 8px;
  background: ${LINKEDIN_COLOR}10;
  color: ${LINKEDIN_COLOR};
  border-radius: 4px;
`;

// ============ Component ============
export function LinkedInConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: LinkedInConnectProps) {
  const canConnect = useMemo(() => {
    return !!(credentials.access_token && credentials.access_token.length > 20);
  }, [credentials.access_token]);

  const steps: WizardStep[] = [
    {
      id: 'intro',
      title: 'Welcome',
      content: (
        <PlatformIntro
          logo={<LinkedInLogo>in</LinkedInLogo>}
          name="LinkedIn"
          tagline="The world&apos;s largest professional network"
          description="Connect your LinkedIn account to share professional updates, articles, and sync content with your network of colleagues and industry peers."
          features={[
            { icon: Briefcase, label: 'Professional posts' },
            { icon: Users, label: '1B+ members' },
            { icon: TrendingUp, label: 'Business insights' },
          ]}
          color={LINKEDIN_COLOR}
          learnMoreUrl="https://www.linkedin.com/developers/"
        />
      ),
      canProceed: true,
    },
    {
      id: 'api-access',
      title: 'API Access',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <ApiAccessCard>
              <SmallText style={{ fontWeight: 600, marginBottom: 16, display: 'block' }}>
                LinkedIn API requires a developer application
              </SmallText>

              <ApiTier $recommended>
                <TierBadge>Recommended</TierBadge>
                <TierTitle>Community Management API</TierTitle>
                <TierDescription>
                  For posting content, sharing articles, and managing your professional presence.
                  Free for personal use.
                </TierDescription>
              </ApiTier>

              <ApiTier>
                <TierTitle>Marketing Developer Platform</TierTitle>
                <TierDescription>
                  For advertising, analytics, and enterprise features. Requires approval and may have costs.
                </TierDescription>
              </ApiTier>
            </ApiAccessCard>

            <Alert variant="info">
              <Building2 size={16} />
              You&apos;ll need a LinkedIn Page or Company Page to post via API. Personal profiles have limited API access.
            </Alert>

            <PortalButton
              href="https://www.linkedin.com/developers/apps"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Briefcase size={16} />
              Open LinkedIn Developer Portal
              <ExternalLink size={14} />
            </PortalButton>
          </Stack>
        </StepContainer>
      ),
      canProceed: true,
    },
    {
      id: 'setup',
      title: 'Create App',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <SmallText style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>
              Follow these steps in the Developer Portal:
            </SmallText>

            <StepsList>
              <li>
                Click <strong>&quot;Create App&quot;</strong> and fill in your app details
              </li>
              <li>
                Select your <strong>LinkedIn Page</strong> as the associated company
              </li>
              <li>
                Go to <strong>Products</strong> tab and request access to:
                <ScopesList>
                  <ScopeBadge>Share on LinkedIn</ScopeBadge>
                  <ScopeBadge>Sign In with LinkedIn</ScopeBadge>
                </ScopesList>
              </li>
              <li>
                Wait for approval (can be instant or take a few days)
              </li>
              <li>
                Go to <strong>Auth</strong> tab to generate an access token
              </li>
            </StepsList>

            <Alert variant="warning">
              <AlertTriangle size={16} />
              LinkedIn access tokens expire after 60 days. You&apos;ll need to refresh them periodically.
            </Alert>

            <div>
              <SmallText style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>
                Required OAuth Scopes:
              </SmallText>
              <ScopesList>
                <ScopeBadge>r_liteprofile</ScopeBadge>
                <ScopeBadge>r_emailaddress</ScopeBadge>
                <ScopeBadge>w_member_social</ScopeBadge>
              </ScopesList>
            </div>
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
            <div style={{ textAlign: 'center' }}>
              <SmallText style={{ color: '#666' }}>
                Paste the access token from your LinkedIn app.
              </SmallText>
            </div>

            <Input
              label="Access Token"
              type="password"
              value={credentials.access_token || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, access_token: e.target.value })}
              placeholder="AQVxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              hint="OAuth 2.0 access token from LinkedIn Developer Portal"
              fullWidth
            />

            {credentials.access_token && !canConnect && (
              <Alert variant="warning">
                <AlertTriangle size={16} />
                Token looks too short. LinkedIn tokens are usually longer.
              </Alert>
            )}

            {canConnect && (
              <Alert variant="success">
                <CheckCircle size={16} />
                Token format looks valid!
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
              background: `linear-gradient(135deg, ${LINKEDIN_COLOR}08 0%, #f0f9ff 100%)`,
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
                Your LinkedIn credentials are configured
              </SmallText>
            </div>

            <div style={{ padding: '0 16px' }}>
              <SmallText style={{ color: '#666' }}>
                <strong>Access Token:</strong> ••••••••••••
              </SmallText>
            </div>

            <Alert variant="info">
              <Award size={16} />
              ChirpSyncer can now share posts to LinkedIn and sync content with your professional network.
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
      completeButtonText="Connect LinkedIn"
      platformColor={LINKEDIN_COLOR}
    />
  );
}

export default LinkedInConnect;
