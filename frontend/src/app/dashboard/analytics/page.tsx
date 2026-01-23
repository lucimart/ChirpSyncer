'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Heart,
  MessageCircle,
  Eye,
  Download,
  Share2,
} from 'lucide-react';
import { Button, Card, PageHeader, SectionTitle, StatsGrid, Stack, MetaItem, SmallText } from '@/components/ui';
import { AnimatedNumber, AnimatedCompactNumber, AnimatedPercentage } from '@/components/ui/Motion';
import { NivoChartWidget } from '@/components/widgets';
import { EngagementNetwork } from '@/components/canvas';
import type { NetworkNode, NetworkLink } from '@/components/canvas';
import { api } from '@/lib/api';

const PeriodSelector = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[1]};
  background-color: ${({ theme }) => theme.colors.background.secondary};
  padding: ${({ theme }) => theme.spacing[1]};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
`;

const PeriodButton = styled.button<{ $active: boolean }>`
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  background-color: ${({ $active, theme }) =>
    $active ? theme.colors.background.primary : 'transparent'};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.secondary};
  box-shadow: ${({ $active }) =>
    $active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const AnalyticsStatCard = styled(Card)`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const StatLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const StatValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const StatChange = styled.div<{ $positive: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ $positive, theme }) =>
    $positive ? theme.colors.success[600] : theme.colors.danger[600]};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const StatIcon = styled.div<{ $color: string }>`
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background-color: ${({ $color }) => `${$color}15`};
  color: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const LegendDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${({ $color }) => $color};
`;

const TopPostItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: ${({ theme }) => theme.spacing[3]};
  background-color: ${({ theme }) => theme.colors.background.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.default};
    background-color: ${({ theme }) => theme.colors.background.primary};
  }
`;

const PostInfo = styled.div`
  flex: 1;
  overflow: hidden;
`;

const PostContent = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.4;
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const PostStats = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-left: ${({ theme }) => theme.spacing[4]};
`;

const PostStat = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

interface AnalyticsData {
  followers: { value: number; change: number };
  engagement: { value: number; change: number };
  impressions: { value: number; change: number };
  interactions: { value: number; change: number };
  topPosts: Array<{
    id: string;
    content: string;
    likes: number;
    comments: number;
    date: string;
  }>;
}

type Period = '24h' | '7d' | '30d' | '90d';

const PERIODS: { value: Period; label: string }[] = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30d');

  const { data: analytics } = useQuery<AnalyticsData>({
    queryKey: ['analytics', period],
    queryFn: async () => {
      const [overviewResponse, topResponse] = await Promise.all([
        api.getAnalyticsOverview(period),
        api.getAnalyticsTopTweets(period),
      ]);
      if (!overviewResponse.success || !overviewResponse.data) {
        throw new Error(overviewResponse.error || 'Failed to load analytics');
      }
      const overview = overviewResponse.data as {
        total_impressions: number;
        total_engagements: number;
        avg_engagement_rate: number;
        total_likes: number;
        total_replies: number;
      };
      const topItems = (topResponse.success && topResponse.data
        ? (topResponse.data as { items?: Array<{ tweet_id: string; likes: number; replies: number }> }).items
        : []) ?? [];
      return {
        followers: { value: 0, change: 0 },
        engagement: { value: overview.avg_engagement_rate ?? 0, change: 0 },
        impressions: { value: overview.total_impressions ?? 0, change: 0 },
        interactions: { value: overview.total_engagements ?? 0, change: 0 },
        topPosts: topItems.map((item) => ({
          id: item.tweet_id,
          content: `Just published a new update about the ChirpSyncer project! 🚀 Check out the latest features...`,
          likes: item.likes ?? 0,
          comments: item.replies ?? 0,
          date: new Date().toISOString().split('T')[0],
        })),
      };
    },
  });

  const stats = [
    {
      label: 'Total Followers',
      value: analytics?.followers.value ?? 0,
      change: analytics?.followers.change ?? 0,
      icon: Users,
      color: '#3b82f6',
      type: 'compact' as const,
    },
    {
      label: 'Engagement Rate',
      value: analytics?.engagement.value ?? 0,
      change: analytics?.engagement.change ?? 0,
      icon: Heart,
      color: '#ef4444',
      type: 'percentage' as const,
    },
    {
      label: 'Impressions',
      value: analytics?.impressions.value ?? 0,
      change: analytics?.impressions.change ?? 0,
      icon: Eye,
      color: '#8b5cf6',
      type: 'compact' as const,
    },
    {
      label: 'Interactions',
      value: analytics?.interactions.value ?? 0,
      change: analytics?.interactions.change ?? 0,
      icon: MessageCircle,
      color: '#22c55e',
      type: 'compact' as const,
    },
  ];

  const renderAnimatedValue = (
    value: number,
    type: 'compact' | 'percentage' | 'number'
  ) => {
    switch (type) {
      case 'percentage':
        return <AnimatedPercentage value={value} decimals={2} />;
      case 'compact':
        return <AnimatedCompactNumber value={value} />;
      default:
        return <AnimatedNumber value={value} />;
    }
  };

  // Sample chart data (would come from API in production)
  const engagementChartData = [
    { label: 'Mon', value: 120 },
    { label: 'Tue', value: 180 },
    { label: 'Wed', value: 145 },
    { label: 'Thu', value: 210 },
    { label: 'Fri', value: 195 },
    { label: 'Sat', value: 165 },
    { label: 'Sun', value: 140 },
  ];

  const platformChartData = [
    { label: 'Twitter', value: 450 },
    { label: 'Bluesky', value: 280 },
  ];

  // Sample network data for engagement visualization
  const networkData = useMemo(() => {
    const nodes: NetworkNode[] = [
      { id: 'user-1', label: 'You', size: 30, color: '#6366f1', type: 'user' },
      { id: 'user-2', label: 'Follower A', size: 20, color: '#6366f1', type: 'user' },
      { id: 'user-3', label: 'Follower B', size: 18, color: '#6366f1', type: 'user' },
      { id: 'user-4', label: 'Influencer', size: 25, color: '#6366f1', type: 'user' },
      { id: 'post-1', label: 'Post #1', size: 15, color: '#10b981', type: 'post' },
      { id: 'post-2', label: 'Post #2', size: 18, color: '#10b981', type: 'post' },
      { id: 'post-3', label: 'Post #3', size: 12, color: '#10b981', type: 'post' },
      { id: 'topic-1', label: '#tech', size: 22, color: '#f59e0b', type: 'topic' },
      { id: 'topic-2', label: '#social', size: 16, color: '#f59e0b', type: 'topic' },
      { id: 'platform-tw', label: 'Twitter', size: 20, color: '#1DA1F2', type: 'platform' },
      { id: 'platform-bs', label: 'Bluesky', size: 20, color: '#0085FF', type: 'platform' },
    ];

    const links: NetworkLink[] = [
      { id: 'l1', source: 'user-1', target: 'post-1', strength: 0.9, type: 'like' },
      { id: 'l2', source: 'user-1', target: 'post-2', strength: 0.8, type: 'like' },
      { id: 'l3', source: 'user-2', target: 'post-1', strength: 0.7, type: 'repost' },
      { id: 'l4', source: 'user-3', target: 'post-2', strength: 0.6, type: 'reply' },
      { id: 'l5', source: 'user-4', target: 'post-1', strength: 0.9, type: 'mention' },
      { id: 'l6', source: 'user-4', target: 'user-1', strength: 0.8, type: 'follow' },
      { id: 'l7', source: 'post-1', target: 'topic-1', strength: 0.7, type: 'mention' },
      { id: 'l8', source: 'post-2', target: 'topic-2', strength: 0.6, type: 'mention' },
      { id: 'l9', source: 'post-1', target: 'platform-tw', strength: 0.5, type: 'like' },
      { id: 'l10', source: 'post-2', target: 'platform-bs', strength: 0.5, type: 'like' },
      { id: 'l11', source: 'user-2', target: 'user-1', strength: 0.6, type: 'follow' },
      { id: 'l12', source: 'user-3', target: 'user-1', strength: 0.5, type: 'follow' },
    ];

    return { nodes, links };
  }, []);

  const handleNetworkNodeClick = (_node: NetworkNode) => {
    // Node click handling - could show node details in a modal
  };

  const handleExportData = () => {
    const exportData = {
      period,
      exportedAt: new Date().toISOString(),
      stats: {
        followers: analytics?.followers,
        engagement: analytics?.engagement,
        impressions: analytics?.impressions,
        interactions: analytics?.interactions,
      },
      topPosts: analytics?.topPosts,
    };
    const data = JSON.stringify(exportData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${period}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Track your social media performance across platforms"
        actions={
          <Stack direction="row" gap={3} align="center">
            <PeriodSelector>
              {PERIODS.map((p) => (
                <PeriodButton
                  key={p.value}
                  $active={period === p.value}
                  onClick={() => setPeriod(p.value)}
                >
                  {p.label}
                </PeriodButton>
              ))}
            </PeriodSelector>
            <Button variant="secondary" onClick={handleExportData}>
              <Download size={18} />
              Export
            </Button>
          </Stack>
        }
      />

      <StatsGrid minColumnWidth="240px">
        {stats.map((stat) => (
          <AnalyticsStatCard key={stat.label} padding="md">
            <div>
              <StatLabel>{stat.label}</StatLabel>
              <StatValue>
                {renderAnimatedValue(stat.value as number, stat.type)}
              </StatValue>
              <StatChange $positive={stat.change >= 0}>
                {stat.change >= 0 ? (
                  <TrendingUp size={14} />
                ) : (
                  <TrendingDown size={14} />
                )}
                <AnimatedPercentage value={Math.abs(stat.change)} /> vs last month
              </StatChange>
            </div>
            <StatIcon $color={stat.color}>
              <stat.icon size={24} />
            </StatIcon>
          </AnalyticsStatCard>
        ))}
      </StatsGrid>

      <ChartsGrid>
        <NivoChartWidget
          data={engagementChartData}
          title="Engagement Over Time"
          chartType="area"
          height={250}
        />
        <NivoChartWidget
          data={platformChartData}
          title="Platform Breakdown"
          chartType="bar"
          height={250}
        />
      </ChartsGrid>

      <Card padding="md" style={{ marginBottom: '24px' }}>
        <Stack direction="row" justify="between" align="center" style={{ marginBottom: '16px' }}>
          <SectionTitle style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Share2 size={20} />
            Engagement Network
          </SectionTitle>
          <Stack direction="row" gap={4}>
            <Stack direction="row" align="center" gap={1}>
              <LegendDot $color="#6366f1" />
              <SmallText color="secondary">Users</SmallText>
            </Stack>
            <Stack direction="row" align="center" gap={1}>
              <LegendDot $color="#10b981" />
              <SmallText color="secondary">Posts</SmallText>
            </Stack>
            <Stack direction="row" align="center" gap={1}>
              <LegendDot $color="#f59e0b" />
              <SmallText color="secondary">Topics</SmallText>
            </Stack>
            <Stack direction="row" align="center" gap={1}>
              <LegendDot $color="#ec4899" />
              <SmallText color="secondary">Platforms</SmallText>
            </Stack>
          </Stack>
        </Stack>
        <EngagementNetwork
          nodes={networkData.nodes}
          links={networkData.links}
          width={800}
          height={400}
          onNodeClick={handleNetworkNodeClick}
        />
      </Card>

      <SectionTitle>Top Performing Posts</SectionTitle>
      <Card padding="none">
        <Stack gap={3}>
          {analytics?.topPosts.map((post) => (
            <TopPostItem key={post.id}>
              <PostInfo>
                <PostContent>{post.content}</PostContent>
                <MetaItem size="xs" color="tertiary">{post.date}</MetaItem>
              </PostInfo>
              <PostStats>
                <PostStat>
                  <Heart size={14} />
                  {post.likes}
                </PostStat>
                <PostStat>
                  <MessageCircle size={14} />
                  {post.comments}
                </PostStat>
              </PostStats>
            </TopPostItem>
          ))}
        </Stack>
      </Card>
    </div>
  );
}
