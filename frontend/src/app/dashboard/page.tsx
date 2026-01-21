'use client';

import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { RefreshCw, Key, Calendar, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui';
import type { DashboardStats } from '@/types';

const PageHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const PageDescription = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const StatCard = styled(Card)`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const StatIcon = styled.div<{ $color: string }>`
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background-color: ${({ $color }) => $color}15;
  color: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const StatContent = styled.div`
  flex: 1;
`;

const StatValue = styled.div`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const StatLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[10]};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.getDashboardStats();
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch stats');
    },
  });

  const statCards = [
    {
      label: 'Posts Synced',
      value: stats?.total_synced ?? 0,
      icon: CheckCircle,
      color: '#22c55e',
    },
    {
      label: 'Pending Sync',
      value: stats?.pending_sync ?? 0,
      icon: RefreshCw,
      color: '#f59e0b',
    },
    {
      label: 'Credentials',
      value: stats?.credentials_count ?? 0,
      icon: Key,
      color: '#3b82f6',
    },
    {
      label: 'Scheduled',
      value: stats?.scheduled_count ?? 0,
      icon: Calendar,
      color: '#8b5cf6',
    },
  ];

  return (
    <div>
      <PageHeader>
        <PageTitle>Dashboard</PageTitle>
        <PageDescription>
          Overview of your ChirpSyncer activity
        </PageDescription>
      </PageHeader>

      <StatsGrid>
        {statCards.map((stat) => (
          <StatCard key={stat.label} padding="md">
            <StatIcon $color={stat.color}>
              <stat.icon size={24} />
            </StatIcon>
            <StatContent>
              <StatValue>
                {isLoading ? '...' : stat.value.toLocaleString()}
              </StatValue>
              <StatLabel>{stat.label}</StatLabel>
            </StatContent>
          </StatCard>
        ))}
      </StatsGrid>

      <SectionTitle>Recent Activity</SectionTitle>
      <Card padding="lg">
        <EmptyState>
          No recent activity. Start by adding credentials and syncing your accounts.
        </EmptyState>
      </Card>
    </div>
  );
}
