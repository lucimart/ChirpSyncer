'use client';

import { useState } from 'react';
import Link from 'next/link';
import styled from 'styled-components';
import {
  Image,
  Video,
  LayoutGrid,
  Heart,
  MessageCircle,
  Eye,
  Bookmark,
  TrendingUp,
  Users,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  PageHeader,
  Tabs,
  Stack,
  Typography,
  SmallText,
  Caption,
  Grid,
  Spinner,
  PlatformIcon,
} from '@/components/ui';
import {
  useInstagramOwnProfile,
  useInstagramMedia,
  useInstagramAccountInsights,
  InstagramMedia,
  INSTAGRAM_LIMITATIONS,
} from '@/lib/instagram';

const ProfileCard = styled(Card)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const ProfileAvatar = styled.img`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid ${({ theme }) => theme.colors.primary[200]};
`;

const ProfileStats = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[6]};
  margin-top: ${({ theme }) => theme.spacing[2]};
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const StatLabel = styled(Caption)`
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const MediaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
`;

const MediaCard = styled(Card)`
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.lg};
  }
`;

const MediaThumbnail = styled.div<{ $url?: string }>`
  width: 100%;
  height: 200px;
  background: ${({ $url, theme }) =>
    $url ? `url(${$url}) center/cover no-repeat` : theme.colors.background.tertiary};
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MediaTypeBadge = styled.div`
  position: absolute;
  top: ${({ theme }) => theme.spacing[2]};
  right: ${({ theme }) => theme.spacing[2]};
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const MediaMetrics = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[3]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const MetricItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};

  svg {
    width: 16px;
    height: 16px;
  }
`;

const InsightCard = styled(Card)`
  text-align: center;
`;

const InsightValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.primary[600]};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const LimitationsCard = styled(Card)`
  background: ${({ theme }) => theme.colors.warning[50]};
  border: 1px solid ${({ theme }) => theme.colors.warning[200]};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[12]};
  color: ${({ theme }) => theme.colors.text.tertiary};

  svg {
    width: 64px;
    height: 64px;
    margin-bottom: ${({ theme }) => theme.spacing[4]};
    opacity: 0.5;
  }
`;

type TabId = 'feed' | 'insights';

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function getMediaTypeIcon(type: string) {
  switch (type) {
    case 'VIDEO':
      return <Video size={14} />;
    case 'CAROUSEL_ALBUM':
      return <LayoutGrid size={14} />;
    default:
      return <Image size={14} />;
  }
}

function MediaItem({ media }: { media: InstagramMedia }) {
  const thumbnail = media.thumbnail_url || media.media_url;

  return (
    <MediaCard padding="none">
      <MediaThumbnail $url={thumbnail}>
        {!thumbnail && <Image size={48} style={{ opacity: 0.3 }} />}
        <MediaTypeBadge>
          {getMediaTypeIcon(media.media_type)}
          {media.media_type.replace('_', ' ')}
        </MediaTypeBadge>
      </MediaThumbnail>
      <div style={{ padding: '12px' }}>
        <SmallText style={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          minHeight: '2.5em'
        }}>
          {media.caption || 'No caption'}
        </SmallText>
        <Caption style={{ marginTop: '8px' }}>
          {new Date(media.timestamp).toLocaleDateString()}
        </Caption>
      </div>
      <MediaMetrics>
        <MetricItem>
          <Heart />
          {formatNumber(media.like_count || 0)}
        </MetricItem>
        <MetricItem>
          <MessageCircle />
          {formatNumber(media.comments_count || 0)}
        </MetricItem>
        <a
          href={media.permalink}
          target="_blank"
          rel="noopener noreferrer"
          style={{ marginLeft: 'auto', color: 'inherit' }}
        >
          <MetricItem>
            <ExternalLink />
          </MetricItem>
        </a>
      </MediaMetrics>
    </MediaCard>
  );
}

export default function InstagramPage() {
  const [activeTab, setActiveTab] = useState<TabId>('feed');
  const { data: profile, isLoading: profileLoading, error: profileError, refetch: refetchProfile } = useInstagramOwnProfile();
  const { data: mediaResponse, isLoading: mediaLoading, refetch: refetchMedia } = useInstagramMedia(profile?.id);
  const { data: accountInsights } = useInstagramAccountInsights('day');

  const isLoading = profileLoading || mediaLoading;
  const media = mediaResponse?.data || [];

  const handleRefresh = () => {
    refetchProfile();
    refetchMedia();
  };

  if (profileError) {
    return (
      <div>
        <PageHeader
          title="Instagram"
          description="View your Instagram posts and insights"
        />
        <Card padding="lg">
          <EmptyState>
            <Image />
            <Typography variant="h4">Instagram Not Connected</Typography>
            <SmallText style={{ marginTop: '8px', marginBottom: '16px' }}>
              Connect your Instagram Business account to view your posts and insights.
            </SmallText>
            <Link href="/dashboard/connectors">
              <Button>Go to Connectors</Button>
            </Link>
          </EmptyState>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Instagram"
        description="View your Instagram posts and insights"
        actions={
          <Button variant="secondary" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        }
      />

      {isLoading && !profile ? (
        <Card padding="lg">
          <Stack align="center" justify="center" style={{ minHeight: '200px' }}>
            <Spinner size="lg" />
            <SmallText>Loading Instagram data...</SmallText>
          </Stack>
        </Card>
      ) : profile ? (
        <>
          <ProfileCard padding="md">
            {profile.profile_picture_url ? (
              <ProfileAvatar src={profile.profile_picture_url} alt={profile.username} />
            ) : (
              <PlatformIcon icon="I" color="#E4405F" size="lg" />
            )}
            <div style={{ flex: 1 }}>
              <Stack direction="row" align="center" gap={2}>
                <Typography variant="h3">@{profile.username}</Typography>
                <Badge
                  variant={profile.account_type === 'BUSINESS' ? 'primary' : 'neutral'}
                  size="sm"
                >
                  {profile.account_type}
                </Badge>
              </Stack>
              {profile.name && <SmallText>{profile.name}</SmallText>}
              {profile.biography && (
                <Caption style={{ marginTop: '4px', maxWidth: '400px' }}>
                  {profile.biography}
                </Caption>
              )}
              <ProfileStats>
                <StatItem>
                  <StatValue>{formatNumber(profile.followers_count)}</StatValue>
                  <StatLabel>Followers</StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue>{formatNumber(profile.follows_count)}</StatValue>
                  <StatLabel>Following</StatLabel>
                </StatItem>
                <StatItem>
                  <StatValue>{formatNumber(profile.media_count)}</StatValue>
                  <StatLabel>Posts</StatLabel>
                </StatItem>
              </ProfileStats>
            </div>
          </ProfileCard>

          <Tabs
            items={[
              { id: 'feed', label: 'Feed', badge: String(media.length) },
              { id: 'insights', label: 'Insights' },
            ]}
            value={activeTab}
            onChange={(id) => setActiveTab(id as TabId)}
            variant="soft"
          />

          <div style={{ marginTop: '24px' }}>
            {activeTab === 'feed' ? (
              media.length > 0 ? (
                <MediaGrid>
                  {media.map((item) => (
                    <MediaItem key={item.id} media={item} />
                  ))}
                </MediaGrid>
              ) : (
                <Card padding="lg">
                  <EmptyState>
                    <Image />
                    <Typography variant="h4">No Posts Yet</Typography>
                    <SmallText>Your Instagram posts will appear here.</SmallText>
                  </EmptyState>
                </Card>
              )
            ) : (
              <Stack gap={4}>
                <Grid minWidth="200px" gap={4}>
                  <InsightCard padding="md">
                    <Eye size={24} style={{ marginBottom: '8px', opacity: 0.6 }} />
                    <InsightValue>
                      {formatNumber(accountInsights?.insights?.impressions || 0)}
                    </InsightValue>
                    <Caption>Impressions (Today)</Caption>
                  </InsightCard>
                  <InsightCard padding="md">
                    <Users size={24} style={{ marginBottom: '8px', opacity: 0.6 }} />
                    <InsightValue>
                      {formatNumber(accountInsights?.insights?.reach || 0)}
                    </InsightValue>
                    <Caption>Reach (Today)</Caption>
                  </InsightCard>
                  <InsightCard padding="md">
                    <TrendingUp size={24} style={{ marginBottom: '8px', opacity: 0.6 }} />
                    <InsightValue>
                      {formatNumber(accountInsights?.insights?.profile_views || 0)}
                    </InsightValue>
                    <Caption>Profile Views (Today)</Caption>
                  </InsightCard>
                  <InsightCard padding="md">
                    <Bookmark size={24} style={{ marginBottom: '8px', opacity: 0.6 }} />
                    <InsightValue>
                      {formatNumber(accountInsights?.insights?.follower_count || profile.followers_count)}
                    </InsightValue>
                    <Caption>Total Followers</Caption>
                  </InsightCard>
                </Grid>

                <LimitationsCard padding="md">
                  <Typography variant="h4" style={{ marginBottom: '12px' }}>
                    Instagram API Limitations
                  </Typography>
                  <Stack gap={2}>
                    <SmallText>
                      <strong>Read-only access:</strong> Publishing requires Content Publishing API approval from Meta.
                    </SmallText>
                    <SmallText>
                      <strong>Business account required:</strong> Full insights require a Business or Creator account.
                    </SmallText>
                    <SmallText>
                      <strong>Caption limit:</strong> {INSTAGRAM_LIMITATIONS.maxCaptionLength} characters
                    </SmallText>
                    <SmallText>
                      <strong>Hashtag limit:</strong> {INSTAGRAM_LIMITATIONS.maxHashtags} per post
                    </SmallText>
                    <SmallText>
                      <strong>Carousel limit:</strong> {INSTAGRAM_LIMITATIONS.maxCarouselItems} items
                    </SmallText>
                  </Stack>
                </LimitationsCard>
              </Stack>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
