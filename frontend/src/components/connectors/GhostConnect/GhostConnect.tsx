'use client';

import { useMemo } from 'react';
import styled from 'styled-components';
import {
  Ghost,
  Zap,
  Mail,
  Globe,
  CheckCircle,
  ExternalLink,
  AlertTriangle,
  Key,
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
interface GhostConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

// ============ Constants ============
const GHOST_COLOR = '#15171A';

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const GhostLogo = styled.div`
  width: 48px;
  height: 48px;
  background: ${GHOST_COLOR};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.spacing[3]};
`;

const FeatureCard = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
  background: ${GHOST_COLOR}08;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-align: center;
`;

const FeatureIcon = styled.div`
  width: 40px;
  height: 40px;
  background: ${GHOST_COLOR}15;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${GHOST_COLOR};
  margin: 0 auto ${({ theme }) => theme.spacing[2]};
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
  background: ${GHOST_COLOR};
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
  background: ${GHOST_COLOR};
  color: white;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-decoration: none;
  font-weight: 500;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  transition: all 0.2s;

  &:hover {
    background: #2a2d32;
  }
`;

const ApiKeyFormat = styled.div`
  background: #1e1e2e;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing[3]};
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 11px;
  color: #a6e3a1;
`;

// ============ Component ============
export function GhostConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: GhostConnectProps) {
  const canConnect = useMemo((): boolean => {
    const hasUrl = !!(credentials.api_url && credentials.api_url.includes('.'));
    // Ghost Admin API key format: {id}:{secret} where secret is 64 chars hex
    const hasKey = !!(credentials.admin_api_key && credentials.admin_api_key.includes(':'));
    return hasUrl && hasKey;
  }, [credentials]);

  const steps: WizardStep[] = [
    {
      id: 'intro',
      title: 'Welcome',
      content: (
        <PlatformIntro
          logo={<GhostLogo><Ghost size={24} /></GhostLogo>}
          name="Ghost"
          tagline="Professional publishing"
          description="Connect your Ghost publication to publish articles, manage members, and monetize your content with built-in newsletters and subscriptions."
          features={[
            { icon: Zap, label: 'Fast & modern' },
            { icon: Mail, label: 'Newsletters' },
            { icon: Globe, label: 'SEO built-in' },
          ]}
          color={GHOST_COLOR}
          learnMoreUrl="https://ghost.org/"
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
            <FeatureGrid>
              <FeatureCard>
                <FeatureIcon><Zap size={20} /></FeatureIcon>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>Headless CMS</SmallText>
                <SmallText style={{ color: '#666', fontSize: 12 }}>Full API access</SmallText>
              </FeatureCard>
              <FeatureCard>
                <FeatureIcon><Mail size={20} /></FeatureIcon>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>Newsletters</SmallText>
                <SmallText style={{ color: '#666', fontSize: 12 }}>Built-in email</SmallText>
              </FeatureCard>
              <FeatureCard>
                <FeatureIcon><Key size={20} /></FeatureIcon>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>Memberships</SmallText>
                <SmallText style={{ color: '#666', fontSize: 12 }}>Paid subscriptions</SmallText>
              </FeatureCard>
              <FeatureCard>
                <FeatureIcon><Globe size={20} /></FeatureIcon>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>SEO Ready</SmallText>
                <SmallText style={{ color: '#666', fontSize: 12 }}>Structured data</SmallText>
              </FeatureCard>
            </FeatureGrid>

            <Alert variant="info">
              <Ghost size={16} />
              Ghost provides a powerful Admin API for creating and managing content programmatically.
            </Alert>
          </Stack>
        </StepContainer>
      ),
      canProceed: true,
    },
    {
      id: 'setup',
      title: 'Get API Key',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <SetupSteps>
              <SmallText style={{ fontWeight: 600, marginBottom: 16, display: 'block' }}>
                Create an Admin API key:
              </SmallText>

              <SetupStep>
                <StepNumber>1</StepNumber>
                <SmallText>Go to your Ghost Admin panel</SmallText>
              </SetupStep>
              <SetupStep>
                <StepNumber>2</StepNumber>
                <SmallText>Navigate to Settings → Integrations</SmallText>
              </SetupStep>
              <SetupStep>
                <StepNumber>3</StepNumber>
                <SmallText>Click &quot;Add custom integration&quot;</SmallText>
              </SetupStep>
              <SetupStep>
                <StepNumber>4</StepNumber>
                <SmallText>Name it &quot;ChirpSyncer&quot; and save</SmallText>
              </SetupStep>
              <SetupStep>
                <StepNumber>5</StepNumber>
                <SmallText>Copy the Admin API Key</SmallText>
              </SetupStep>
            </SetupSteps>

            <div>
              <SmallText style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>
                API Key Format:
              </SmallText>
              <ApiKeyFormat>
                {'{id}:{secret}'}<br />
                <span style={{ color: '#89b4fa' }}>Example: 6439c8e4c07f:a1b2c3d4e5f6...</span>
              </ApiKeyFormat>
            </div>

            <PortalButton
              href={credentials.api_url ? `${credentials.api_url}/ghost/#/settings/integrations` : 'https://ghost.org/docs/admin-api/'}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Key size={16} />
              Open Ghost Integrations
              <ExternalLink size={14} />
            </PortalButton>
          </Stack>
        </StepContainer>
      ),
      canProceed: true,
    },
    {
      id: 'credentials',
      title: 'Credentials',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <Input
              label="Ghost API URL"
              type="url"
              value={credentials.api_url || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, api_url: e.target.value })}
              placeholder="https://yoursite.ghost.io"
              hint="Your Ghost site URL (without /ghost)"
              fullWidth
            />

            <Input
              label="Admin API Key"
              type="password"
              value={credentials.admin_api_key || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, admin_api_key: e.target.value })}
              placeholder="6439c8e4c07f:a1b2c3d4e5f6..."
              hint="Format: {id}:{secret} from your integration"
              fullWidth
            />

            {credentials.admin_api_key && !credentials.admin_api_key.includes(':') && (
              <Alert variant="warning">
                <AlertTriangle size={16} />
                Admin API key should contain a colon (:) between ID and secret.
              </Alert>
            )}

            {canConnect && (
              <Alert variant="success">
                <CheckCircle size={16} />
                Credentials look valid!
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
              background: `linear-gradient(135deg, ${GHOST_COLOR}08 0%, #f8fafc 100%)`,
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
                Your Ghost publication is configured
              </SmallText>
            </div>

            <div style={{ padding: '0 16px' }}>
              <SmallText style={{ color: '#666' }}>
                <strong>Site:</strong> {credentials.api_url}
              </SmallText>
              <SmallText style={{ color: '#666' }}>
                <strong>API Key:</strong> ••••••••:••••••••
              </SmallText>
            </div>

            <Alert variant="info">
              <Ghost size={16} />
              ChirpSyncer can now publish posts to your Ghost publication.
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
      completeButtonText="Connect Ghost"
      platformColor={GHOST_COLOR}
    />
  );
}

export default GhostConnect;
