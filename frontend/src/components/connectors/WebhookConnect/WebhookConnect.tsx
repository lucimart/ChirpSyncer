'use client';

import { useState, useMemo } from 'react';
import styled from 'styled-components';
import {
  Webhook,
  ArrowRightLeft,
  Shield,
  Zap,
  CheckCircle,
  AlertTriangle,
  Copy,
  Key,
  Globe,
  Send,
  Download,
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
interface WebhookConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

// ============ Constants ============
const WEBHOOK_COLOR = '#7C3AED';

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const WebhookLogo = styled.div`
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, ${WEBHOOK_COLOR} 0%, #a855f7 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
`;

const DirectionCards = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.spacing[3]};
`;

const DirectionCard = styled.button<{ $active: boolean }>`
  padding: ${({ theme }) => theme.spacing[4]};
  background: ${({ $active }) => ($active ? `${WEBHOOK_COLOR}08` : 'white')};
  border: 2px solid ${({ $active }) => ($active ? WEBHOOK_COLOR : '#e5e7eb')};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;

  &:hover {
    border-color: ${WEBHOOK_COLOR};
  }
`;

const DirectionIcon = styled.div<{ $active: boolean }>`
  width: 56px;
  height: 56px;
  background: ${({ $active }) => ($active ? `${WEBHOOK_COLOR}15` : '#f3f4f6')};
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $active }) => ($active ? WEBHOOK_COLOR : '#9ca3af')};
  margin: 0 auto ${({ theme }) => theme.spacing[3]};
  transition: all 0.2s;
`;

const FlowDiagram = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.neutral[50]};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
`;

const FlowBox = styled.div<{ $color?: string }>`
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ $color }) => $color || 'white'};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-align: center;
  min-width: 100px;
`;

const FlowArrow = styled.div`
  color: ${WEBHOOK_COLOR};
  display: flex;
  align-items: center;
`;

const WebhookUrlBox = styled.div`
  background: #1e1e2e;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing[3]};
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  color: #a6e3a1;
  position: relative;
  word-break: break-all;
`;

const CopyButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  background: #313244;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  color: #cdd6f4;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;

  &:hover {
    background: #45475a;
  }
`;

const SecurityBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  background: #dcfce7;
  color: #166534;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: 11px;
  font-weight: 500;
`;

const PayloadExample = styled.pre`
  background: #1e1e2e;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing[3]};
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 11px;
  color: #cdd6f4;
  overflow-x: auto;
  margin: 0;
`;

// ============ Component ============
export function WebhookConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: WebhookConnectProps) {
  const [direction, setDirection] = useState<'incoming' | 'outgoing'>('incoming');
  const [copied, setCopied] = useState(false);

  const canConnect = useMemo((): boolean => {
    if (direction === 'outgoing') {
      const url = credentials.webhook_url || '';
      try {
        new URL(url);
        return url.startsWith('http');
      } catch {
        return false;
      }
    }
    // For incoming, we generate the URL
    return true;
  }, [credentials, direction]);

  const generatedWebhookUrl = `https://api.chirpsyncer.com/webhooks/${credentials.webhook_id || 'your-unique-id'}`;

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps: WizardStep[] = [
    {
      id: 'intro',
      title: 'Welcome',
      content: (
        <PlatformIntro
          logo={<WebhookLogo><Webhook size={24} /></WebhookLogo>}
          name="Webhooks"
          tagline="Connect anything, anywhere"
          description="Webhooks let you connect ChirpSyncer with thousands of apps and services. Receive notifications or send updates automatically."
          features={[
            { icon: Zap, label: 'Real-time' },
            { icon: ArrowRightLeft, label: 'Bidirectional' },
            { icon: Shield, label: 'Secure' },
          ]}
          color={WEBHOOK_COLOR}
          learnMoreUrl="https://docs.chirpsyncer.com/webhooks"
        />
      ),
      canProceed: true,
    },
    {
      id: 'direction',
      title: 'Direction',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <SmallText style={{ textAlign: 'center', color: '#666' }}>
              How do you want to use webhooks?
            </SmallText>

            <DirectionCards>
              <DirectionCard
                $active={direction === 'incoming'}
                onClick={() => setDirection('incoming')}
              >
                <DirectionIcon $active={direction === 'incoming'}>
                  <Download size={28} />
                </DirectionIcon>
                <SmallText style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Receive Data
                </SmallText>
                <SmallText style={{ color: '#666', fontSize: 12 }}>
                  Get notified when something happens elsewhere
                </SmallText>
              </DirectionCard>

              <DirectionCard
                $active={direction === 'outgoing'}
                onClick={() => setDirection('outgoing')}
              >
                <DirectionIcon $active={direction === 'outgoing'}>
                  <Send size={28} />
                </DirectionIcon>
                <SmallText style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Send Data
                </SmallText>
                <SmallText style={{ color: '#666', fontSize: 12 }}>
                  Notify other apps when you post
                </SmallText>
              </DirectionCard>
            </DirectionCards>

            <FlowDiagram>
              {direction === 'incoming' ? (
                <>
                  <FlowBox $color="#f3e8ff">
                    <Globe size={20} style={{ color: WEBHOOK_COLOR, marginBottom: 4 }} />
                    <SmallText style={{ fontSize: 11 }}>External App</SmallText>
                  </FlowBox>
                  <FlowArrow>
                    <ArrowRightLeft size={24} />
                  </FlowArrow>
                  <FlowBox $color={`${WEBHOOK_COLOR}15`}>
                    <Webhook size={20} style={{ color: WEBHOOK_COLOR, marginBottom: 4 }} />
                    <SmallText style={{ fontSize: 11 }}>ChirpSyncer</SmallText>
                  </FlowBox>
                </>
              ) : (
                <>
                  <FlowBox $color={`${WEBHOOK_COLOR}15`}>
                    <Webhook size={20} style={{ color: WEBHOOK_COLOR, marginBottom: 4 }} />
                    <SmallText style={{ fontSize: 11 }}>ChirpSyncer</SmallText>
                  </FlowBox>
                  <FlowArrow>
                    <ArrowRightLeft size={24} />
                  </FlowArrow>
                  <FlowBox $color="#f3e8ff">
                    <Globe size={20} style={{ color: WEBHOOK_COLOR, marginBottom: 4 }} />
                    <SmallText style={{ fontSize: 11 }}>Your Server</SmallText>
                  </FlowBox>
                </>
              )}
            </FlowDiagram>
          </Stack>
        </StepContainer>
      ),
      canProceed: true,
    },
    {
      id: 'configure',
      title: 'Configure',
      content: (
        <StepContainer>
          <Stack gap={4}>
            {direction === 'incoming' ? (
              <>
                <Alert variant="info">
                  <Webhook size={16} />
                  Copy this URL and paste it into the app you want to connect.
                </Alert>

                <div>
                  <SmallText style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>
                    Your Webhook URL
                  </SmallText>
                  <WebhookUrlBox>
                    {generatedWebhookUrl}
                    <CopyButton onClick={() => copyToClipboard(generatedWebhookUrl)}>
                      <Copy size={12} />
                      {copied ? 'Copied!' : 'Copy'}
                    </CopyButton>
                  </WebhookUrlBox>
                </div>

                <Input
                  label="Webhook Name"
                  type="text"
                  value={credentials.webhook_name || ''}
                  onChange={(e) => onCredentialsChange({ ...credentials, webhook_name: e.target.value })}
                  placeholder="GitHub Notifications"
                  hint="A friendly name to identify this webhook"
                  fullWidth
                />

                <div>
                  <SmallText style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>
                    Expected Payload Format
                  </SmallText>
                  <PayloadExample>
{`{
  "event": "new_post",
  "content": "Hello world!",
  "timestamp": "2024-01-15T10:30:00Z"
}`}
                  </PayloadExample>
                </div>
              </>
            ) : (
              <>
                <Input
                  label="Webhook URL"
                  type="url"
                  value={credentials.webhook_url || ''}
                  onChange={(e) => onCredentialsChange({ ...credentials, webhook_url: e.target.value })}
                  placeholder="https://your-server.com/webhook"
                  hint="The URL where ChirpSyncer will send notifications"
                  fullWidth
                />

                <Input
                  label="Webhook Name"
                  type="text"
                  value={credentials.webhook_name || ''}
                  onChange={(e) => onCredentialsChange({ ...credentials, webhook_name: e.target.value })}
                  placeholder="My Discord Bot"
                  hint="A friendly name to identify this webhook"
                  fullWidth
                />

                {credentials.webhook_url && !canConnect && (
                  <Alert variant="warning">
                    <AlertTriangle size={16} />
                    Please enter a valid URL starting with http:// or https://
                  </Alert>
                )}

                {canConnect && credentials.webhook_url && (
                  <Alert variant="success">
                    <CheckCircle size={16} />
                    URL looks valid!
                  </Alert>
                )}
              </>
            )}
          </Stack>
        </StepContainer>
      ),
      canProceed: canConnect,
    },
    {
      id: 'security',
      title: 'Security',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <SecurityBadge>
                <Shield size={12} />
                Webhook Security
              </SecurityBadge>
            </div>

            <Input
              label="Secret Key (optional but recommended)"
              type="password"
              value={credentials.webhook_secret || ''}
              onChange={(e) => onCredentialsChange({ ...credentials, webhook_secret: e.target.value })}
              placeholder="your-secret-key"
              hint="Used to verify webhook authenticity via HMAC signature"
              fullWidth
            />

            <Alert variant="info">
              <Key size={16} />
              {direction === 'incoming'
                ? 'If the sending app supports signatures, enter the secret here to verify requests.'
                : 'ChirpSyncer will sign requests with this secret so your server can verify authenticity.'}
            </Alert>

            <div style={{
              background: '#fefce8',
              padding: 12,
              borderRadius: 8,
              border: '1px solid #fef08a'
            }}>
              <SmallText style={{ color: '#854d0e' }}>
                <strong>💡 Tip:</strong> Always use HTTPS URLs and verify signatures in production to prevent unauthorized access.
              </SmallText>
            </div>
          </Stack>
        </StepContainer>
      ),
      canProceed: true,
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
              background: `linear-gradient(135deg, ${WEBHOOK_COLOR}08 0%, #f5f3ff 100%)`,
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
                Your {direction === 'incoming' ? 'incoming' : 'outgoing'} webhook is configured
              </SmallText>
            </div>

            <div style={{ padding: '0 16px' }}>
              <SmallText style={{ color: '#666' }}>
                <strong>Type:</strong> {direction === 'incoming' ? 'Receive data' : 'Send data'}
              </SmallText>
              {credentials.webhook_name && (
                <SmallText style={{ color: '#666' }}>
                  <strong>Name:</strong> {credentials.webhook_name}
                </SmallText>
              )}
              {credentials.webhook_secret && (
                <SmallText style={{ color: '#666' }}>
                  <strong>Security:</strong> HMAC signature enabled
                </SmallText>
              )}
            </div>

            <Alert variant="info">
              <Webhook size={16} />
              {direction === 'incoming'
                ? 'Your webhook is ready to receive data from external services.'
                : 'ChirpSyncer will notify your server when you create new posts.'}
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
      completeButtonText="Create Webhook"
      platformColor={WEBHOOK_COLOR}
    />
  );
}

export default WebhookConnect;
