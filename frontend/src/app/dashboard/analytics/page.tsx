'use client';

import { useState } from 'react';
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
  BarChart2,
} from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { api } from '@/lib/api';

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const HeaderLeft = styled.div``;

const HeaderRight = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  align-items: center;
`;

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

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const PageDescription = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const StatCard = styled(Card)`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const StatInfo = styled.div``;

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

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const ChartCard = styled(Card)`
  min-height: 300px;
`;

const ChartTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const ChartPlaceholder = styled.div`
  height: 220px;
  background: linear-gradient(
    to bottom,
    ${({ theme }) => theme.colors.primary[50]},
    ${({ theme }) => theme.colors.background.secondary}
  );
  border-radius: ${({ theme }) => theme.borderRadius.md};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
`;

const TopPostsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
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

const PostMeta = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
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
    },
    {
      label: 'Engagement Rate',
      value: `${(analytics?.engagement.value ?? 0).toFixed(2)}%`,
      change: analytics?.engagement.change ?? 0,
      icon: Heart,
      color: '#ef4444',
    },
    {
      label: 'Impressions',
      value: analytics?.impressions.value ?? 0,
      change: analytics?.impressions.change ?? 0,
      icon: Eye,
      color: '#8b5cf6',
    },
    {
      label: 'Interactions',
      value: analytics?.interactions.value ?? 0,
      change: analytics?.interactions.change ?? 0,
      icon: MessageCircle,
      color: '#22c55e',
    },
  ];

  const formatNumber = (num: number) => {
    if (typeof num === 'string') return num;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
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
      <PageHeader>
        <HeaderLeft>
          <PageTitle>Analytics</PageTitle>
          <PageDescription>
            Track your social media performance across platforms
          </PageDescription>
        </HeaderLeft>
        <HeaderRight>
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
        </HeaderRight>
      </PageHeader>

      <StatsGrid>
        {stats.map((stat) => (
          <StatCard key={stat.label} padding="md">
            <StatInfo>
              <StatLabel>{stat.label}</StatLabel>
              <StatValue>{formatNumber(stat.value as number)}</StatValue>
              <StatChange $positive={stat.change >= 0}>
                {stat.change >= 0 ? (
                  <TrendingUp size={14} />
                ) : (
                  <TrendingDown size={14} />
                )}
                {Math.abs(stat.change)}% vs last month
              </StatChange>
            </StatInfo>
            <StatIcon $color={stat.color}>
              <stat.icon size={24} />
            </StatIcon>
          </StatCard>
        ))}
      </StatsGrid>

      <ChartsGrid>
        <ChartCard padding="lg">
          <ChartTitle>Engagement Over Time</ChartTitle>
          <ChartPlaceholder>
            <BarChart2 size={32} opacity={0.2} />
            Chart visualization coming soon
          </ChartPlaceholder>
        </ChartCard>

        <ChartCard padding="lg">
          <ChartTitle>Platform Breakdown</ChartTitle>
          <ChartPlaceholder>
            <BarChart2 size={32} opacity={0.2} />
            Chart visualization coming soon
          </ChartPlaceholder>
        </ChartCard>
      </ChartsGrid>

      <SectionTitle>Top Performing Posts</SectionTitle>
      <Card padding="none">
        <TopPostsList>
          {analytics?.topPosts.map((post) => (
            <TopPostItem key={post.id}>
              <PostInfo>
                <PostContent>{post.content}</PostContent>
                <PostMeta>{post.date}</PostMeta>
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
        </TopPostsList>
      </Card>
    </div>
  );
}
