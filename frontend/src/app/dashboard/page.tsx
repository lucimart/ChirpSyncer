'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { RefreshCw, Key, Calendar, CheckCircle, Activity } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, Button, useToast, PageHeader, EmptyState, SectionTitle } from '@/components/ui';
import { WidgetGrid, WidgetConfig } from '@/components/widgets';
import { OnboardingProvider, OnboardingChecklist, useOnboarding } from '@/components/onboarding';
import type { DashboardStats } from '@/types';
import Link from 'next/link';

const WIDGETS_STORAGE_KEY = 'chirpsyncer-dashboard-widgets';

// Default widgets based on the stat cards
const DEFAULT_WIDGETS: WidgetConfig[] = [
  {
    id: 'synced-today',
    type: 'stats',
    title: 'Synced Today',
    position: { x: 0, y: 0 },
    size: { width: 1, height: 1 },
    data: { icon: 'RefreshCw', color: '#22c55e', statKey: 'synced_today' },
  },
  {
    id: 'synced-week',
    type: 'stats',
    title: 'Synced This Week',
    position: { x: 1, y: 0 },
    size: { width: 1, height: 1 },
    data: { icon: 'Calendar', color: '#f59e0b', statKey: 'synced_week' },
  },
  {
    id: 'total-synced',
    type: 'stats',
    title: 'Total Synced',
    position: { x: 2, y: 0 },
    size: { width: 1, height: 1 },
    data: { icon: 'CheckCircle', color: '#3b82f6', statKey: 'total_synced' },
  },
  {
    id: 'platforms-connected',
    type: 'stats',
    title: 'Platforms Connected',
    position: { x: 3, y: 0 },
    size: { width: 1, height: 1 },
    data: { icon: 'Key', color: '#8b5cf6', statKey: 'platforms_connected' },
  },
];

const DashboardLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.spacing[6]};

  @media (min-width: 1024px) {
    grid-template-columns: 1fr 320px;
  }
`;

const MainContent = styled.div``;

const Sidebar = styled.aside``;

function DashboardContent() {
  const { addToast } = useToast();
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

  // Widget state with localStorage persistence
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_WIDGETS;
    try {
      const stored = localStorage.getItem(WIDGETS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_WIDGETS;
    } catch {
      return DEFAULT_WIDGETS;
    }
  });

  // Persist widgets to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(WIDGETS_STORAGE_KEY, JSON.stringify(widgets));
    }
  }, [widgets]);

  const handleLayoutChange = useCallback((newWidgets: WidgetConfig[]) => {
    setWidgets(newWidgets);
  }, []);

  const handleRemoveWidget = useCallback((id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
    addToast({
      type: 'success',
      title: 'Widget Removed',
      message: 'The widget has been removed from your dashboard.',
    });
  }, [addToast]);

  const handleWidgetSettings = useCallback((id: string) => {
    addToast({
      type: 'info',
      title: 'Widget Settings',
      message: 'Widget settings coming soon.',
    });
  }, [addToast]);

  const { isComplete } = useOnboarding();

  return (
    <DashboardLayout>
      <MainContent>
        <PageHeader
          title="Dashboard"
          description="Overview of your ChirpSyncer activity"
        />

        <WidgetGrid
          widgets={widgets}
          onLayoutChange={handleLayoutChange}
          onRemoveWidget={handleRemoveWidget}
          onWidgetSettings={handleWidgetSettings}
        />

        <SectionTitle style={{ marginTop: '24px' }}>Recent Activity</SectionTitle>
        <Card padding="lg">
          <EmptyState
            icon={Activity}
            title="No recent activity"
            description="Start by adding credentials and syncing your accounts."
            action={
              <Link href="/dashboard/credentials" passHref>
                <Button variant="primary">
                  <Key size={16} />
                  Manage Credentials
                </Button>
              </Link>
            }
          />
        </Card>
      </MainContent>

      {!isComplete && (
        <Sidebar>
          <OnboardingChecklist />
        </Sidebar>
      )}
    </DashboardLayout>
  );
}

export default function DashboardPage() {
  return (
    <OnboardingProvider>
      <DashboardContent />
    </OnboardingProvider>
  );
}
