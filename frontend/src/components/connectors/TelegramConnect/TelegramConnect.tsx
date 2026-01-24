'use client';

import { useState, useMemo } from 'react';
import styled from 'styled-components';
import {
  Send,
  Bot,
  Users,
  Radio,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Copy,
  Image as ImageIcon,
  FileText,
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
interface TelegramConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

// ============ Constants ============
const TELEGRAM_COLOR = '#26A5E4';

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const BotFatherCard = styled.div`
  background: linear-gradient(135deg, ${TELEGRAM_COLOR}10 0%, ${TELEGRAM_COLOR}05 100%);
  border: 1px solid ${TELEGRAM_COLOR}30;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing[5]};
  text-align: center;
`;

const BotFatherAvatar = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${TELEGRAM_COLOR} 0%, #0088cc 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto ${({ theme }) => theme.spacing[3]};
  font-size: 36px;
`;

const BotFatherName = styled.h4`
  margin: 0 0 ${({ theme }) => theme.spacing[1]};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const BotFatherHandle = styled.code`
  color: ${TELEGRAM_COLOR};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const ChatBubble = styled.div<{ $from: 'user' | 'bot' }>`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  flex-direction: ${({ $from }) => $from === 'user' ? 'row-reverse' : 'row'};

  &:last-child {
    margin-bottom: 0;
  }
`;

const BubbleAvatar = styled.div<{ $from: 'user' | 'bot' }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${({ $from }) => $from === 'bot' ? TELEGRAM_COLOR : '#9ca3af'};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 14px;
`;

const BubbleContent = styled.div<{ $from: 'user' | 'bot' }>`
  max-width: 75%;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ $from, theme }) =>
    $from === 'bot' ? theme.colors.neutral[100] : `${TELEGRAM_COLOR}15`};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.primary};

  code {
    background: ${({ theme }) => theme.colors.neutral[200]};
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
  }
`;

const StepsTimeline = styled.div`
  position: relative;
  padding-left: 32px;
  margin: ${({ theme }) => theme.spacing[4]} 0;

  &::before {
    content: '';
    position: absolute;
    left: 11px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: ${({ theme }) => theme.colors.neutral[200]};
  }
`;

const TimelineStep = styled.div`
  position: relative;
  padding-bottom: ${({ theme }) => theme.spacing[4]};

  &:last-child {
    padding-bottom: 0;
  }

  &::before {
    content: '';
    position: absolute;
    left: -25px;
    top: 4px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: ${TELEGRAM_COLOR};
    border: 2px solid white;
    box-shadow: 0 0 0 2px ${TELEGRAM_COLOR}30;
  }
`;

const TimelineTitle = styled.h5`
  margin: 0 0 ${({ theme }) => theme.spacing[1]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const TimelineText = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const OpenTelegramButton = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[5]};
  background: ${TELEGRAM_COLOR};
  color: white;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-decoration: none;
  font-weight: 500;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-top: ${({ theme }) => theme.spacing[3]};
  transition: all 0.2s;

  &:hover {
    background: #1e96d1;
    transform: translateY(-1px);
  }
`;

const CapabilitiesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[3]};
`;

const CapabilityItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[2]};
  background: ${({ theme }) => theme.colors.neutral[50]};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};

  svg {
    color: ${TELEGRAM_COLOR};
  }
`;

// ============ Component ============
export function TelegramConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: TelegramConnectProps) {
  const [tokenValidation, setTokenValidation] = useState<{ valid: boolean; message: string } | null>(null);

  const validateToken = (token: string) => {
    if (!token) {
      setTokenValidation(null);
      return;
    }

    // Telegram bot tokens follow the pattern: <bot_id>:<hash>
    // Example: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
    const tokenRegex = /^\d{8,10}:[A-Za-z0-9_-]{35}$/;

    if (tokenRegex.test(token)) {
      setTokenValidation({ valid: true, message: 'Valid bot token format' });
    } else if (token.includes(':')) {
      setTokenValidation({ valid: false, message: 'Token format looks incomplete' });
    } else {
      setTokenValidation({ valid: false, message: 'Not a valid bot token format' });
    }

    onCredentialsChange({ ...credentials, bot_token: token });
  };

  const canConnect = useMemo(() => {
    return tokenValidation?.valid === true;
  }, [tokenValidation]);

  const steps: WizardStep[] = [
    {
      id: 'intro',
      title: 'Welcome',
      content: (
        <PlatformIntro
          logo={<Send size={36} />}
          name="Telegram"
          tagline="Fast, secure messaging"
          description="Connect your Telegram bot to send messages to channels, groups, and users. Perfect for notifications, broadcasts, and automated updates."
          features={[
            { icon: Radio, label: 'Channels' },
            { icon: Users, label: 'Groups' },
            { icon: MessageSquare, label: 'Direct messages' },
          ]}
          color={TELEGRAM_COLOR}
          learnMoreUrl="https://core.telegram.org/bots"
        />
      ),
      canProceed: true,
    },
    {
      id: 'botfather',
      title: 'Create Bot',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <BotFatherCard>
              <BotFatherAvatar>🤖</BotFatherAvatar>
              <BotFatherName>BotFather</BotFatherName>
              <BotFatherHandle>@BotFather</BotFatherHandle>
              <SmallText style={{ color: '#666', marginTop: 8, display: 'block' }}>
                The official bot to create and manage Telegram bots
              </SmallText>
              <OpenTelegramButton
                href="https://t.me/BotFather"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Send size={16} />
                Open BotFather in Telegram
                <ExternalLink size={14} />
              </OpenTelegramButton>
            </BotFatherCard>

            <div>
              <SmallText style={{ fontWeight: 600, marginBottom: 12, display: 'block' }}>
                Chat with BotFather to create your bot:
              </SmallText>

              <ChatBubble $from="user">
                <BubbleAvatar $from="user">U</BubbleAvatar>
                <BubbleContent $from="user">/newbot</BubbleContent>
              </ChatBubble>

              <ChatBubble $from="bot">
                <BubbleAvatar $from="bot">🤖</BubbleAvatar>
                <BubbleContent $from="bot">
                  Alright, a new bot. How are we going to call it? Please choose a name for your bot.
                </BubbleContent>
              </ChatBubble>

              <ChatBubble $from="user">
                <BubbleAvatar $from="user">U</BubbleAvatar>
                <BubbleContent $from="user">ChirpSyncer Bot</BubbleContent>
              </ChatBubble>

              <ChatBubble $from="bot">
                <BubbleAvatar $from="bot">🤖</BubbleAvatar>
                <BubbleContent $from="bot">
                  Good. Now let&apos;s choose a username. It must end in <code>bot</code>.
                </BubbleContent>
              </ChatBubble>

              <ChatBubble $from="user">
                <BubbleAvatar $from="user">U</BubbleAvatar>
                <BubbleContent $from="user">ChirpSyncerBot</BubbleContent>
              </ChatBubble>

              <ChatBubble $from="bot">
                <BubbleAvatar $from="bot">🤖</BubbleAvatar>
                <BubbleContent $from="bot">
                  Done! Here is your bot token. Keep it secret! 🔐
                </BubbleContent>
              </ChatBubble>
            </div>
          </Stack>
        </StepContainer>
      ),
      canProceed: true,
    },
    {
      id: 'token',
      title: 'Bot Token',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <Alert variant="warning">
              <AlertCircle size={16} />
              Never share your bot token publicly. Anyone with it can control your bot.
            </Alert>

            <StepsTimeline>
              <TimelineStep>
                <TimelineTitle>Copy the token from BotFather</TimelineTitle>
                <TimelineText>
                  It looks like: <code>123456789:ABCdef...</code>
                </TimelineText>
              </TimelineStep>
              <TimelineStep>
                <TimelineTitle>Paste it below</TimelineTitle>
                <TimelineText>
                  ChirpSyncer encrypts your token before storing it.
                </TimelineText>
              </TimelineStep>
              <TimelineStep>
                <TimelineTitle>Add your bot to channels/groups</TimelineTitle>
                <TimelineText>
                  Make your bot an admin in channels where it should post.
                </TimelineText>
              </TimelineStep>
            </StepsTimeline>

            <Input
              label="Bot Token"
              type="password"
              value={credentials.bot_token || ''}
              onChange={(e) => validateToken(e.target.value)}
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              hint="The token you received from @BotFather"
              fullWidth
            />

            {tokenValidation && (
              <Alert variant={tokenValidation.valid ? 'success' : 'warning'}>
                {tokenValidation.valid ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                {tokenValidation.message}
              </Alert>
            )}

            <div>
              <SmallText style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>
                What your bot can do:
              </SmallText>
              <CapabilitiesGrid>
                <CapabilityItem>
                  <MessageSquare size={14} />
                  Send messages
                </CapabilityItem>
                <CapabilityItem>
                  <ImageIcon size={14} />
                  Send photos/videos
                </CapabilityItem>
                <CapabilityItem>
                  <FileText size={14} />
                  Send documents
                </CapabilityItem>
                <CapabilityItem>
                  <Radio size={14} />
                  Post to channels
                </CapabilityItem>
              </CapabilitiesGrid>
            </div>
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
              background: `linear-gradient(135deg, ${TELEGRAM_COLOR}10 0%, #f0f9ff 100%)`,
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
              <h4 style={{ margin: '0 0 8px', fontSize: '18px' }}>Bot Ready!</h4>
              <SmallText style={{ color: '#666' }}>
                Your Telegram bot is configured
              </SmallText>
            </div>

            <div style={{ padding: '0 16px' }}>
              <SmallText style={{ color: '#666' }}>
                <strong>Bot Token:</strong> ••••••••••••
              </SmallText>
            </div>

            <Alert variant="info">
              <Bot size={16} />
              After connecting, add your bot as an admin to any channel or group where you want it to post messages.
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
      completeButtonText="Connect Telegram Bot"
      platformColor={TELEGRAM_COLOR}
    />
  );
}

export default TelegramConnect;
