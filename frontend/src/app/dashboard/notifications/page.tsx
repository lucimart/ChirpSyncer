'use client';

/**
 * Notifications Page
 *
 * Full notifications management page with tabs, filters, and settings.
 */

import { useState, useCallback } from 'react';
import styled from 'styled-components';
import { Bell, Settings, CheckCheck } from 'lucide-react';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Stack } from '@/components/ui/Stack';
import { NotificationList } from '@/components/notifications/NotificationList';
import { PreferencesPanel } from '@/components/notifications/PreferencesPanel';
import {
  useMarkAllNotificationsRead,
  type NotificationFilters,
  type NotificationCategory,
} from '@/lib/notifications';

const PageContainer = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing[6]};
`;

const PageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const PageIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background-color: ${({ theme }) => theme.colors.primary[100]};
  color: ${({ theme }) => theme.colors.primary[600]};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
`;

const PageTitle = styled.h1`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const TabsContainer = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const ContentContainer = styled.div`
  min-height: 400px;
`;

// Category tabs configuration
const CATEGORY_TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'sync', label: 'Sync' },
  { id: 'alert', label: 'Alerts' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'security', label: 'Security' },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState('all');
  const markAllAsRead = useMarkAllNotificationsRead();

  const handleMarkAllAsRead = useCallback(() => {
    markAllAsRead.mutate();
  }, [markAllAsRead]);

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
  }, []);

  // Build filters based on active tab
  const getFilters = (): Omit<NotificationFilters, 'page'> | undefined => {
    if (activeTab === 'all' || activeTab === 'settings') {
      return undefined;
    }
    if (activeTab === 'unread') {
      return { is_read: false };
    }
    // Category filter
    return { category: activeTab as NotificationCategory };
  };

  const isSettingsTab = activeTab === 'settings';

  return (
    <PageContainer>
      <PageHeader>
        <HeaderLeft>
          <PageIcon>
            <Bell size={24} />
          </PageIcon>
          <PageTitle>Notifications</PageTitle>
        </HeaderLeft>

        {!isSettingsTab && (
          <HeaderActions>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsRead.isPending}
              leftIcon={<CheckCheck size={16} />}
            >
              {markAllAsRead.isPending ? 'Marking...' : 'Mark all as read'}
            </Button>
          </HeaderActions>
        )}
      </PageHeader>

      <TabsContainer>
        <Tabs
          items={CATEGORY_TABS}
          value={activeTab}
          onChange={handleTabChange}
          variant="soft"
          size="md"
        />
      </TabsContainer>

      <ContentContainer>
        {isSettingsTab ? (
          <PreferencesPanel />
        ) : (
          <Card>
            <NotificationList filters={getFilters()} />
          </Card>
        )}
      </ContentContainer>
    </PageContainer>
  );
}
