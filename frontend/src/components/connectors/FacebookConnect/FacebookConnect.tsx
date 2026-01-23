'use client';

import { useMemo } from 'react';
import styled from 'styled-components';
import {
  ThumbsUp,
  Users,
  BarChart2,
  FileText,
  CheckCircle,
  ExternalLink,
  AlertTriangle,
  Info,
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
interface FacebookConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

// ============ Constants ============
const FACEBOOK_COLOR = '#1877F2';

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const FacebookLogo = styled.div`
  width: 48px;
  height: 48px;
  background: ${FACEBOOK_COLOR};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 32px;
  font-family: system-ui, -apple-system, sans-serif;
`;

const ConnectionTypeCard = styled.div<{ $selected?: boolean }>`
  border: 2px solid ${({ $selected }) => $selected ? FACEBOOK_COLOR : '#e5e7eb'};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing[4]};
  cursor: pointer;
  transition: all 0.2s;
  background: ${({ $selected }) => $selected ? `${FACEBOOK_COLOR}05` : 'white'};

  &:hover {
    border-color: ${FACEBOOK_COLOR};
  }
`;

const TypeIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: ${FACEBOOK_COLOR}15;
  color: ${FACEBOOK_COLOR};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const TypeTitle = styled.h4`
  margin: 0 0 ${({ theme }) => theme.spacing[1]};
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

const TypeDescription = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const MetaToolsCard = styled.div`
  background: linear-gradient(135deg, #f0f2f5 0%, #e4e6eb 100%);
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing[4]};
`;

const ToolItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[2]} 0;
  border-bottom: 1px solid #ddd;

  &:last-child {
    border-bottom: none;
  }
`;

const ToolNumber = styled.span`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${FACEBOOK_COLOR};
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
  background: ${FACEBOOK_COLOR};
  color: white;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-decoration: none;
  font-weight: 500;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  transition: all 0.2s;

  &:hover {
    background: #166fe5;
  }
`;

const TokenInfoCard = styled.div`
  background: ${({ theme }) => theme.colors.neutral[50]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing[3]};
`;

const TokenTypeRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing[2]} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral[200]};

  &:last-child {
    border-bottom: none;
  }
`;

const TokenTypeName = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 500;
`;

const TokenTypeDuration = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

// ============ Component ============
export function FacebookConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: FacebookConnectProps) {
  const canConnect = useMemo(() => {
    return !!(credentials.access_token && credentials.access_token.length > 50);
  }, [credentials.access_token]);

  const steps: WizardStep[] = [
    {
      id: 'intro',
      title: 'Welcome',
      content: (
        <PlatformIntro
          logo={<FacebookLogo>f</FacebookLogo>}
          name="Facebook"
          tagline="Connect with friends and the world"
          description="Connect your Facebook Page to publish posts, share updates, and engage with your community across the world's largest social network."
          features={[
            { icon: FileText, label: 'Page posts' },
            { icon: Users, label: '3B+ users' },
            { icon: BarChart2, label: 'Insights' },
          ]}
          color={FACEBOOK_COLOR}
          learnMoreUrl="https://developers.facebook.com/"
        />
      ),
      canProceed: true,
    },
    {
      id: 'page-info',
      title: 'Page Required',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <Alert variant="info">
              <Info size={16} />
              Facebook API requires a Facebook Page. Personal profiles cannot be connected via API.
            </Alert>

            <Stack gap={3}>
              <ConnectionTypeCard $selected>
                <TypeIcon>
                  <FileText size={20} />
                </TypeIcon>
                <TypeTitle>Facebook Page</TypeTitle>
                <TypeDescription>
                  Connect a Page you manage to post content, respond to comments, and view insights.
                </TypeDescription>
              </ConnectionTypeCard>
            </Stack>

            <SmallText style={{ color: '#666' }}>
              Don&apos;t have a Page? You can create one from your Facebook account in Settings → Pages.
            </SmallText>
          </Stack>
        </StepContainer>
      ),
      canProceed: true,
    },
    {
      id: 'setup',
      title: 'Get Token',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <MetaToolsCard>
              <SmallText style={{ fontWeight: 600, marginBottom: 12, display: 'block' }}>
                How to get your Page Access Token:
              </SmallText>

              <ToolItem>
                <ToolNumber>1</ToolNumber>
                <SmallText>Go to Meta for Developers and create/select your app</SmallText>
              </ToolItem>
              <ToolItem>
                <ToolNumber>2</ToolNumber>
                <SmallText>Open the Graph API Explorer tool</SmallText>
              </ToolItem>
              <ToolItem>
                <ToolNumber>3</ToolNumber>
                <SmallText>Select your App and choose your Page</SmallText>
              </ToolItem>
              <ToolItem>
                <ToolNumber>4</ToolNumber>
                <SmallText>Add permissions: pages_manage_posts, pages_read_engagement</SmallText>
              </ToolItem>
              <ToolItem>
                <ToolNumber>5</ToolNumber>
                <SmallText>Generate and copy the Page Access Token</SmallText>
              </ToolItem>
            </MetaToolsCard>

            <div style={{ display: 'flex', gap: 12 }}>
              <PortalButton
                href="https://developers.facebook.com/apps"
                target="_blank"
                rel="noopener noreferrer"
              >
                Developer Portal
                <ExternalLink size={14} />
              </PortalButton>
              <PortalButton
                href="https://developers.facebook.com/tools/explorer"
                target="_blank"
                rel="noopener noreferrer"
                style={{ background: '#42b72a' }}
              >
                Graph API Explorer
                <ExternalLink size={14} />
              </PortalButton>
            </div>

            <TokenInfoCard>
              <SmallText style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>
                Token Types:
              </SmallText>
              <TokenTypeRow>
                <TokenTypeName>Short-lived token</TokenTypeName>
                <TokenTypeDuration>~1 hour</TokenTypeDuration>
              </TokenTypeRow>
              <TokenTypeRow>
                <TokenTypeName>Long-lived token</TokenTypeName>
                <TokenTypeDuration>~60 days</TokenTypeDuration>
              </TokenTypeRow>
              <TokenTypeRow>
                <TokenTypeName>Page token (never expires)</TokenTypeName>
                <TokenTypeDuration>♾️ Permanent</TokenTypeDuration>
              </TokenTypeRow>
            </TokenInfoCard>

            <Alert variant="warning">
              <AlertTriangle size={16} />
              For best results, use the Access Token Debugger to extend your token to a long-lived or permanent Page token.
            </Alert>
          </Stack>
        </StepContainer>
      ),
      canProceed: true,
    },
    {
      id: 'token',
      title: 'Page Token',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <Input
              label="Page Access Token"
              type="password"
              value={credentials.access_token || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, access_token: e.target.value })}
              placeholder="EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              hint="The Page Access Token from Graph API Explorer"
              fullWidth
            />

            {credentials.access_token && !canConnect && (
              <Alert variant="warning">
                <AlertTriangle size={16} />
                Token looks too short. Facebook Page tokens are usually longer.
              </Alert>
            )}

            {canConnect && (
              <Alert variant="success">
                <CheckCircle size={16} />
                Token format looks valid!
              </Alert>
            )}

            <PortalButton
              href="https://developers.facebook.com/tools/debug/accesstoken"
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: '#65676b' }}
            >
              <Info size={16} />
              Debug/Extend Token
              <ExternalLink size={14} />
            </PortalButton>
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
              background: `linear-gradient(135deg, ${FACEBOOK_COLOR}08 0%, #f0f9ff 100%)`,
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
                Your Facebook Page is ready to sync
              </SmallText>
            </div>

            <div style={{ padding: '0 16px' }}>
              <SmallText style={{ color: '#666' }}>
                <strong>Page Access Token:</strong> ••••••••••••
              </SmallText>
            </div>

            <Alert variant="info">
              <ThumbsUp size={16} />
              ChirpSyncer can now post to your Facebook Page and sync content across platforms.
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
      completeButtonText="Connect Facebook Page"
      platformColor={FACEBOOK_COLOR}
    />
  );
}

export default FacebookConnect;
