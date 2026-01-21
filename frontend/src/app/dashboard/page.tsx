'use client';

import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { RefreshCw, Key, Calendar, CheckCircle, Activity } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, Button } from '@/components/ui';
import type { DashboardStats } from '@/types';
import Link from 'next/link';

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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[12]} ${({ theme }) => theme.spacing[6]};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
  background-color: ${({ theme }) => theme.colors.background.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
`;

const EmptyStateIcon = styled.div`
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background-color: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.primary[500]};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  box-shadow: ${({ theme }) => theme.shadows.sm};
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
      label: 'Synced Today',
      value: stats?.synced_today ?? 0,
      icon: RefreshCw,
      color: '#22c55e',
    },
    {
      label: 'Synced This Week',
      value: stats?.synced_week ?? 0,
      icon: Calendar,
      color: '#f59e0b',
    },
    {
      label: 'Total Synced',
      value: stats?.total_synced ?? 0,
      icon: CheckCircle,
      color: '#3b82f6',
    },
    {
      label: 'Platforms Connected',
      value: stats?.platforms_connected ?? 0,
      icon: Key,
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
      <Card padding="none">
        <EmptyState>
          <EmptyStateIcon>
            <Activity size={32} />
          </EmptyStateIcon>
          <h3>No recent activity</h3>
          <p>Start by adding credentials and syncing your accounts.</p>
          <Link href="/dashboard/credentials" passHref>
            <Button variant="primary" style={{ marginTop: '16px' }}>
              <Key size={16} />
              Manage Credentials
            </Button>
          </Link>
        </EmptyState>
      </Card>
    </div>
  );
}
