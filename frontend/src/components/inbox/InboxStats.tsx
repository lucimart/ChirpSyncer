'use client';

import { memo, FC } from 'react';
import styled, { css } from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';
import { Inbox, CheckCircle2, AtSign, MessageCircle, Mail, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Stack } from '@/components/ui/Stack';
import { Spinner } from '@/components/ui/Spinner';
import type { InboxStats as InboxStatsType, MessageType } from '@/lib/inbox';
import { AVAILABLE_CONNECTORS } from '@/lib/connectors';

export interface InboxStatsProps {
  stats?: InboxStatsType;
  isLoading?: boolean;
  variant?: 'default' | 'compact';
  showTypeBreakdown?: boolean;
}

const StatsContainer = styled.div<{ $variant: 'default' | 'compact' }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[4]};
  background-color: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.lg};

  ${({ $variant, theme }) =>
    $variant === 'compact' &&
    css`
      padding: ${theme.spacing[3]};
      gap: ${theme.spacing[2]};
    `}
`;

const TotalSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const TotalCount = styled.span`
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const TotalLabel = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const PlatformList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const PlatformStat = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  background-color: ${({ theme }) => theme.colors.background.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const PlatformIcon = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  background-color: ${({ $color }) => $color};
  color: white;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
`;

const PlatformCount = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ZeroState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[4]};
  text-align: center;
`;

const ZeroIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background-color: ${({ theme }) => theme.colors.success[100]};
  color: ${({ theme }) => theme.colors.success[600]};
`;

const ZeroText = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const LoadingContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[6]};
`;

const TypeBreakdown = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
  padding-top: ${({ theme }) => theme.spacing[3]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const TypeLabel = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const TypeList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const TYPE_CONFIG: Record<MessageType, { label: string; icon: typeof AtSign }> = {
  mention: { label: 'Mentions', icon: AtSign },
  reply: { label: 'Replies', icon: MessageCircle },
  dm: { label: 'DMs', icon: Mail },
  comment: { label: 'Comments', icon: MessageSquare },
};

function getPlatformInfo(platform: string) {
  const connector = AVAILABLE_CONNECTORS.find((c) => c.platform === platform);
  return connector || { icon: '?', color: '#666', name: platform };
}

export const InboxStats: FC<InboxStatsProps> = memo(
  ({ stats, isLoading = false, variant = 'default', showTypeBreakdown = false }) => {
    const prefersReducedMotion = useReducedMotion();

    if (isLoading) {
      return (
        <StatsContainer
          $variant={variant}
          data-testid="inbox-stats-loading"
          data-variant={variant}
        >
          <LoadingContainer>
            <Spinner size="md" />
          </LoadingContainer>
        </StatsContainer>
      );
    }

    if (!stats) {
      return null;
    }

    const platformEntries = Object.entries(stats.by_platform).filter(
      ([, count]) => count > 0
    );

    if (stats.total_unread === 0) {
      return (
        <StatsContainer
          $variant={variant}
          data-testid="inbox-stats"
          data-variant={variant}
        >
          <ZeroState>
            <ZeroIcon>
              <CheckCircle2 size={24} />
            </ZeroIcon>
            <ZeroText>All caught up!</ZeroText>
          </ZeroState>
        </StatsContainer>
      );
    }

    const countAnimation = prefersReducedMotion
      ? {}
      : {
          initial: { scale: 0.8, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          transition: { duration: 0.3 },
        };

    return (
      <StatsContainer
        $variant={variant}
        data-testid="inbox-stats"
        data-variant={variant}
      >
        <TotalSection>
          <motion.div {...countAnimation}>
            <TotalCount>{stats.total_unread}</TotalCount>
          </motion.div>
          <TotalLabel>unread messages</TotalLabel>
        </TotalSection>

        {platformEntries.length > 0 && (
          <PlatformList>
            {platformEntries.map(([platform, count]) => {
              const info = getPlatformInfo(platform);
              return (
                <PlatformStat
                  key={platform}
                  data-testid={`platform-stat-${platform}`}
                >
                  <PlatformIcon
                    $color={info.color}
                    data-testid={`platform-icon-${platform}`}
                  >
                    {info.icon}
                  </PlatformIcon>
                  <PlatformCount>{count}</PlatformCount>
                </PlatformStat>
              );
            })}
          </PlatformList>
        )}

        {showTypeBreakdown && (
          <TypeBreakdown>
            <TypeLabel>By Type</TypeLabel>
            <TypeList>
              {(Object.entries(stats.by_type) as [MessageType, number][])
                .filter(([, count]) => count > 0)
                .map(([type, count]) => {
                  const config = TYPE_CONFIG[type];
                  const Icon = config.icon;
                  return (
                    <Badge
                      key={type}
                      size="sm"
                      variant="neutral-soft"
                      leftIcon={<Icon size={12} />}
                    >
                      {config.label}: {count}
                    </Badge>
                  );
                })}
            </TypeList>
          </TypeBreakdown>
        )}
      </StatsContainer>
    );
  }
);

InboxStats.displayName = 'InboxStats';
