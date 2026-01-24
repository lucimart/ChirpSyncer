'use client';

import { useState, useMemo } from 'react';
import styled from 'styled-components';
import {
  MessageCircle,
  Webhook,
  Bot,
  Bell,
  Zap,
  Settings,
  ExternalLink,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import {
  ConnectionWizard,
  WizardStep,
  PlatformIntro,
  OAuthGuide,
  Input,
  Stack,
  SmallText,
  Alert,
  SelectableCard,
} from '@/components/ui';

// ============ Types ============
interface DiscordConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

type ConnectionMode = 'webhook' | 'bot';

// ============ Constants ============
const DISCORD_COLOR = '#5865F2';

const BOT_SETUP_STEPS = [
  {
    title: 'Go to Discord Developer Portal',
    description: 'Log in with your Discord account and go to the Applications section.',
  },
  {
    title: 'Create a New Application',
    description: 'Click "New Application", give it a name like "ChirpSyncer", and create it.',
  },
  {
    title: 'Create a Bot',
    description: 'Go to the "Bot" section in the left sidebar and click "Add Bot".',
    tip: 'You can customize the bot\'s username and avatar here.',
  },
  {
    title: 'Copy the Bot Token',
    description: 'Click "Reset Token" (or "Copy" if visible), then paste it below.',
    tip: 'Keep this token secret! Anyone with it can control your bot.',
  },
  {
    title: 'Invite Bot to Your Server',
    description: 'Go to OAuth2 → URL Generator, select "bot" scope, choose permissions, and use the generated URL to invite.',
  },
];

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const ModeCard = styled(SelectableCard)`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[4]};
`;

const ModeIcon = styled.div<{ $variant: 'webhook' | 'bot' }>`
  width: 56px;
  height: 56px;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background: ${({ $variant }) =>
    $variant === 'webhook'
      ? `linear-gradient(135deg, ${DISCORD_COLOR}dd 0%, ${DISCORD_COLOR} 100%)`
      : 'linear-gradient(135deg, #57F287 0%, #3BA55C 100%)'};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const ModeContent = styled.div`
  flex: 1;
`;

const ModeTitle = styled.h4`
  margin: 0 0 ${({ theme }) => theme.spacing[1]};
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const ModeDescription = styled.p`
  margin: 0 0 ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const CapabilityList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const CapabilityBadge = styled.span<{ $type: 'can' | 'cannot' }>`
  font-size: 11px;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background: ${({ $type, theme }) =>
    $type === 'can' ? theme.colors.success[100] : theme.colors.neutral[100]};
  color: ${({ $type, theme }) =>
    $type === 'can' ? theme.colors.success[700] : theme.colors.neutral[500]};
`;

const DifficultyBadge = styled.span<{ $easy?: boolean }>`
  font-size: 11px;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background: ${({ $easy, theme }) =>
    $easy ? theme.colors.success[100] : theme.colors.warning[100]};
  color: ${({ $easy, theme }) =>
    $easy ? theme.colors.success[700] : theme.colors.warning[700]};
  font-weight: 600;
`;

const InstructionsCard = styled.div`
  background: ${({ theme }) => theme.colors.neutral[50]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing[4]};
  margin: ${({ theme }) => theme.spacing[3]} 0;
`;

const InstructionStep = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};

  &:last-child {
    margin-bottom: 0;
  }
`;

const StepNumber = styled.span`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${DISCORD_COLOR}20;
  color: ${DISCORD_COLOR};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
`;

// ============ Component ============
export function DiscordConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: DiscordConnectProps) {
  const [mode, setMode] = useState<ConnectionMode>(
    credentials.bot_token ? 'bot' : 'webhook'
  );

  const canConnectWebhook = useMemo(() => {
    const url = credentials.webhook_url || '';
    return url.startsWith('https://discord.com/api/webhooks/') ||
           url.startsWith('https://discordapp.com/api/webhooks/');
  }, [credentials.webhook_url]);

  const canConnectBot = useMemo(() => {
    const token = credentials.bot_token || '';
    return token.length > 50; // Bot tokens are ~70 chars
  }, [credentials.bot_token]);

  const canConnect = mode === 'webhook' ? canConnectWebhook : canConnectBot;

  const steps: WizardStep[] = [
    {
      id: 'intro',
      title: 'Welcome',
      content: (
        <PlatformIntro
          logo={<MessageCircle size={36} />}
          name="Discord"
          tagline="Your place to talk and hang out"
          description="Connect Discord to receive notifications or post messages to your servers. Choose between simple webhooks or full bot integration."
          features={[
            { icon: Bell, label: 'Notifications' },
            { icon: Zap, label: 'Real-time' },
            { icon: Settings, label: 'Customizable' },
          ]}
          color={DISCORD_COLOR}
        />
      ),
      canProceed: true,
    },
    {
      id: 'mode',
      title: 'Choose Method',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <div style={{ textAlign: 'center' }}>
              <SmallText style={{ color: '#666' }}>
                Choose how you want to connect to Discord.
              </SmallText>
            </div>

            <ModeCard selected={mode === 'webhook'} onClick={() => setMode('webhook')}>
              <ModeIcon $variant="webhook">
                <Webhook size={24} />
              </ModeIcon>
              <ModeContent>
                <ModeTitle>
                  Webhook
                  <DifficultyBadge $easy>Easy Setup</DifficultyBadge>
                </ModeTitle>
                <ModeDescription>
                  Send messages to a specific channel. Perfect for notifications
                  and cross-posting. Takes 30 seconds to set up.
                </ModeDescription>
                <CapabilityList>
                  <CapabilityBadge $type="can">✓ Send messages</CapabilityBadge>
                  <CapabilityBadge $type="can">✓ Embeds</CapabilityBadge>
                  <CapabilityBadge $type="cannot">✗ Read messages</CapabilityBadge>
                  <CapabilityBadge $type="cannot">✗ Multiple channels</CapabilityBadge>
                </CapabilityList>
              </ModeContent>
              {mode === 'webhook' && <CheckCircle size={20} color="#22c55e" />}
            </ModeCard>

            <ModeCard selected={mode === 'bot'} onClick={() => setMode('bot')}>
              <ModeIcon $variant="bot">
                <Bot size={24} />
              </ModeIcon>
              <ModeContent>
                <ModeTitle>
                  Bot
                  <DifficultyBadge>Advanced</DifficultyBadge>
                </ModeTitle>
                <ModeDescription>
                  Full integration with read/write access across multiple channels.
                  Requires creating a bot application.
                </ModeDescription>
                <CapabilityList>
                  <CapabilityBadge $type="can">✓ Send messages</CapabilityBadge>
                  <CapabilityBadge $type="can">✓ Read messages</CapabilityBadge>
                  <CapabilityBadge $type="can">✓ Multiple channels</CapabilityBadge>
                  <CapabilityBadge $type="can">✓ Commands</CapabilityBadge>
                </CapabilityList>
              </ModeContent>
              {mode === 'bot' && <CheckCircle size={20} color="#22c55e" />}
            </ModeCard>
          </Stack>
        </StepContainer>
      ),
      canProceed: true,
    },
    {
      id: 'credentials',
      title: mode === 'webhook' ? 'Webhook URL' : 'Bot Token',
      content: (
        <StepContainer>
          {mode === 'webhook' ? (
            <Stack gap={4}>
              <InstructionsCard>
                <SmallText style={{ fontWeight: 600, marginBottom: 12, display: 'block' }}>
                  How to create a Webhook:
                </SmallText>
                <InstructionStep>
                  <StepNumber>1</StepNumber>
                  <SmallText>Open Discord and go to your server</SmallText>
                </InstructionStep>
                <InstructionStep>
                  <StepNumber>2</StepNumber>
                  <SmallText>Right-click the channel → Edit Channel</SmallText>
                </InstructionStep>
                <InstructionStep>
                  <StepNumber>3</StepNumber>
                  <SmallText>Go to Integrations → Webhooks</SmallText>
                </InstructionStep>
                <InstructionStep>
                  <StepNumber>4</StepNumber>
                  <SmallText>Click &quot;New Webhook&quot; and copy the URL</SmallText>
                </InstructionStep>
              </InstructionsCard>

              <Input
                label="Webhook URL"
                type="text"
                value={credentials.webhook_url || ''}
                onChange={(e) => onCredentialsChange({ ...credentials, webhook_url: e.target.value })}
                placeholder="https://discord.com/api/webhooks/..."
                hint="The full webhook URL from Discord"
                fullWidth
              />

              {credentials.webhook_url && !canConnectWebhook && (
                <Alert variant="warning">
                  <AlertCircle size={16} />
                  This doesn&apos;t look like a valid Discord webhook URL.
                  It should start with https://discord.com/api/webhooks/
                </Alert>
              )}

              {canConnectWebhook && (
                <Alert variant="success">
                  <CheckCircle size={16} />
                  Valid webhook URL detected!
                </Alert>
              )}
            </Stack>
          ) : (
            <Stack gap={4}>
              <OAuthGuide
                platform="Discord"
                portalName="Discord Developer Portal"
                portalUrl="https://discord.com/developers/applications"
                steps={BOT_SETUP_STEPS}
                tip="After creating the bot, you'll need to invite it to your server using the OAuth2 URL Generator."
                color={DISCORD_COLOR}
              />

              <Input
                label="Bot Token"
                type="password"
                value={credentials.bot_token || ''}
                onChange={(e) => onCredentialsChange({ ...credentials, bot_token: e.target.value })}
                placeholder="MTxxxxxxxxxxxxxxxxxx.xxxxxx.xxxxxxxxxxxxxxxxxxxxxxxx"
                hint="The token from your bot's settings page"
                fullWidth
              />
            </Stack>
          )}
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
              background: '#f0f9ff',
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
                {mode === 'webhook' ? 'Webhook' : 'Bot'} configured successfully
              </SmallText>
            </div>

            <div style={{ padding: '0 16px' }}>
              <SmallText style={{ color: '#666' }}>
                <strong>Method:</strong> {mode === 'webhook' ? 'Webhook (Send only)' : 'Bot (Full access)'}
              </SmallText>
              <SmallText style={{ color: '#666' }}>
                <strong>Credentials:</strong> ••••••••••••
              </SmallText>
            </div>

            <Alert variant="info">
              {mode === 'webhook'
                ? 'ChirpSyncer will send messages to your Discord channel via webhook.'
                : 'ChirpSyncer can read and send messages in channels where your bot has access.'}
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
      completeButtonText={`Connect Discord (${mode === 'webhook' ? 'Webhook' : 'Bot'})`}
      platformColor={DISCORD_COLOR}
    />
  );
}

export default DiscordConnect;
