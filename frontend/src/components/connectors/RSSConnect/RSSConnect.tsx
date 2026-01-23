'use client';

import { useState, useMemo } from 'react';
import styled from 'styled-components';
import {
  Rss,
  Globe,
  Clock,
  Filter,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Zap,
  FileText,
  Link2,
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
interface RSSConnectProps {
  credentials: Record<string, string>;
  onCredentialsChange: (credentials: Record<string, string>) => void;
  onConnect: () => void;
  isConnecting?: boolean;
}

// ============ Constants ============
const RSS_COLOR = '#F26522';

// ============ Styled Components ============
const StepContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[2]} 0;
`;

const RSSLogo = styled.div`
  width: 48px;
  height: 48px;
  background: ${RSS_COLOR};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
`;

const FeedPreview = styled.div`
  background: ${({ theme }) => theme.colors.neutral[50]};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.neutral[200]};
`;

const FeedHeader = styled.div`
  background: linear-gradient(135deg, ${RSS_COLOR} 0%, #ff8c42 100%);
  padding: ${({ theme }) => theme.spacing[4]};
  color: white;
`;

const FeedItem = styled.div`
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral[100]};
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  align-items: flex-start;

  &:last-child {
    border-bottom: none;
  }
`;

const FeedDot = styled.div`
  width: 8px;
  height: 8px;
  background: ${RSS_COLOR};
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;
`;

const UseCaseCards = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: ${({ theme }) => theme.spacing[3]};
`;

const UseCaseCard = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
  background: white;
  border: 1px solid ${({ theme }) => theme.colors.neutral[200]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-align: center;
  transition: all 0.2s;

  &:hover {
    border-color: ${RSS_COLOR};
    box-shadow: 0 2px 8px ${RSS_COLOR}20;
  }
`;

const UseCaseIcon = styled.div`
  width: 48px;
  height: 48px;
  background: ${RSS_COLOR}15;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${RSS_COLOR};
  margin: 0 auto ${({ theme }) => theme.spacing[2]};
`;

const OptionSelector = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const OptionButton = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: ${({ theme }) => theme.spacing[3]};
  border: 2px solid ${({ $active }) => ($active ? RSS_COLOR : '#e5e7eb')};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ $active }) => ($active ? `${RSS_COLOR}08` : 'white')};
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;

  &:hover {
    border-color: ${RSS_COLOR};
  }
`;

const ExampleFeeds = styled.div`
  background: ${({ theme }) => theme.colors.neutral[50]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[3]};
`;

const ExampleFeed = styled.button`
  display: block;
  width: 100%;
  padding: ${({ theme }) => theme.spacing[2]};
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};

  &:hover {
    background: ${RSS_COLOR}10;
    color: ${RSS_COLOR};
  }
`;

// ============ Component ============
export function RSSConnect({
  credentials,
  onCredentialsChange,
  onConnect,
  isConnecting,
}: RSSConnectProps) {
  const [feedType, setFeedType] = useState<'read' | 'publish'>('read');

  const canConnect = useMemo((): boolean => {
    if (feedType === 'read') {
      // URL validation for reading feeds
      const url = credentials.feed_url || '';
      try {
        new URL(url);
        return url.includes('.');
      } catch {
        return false;
      }
    } else {
      // For publishing, need webhook URL
      const webhookUrl = credentials.webhook_url || '';
      try {
        new URL(webhookUrl);
        return webhookUrl.includes('.');
      } catch {
        return false;
      }
    }
  }, [credentials, feedType]);

  const setExampleFeed = (url: string) => {
    onCredentialsChange({ ...credentials, feed_url: url });
  };

  const steps: WizardStep[] = [
    {
      id: 'intro',
      title: 'Welcome',
      content: (
        <PlatformIntro
          logo={<RSSLogo><Rss size={24} /></RSSLogo>}
          name="RSS Feeds"
          tagline="Universal content syndication"
          description="Connect any RSS or Atom feed to automatically sync content from blogs, news sites, podcasts, and more. No API keys needed!"
          features={[
            { icon: Globe, label: 'Any website' },
            { icon: Clock, label: 'Auto-sync' },
            { icon: Filter, label: 'Smart filters' },
          ]}
          color={RSS_COLOR}
          learnMoreUrl="https://en.wikipedia.org/wiki/RSS"
        />
      ),
      canProceed: true,
    },
    {
      id: 'use-case',
      title: 'Use Case',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <SmallText style={{ textAlign: 'center', color: '#666' }}>
              What would you like to do with RSS?
            </SmallText>

            <UseCaseCards>
              <UseCaseCard
                onClick={() => setFeedType('read')}
                style={{
                  borderColor: feedType === 'read' ? RSS_COLOR : undefined,
                  background: feedType === 'read' ? `${RSS_COLOR}05` : undefined
                }}
              >
                <UseCaseIcon><Rss size={24} /></UseCaseIcon>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>Read Feeds</SmallText>
                <SmallText style={{ color: '#666', fontSize: 12 }}>
                  Import content from blogs, news, podcasts
                </SmallText>
              </UseCaseCard>

              <UseCaseCard
                onClick={() => setFeedType('publish')}
                style={{
                  borderColor: feedType === 'publish' ? RSS_COLOR : undefined,
                  background: feedType === 'publish' ? `${RSS_COLOR}05` : undefined
                }}
              >
                <UseCaseIcon><Zap size={24} /></UseCaseIcon>
                <SmallText style={{ fontWeight: 600, display: 'block' }}>Publish Feed</SmallText>
                <SmallText style={{ color: '#666', fontSize: 12 }}>
                  Generate RSS from your ChirpSyncer posts
                </SmallText>
              </UseCaseCard>
            </UseCaseCards>

            <FeedPreview>
              <FeedHeader>
                <Stack direction="row" gap={2} align="center">
                  <Rss size={20} />
                  <span style={{ fontWeight: 600 }}>
                    {feedType === 'read' ? 'Incoming Feed' : 'Your RSS Feed'}
                  </span>
                </Stack>
              </FeedHeader>
              <FeedItem>
                <FeedDot />
                <div>
                  <SmallText style={{ fontWeight: 500 }}>Latest post title...</SmallText>
                  <SmallText style={{ color: '#666', fontSize: 11 }}>2 hours ago</SmallText>
                </div>
              </FeedItem>
              <FeedItem>
                <FeedDot />
                <div>
                  <SmallText style={{ fontWeight: 500 }}>Another interesting article...</SmallText>
                  <SmallText style={{ color: '#666', fontSize: 11 }}>5 hours ago</SmallText>
                </div>
              </FeedItem>
              <FeedItem>
                <FeedDot />
                <div>
                  <SmallText style={{ fontWeight: 500 }}>Weekly digest published...</SmallText>
                  <SmallText style={{ color: '#666', fontSize: 11 }}>1 day ago</SmallText>
                </div>
              </FeedItem>
            </FeedPreview>
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
            <OptionSelector>
              <OptionButton $active={feedType === 'read'} onClick={() => setFeedType('read')}>
                <Rss size={16} style={{ marginBottom: 4 }} />
                <SmallText style={{ display: 'block', fontWeight: 500 }}>Read Feed</SmallText>
              </OptionButton>
              <OptionButton $active={feedType === 'publish'} onClick={() => setFeedType('publish')}>
                <Zap size={16} style={{ marginBottom: 4 }} />
                <SmallText style={{ display: 'block', fontWeight: 500 }}>Publish Feed</SmallText>
              </OptionButton>
            </OptionSelector>

            {feedType === 'read' ? (
              <>
                <Input
                  label="RSS Feed URL"
                  type="url"
                  value={credentials.feed_url || ''}
                  onChange={(e) => onCredentialsChange({ ...credentials, feed_url: e.target.value })}
                  placeholder="https://example.com/feed.xml"
                  hint="The URL of the RSS or Atom feed you want to follow"
                  fullWidth
                />

                <Input
                  label="Feed Name (optional)"
                  type="text"
                  value={credentials.feed_name || ''}
                  onChange={(e) => onCredentialsChange({ ...credentials, feed_name: e.target.value })}
                  placeholder="My Favorite Blog"
                  hint="A friendly name to identify this feed"
                  fullWidth
                />

                <ExampleFeeds>
                  <SmallText style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>
                    Try an example:
                  </SmallText>
                  <ExampleFeed onClick={() => setExampleFeed('https://hnrss.org/frontpage')}>
                    📰 Hacker News Front Page
                  </ExampleFeed>
                  <ExampleFeed onClick={() => setExampleFeed('https://www.reddit.com/r/technology/.rss')}>
                    💻 Reddit r/technology
                  </ExampleFeed>
                  <ExampleFeed onClick={() => setExampleFeed('https://techcrunch.com/feed/')}>
                    🚀 TechCrunch
                  </ExampleFeed>
                </ExampleFeeds>
              </>
            ) : (
              <>
                <Alert variant="info">
                  <FileText size={16} />
                  ChirpSyncer will generate an RSS feed from your posts that others can subscribe to.
                </Alert>

                <Input
                  label="Feed Title"
                  type="text"
                  value={credentials.feed_title || ''}
                  onChange={(e) => onCredentialsChange({ ...credentials, feed_title: e.target.value })}
                  placeholder="My ChirpSyncer Updates"
                  hint="The title that appears in RSS readers"
                  fullWidth
                />

                <Input
                  label="Feed Description"
                  type="text"
                  value={credentials.feed_description || ''}
                  onChange={(e) => onCredentialsChange({ ...credentials, feed_description: e.target.value })}
                  placeholder="Latest updates from my social accounts"
                  hint="A brief description of what your feed contains"
                  fullWidth
                />
              </>
            )}

            {credentials.feed_url && !canConnect && feedType === 'read' && (
              <Alert variant="warning">
                <AlertTriangle size={16} />
                Please enter a valid URL starting with http:// or https://
              </Alert>
            )}

            {canConnect && (
              <Alert variant="success">
                <CheckCircle size={16} />
                {feedType === 'read' ? 'Feed URL looks valid!' : 'Ready to create your feed!'}
              </Alert>
            )}
          </Stack>
        </StepContainer>
      ),
      canProceed: feedType === 'publish' || canConnect,
    },
    {
      id: 'options',
      title: 'Options',
      content: (
        <StepContainer>
          <Stack gap={4}>
            <SmallText style={{ fontWeight: 600 }}>Sync Options</SmallText>

            <Input
              label="Check Interval"
              type="number"
              value={credentials.check_interval || '15'}
              onChange={(e) => onCredentialsChange({ ...credentials, check_interval: e.target.value })}
              hint="How often to check for new items (in minutes)"
              fullWidth
            />

            <Input
              label="Max Items"
              type="number"
              value={credentials.max_items || '10'}
              onChange={(e) => onCredentialsChange({ ...credentials, max_items: e.target.value })}
              hint="Maximum number of items to import per sync"
              fullWidth
            />

            <Alert variant="info">
              <RefreshCw size={16} />
              ChirpSyncer will automatically check for new content based on your interval setting.
            </Alert>
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
              background: `linear-gradient(135deg, ${RSS_COLOR}08 0%, #fff5f0 100%)`,
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
                Your RSS {feedType === 'read' ? 'feed' : 'publisher'} is configured
              </SmallText>
            </div>

            <div style={{ padding: '0 16px' }}>
              {feedType === 'read' && credentials.feed_url && (
                <Stack direction="row" gap={2} align="center">
                  <Link2 size={14} style={{ color: '#666' }} />
                  <SmallText style={{ color: '#666', wordBreak: 'break-all' }}>
                    {credentials.feed_url}
                  </SmallText>
                </Stack>
              )}
              {feedType === 'publish' && credentials.feed_title && (
                <SmallText style={{ color: '#666' }}>
                  <strong>Feed:</strong> {credentials.feed_title}
                </SmallText>
              )}
            </div>

            <Alert variant="info">
              <Rss size={16} />
              {feedType === 'read'
                ? 'New items will be synced automatically to your ChirpSyncer hub.'
                : 'Your RSS feed URL will be available after connecting.'}
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
      completeButtonText="Connect RSS"
      platformColor={RSS_COLOR}
    />
  );
}

export default RSSConnect;
