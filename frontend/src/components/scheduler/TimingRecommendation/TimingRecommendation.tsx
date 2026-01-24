'use client';

import { useState, useCallback, useMemo, memo, type FC } from 'react';
import styled, { css } from 'styled-components';
import { Clock } from 'lucide-react';
import { Card, Stack, SectionTitle, Button, EmptyState, SmallText } from '@/components/ui';
import { type BestSlot, type ScoreLevel, getScoreLevel } from '../types';

// Re-export type for backwards compatibility
export type { BestSlot };

export interface TimingRecommendationProps {
  bestSlots: BestSlot[];
  onSlotSelect?: (slot: BestSlot) => void;
}

const SlotItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  background-color: ${({ theme }) => theme.colors.background.primary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary[300]};
    background-color: ${({ theme }) => theme.colors.surface.primary.bg};
  }
`;

const scoreLevelStyles = {
  high: css`
    background-color: ${({ theme }) => theme.colors.surface.success.bg};
    color: ${({ theme }) => theme.colors.surface.success.text};
  `,
  medium: css`
    background-color: ${({ theme }) => theme.colors.surface.warning.bg};
    color: ${({ theme }) => theme.colors.surface.warning.text};
  `,
  low: css`
    background-color: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.secondary};
  `,
};

const ScoreBadge = styled.span<{ $level: ScoreLevel }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};

  ${({ $level }) => scoreLevelStyles[$level]}
`;

export const TimingRecommendation: FC<TimingRecommendationProps> = memo(({
  bestSlots,
  onSlotSelect,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const sortedSlots = useMemo(
    () => [...bestSlots].sort((a, b) => b.score - a.score),
    [bestSlots]
  );

  const handleSlotClick = useCallback(
    (slot: BestSlot) => {
      onSlotSelect?.(slot);
    },
    [onSlotSelect]
  );

  const handleUseTimeClick = useCallback(
    (e: React.MouseEvent, slot: BestSlot) => {
      e.stopPropagation();
      onSlotSelect?.(slot);
    },
    [onSlotSelect]
  );

  const handleMouseEnter = useCallback((index: number) => {
    setHoveredIndex(index);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  if (sortedSlots.length === 0) {
    return (
      <Card padding="lg" data-testid="timing-recommendation">
        <SectionTitle style={{ marginBottom: '16px' }}>Best Times to Post</SectionTitle>
        <EmptyState
          icon={Clock}
          title="No recommendations"
          description="Sync more posts to get timing recommendations"
        />
      </Card>
    );
  }

  return (
    <Card padding="lg" data-testid="timing-recommendation">
      <SectionTitle style={{ marginBottom: '16px' }}>Best Times to Post</SectionTitle>
      <Stack gap={2}>
        {sortedSlots.map((slot, index) => {
          const scoreLevel = getScoreLevel(slot.score);
          const isHovered = hoveredIndex === index;

          return (
            <SlotItem
              key={`${slot.day}-${slot.hour}`}
              data-testid={`recommendation-slot-${index}`}
              onClick={() => handleSlotClick(slot)}
              onMouseEnter={() => handleMouseEnter(index)}
              onMouseLeave={handleMouseLeave}
            >
              <Stack direction="row" align="center" gap={3}>
                <SmallText>{slot.label}</SmallText>
                <ScoreBadge
                  data-testid={`score-badge-${index}`}
                  data-score-level={scoreLevel}
                  $level={scoreLevel}
                >
                  {slot.score}%
                </ScoreBadge>
              </Stack>
              {isHovered && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={(e) => handleUseTimeClick(e, slot)}
                >
                  Use this time
                </Button>
              )}
            </SlotItem>
          );
        })}
      </Stack>
    </Card>
  );
});

TimingRecommendation.displayName = 'TimingRecommendation';
