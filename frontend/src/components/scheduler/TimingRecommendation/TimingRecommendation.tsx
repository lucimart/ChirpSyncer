'use client';

import styled, { css } from 'styled-components';
import { useState } from 'react';

export interface BestSlot {
  day: number;
  hour: number;
  score: number;
  label: string;
}

export interface TimingRecommendationProps {
  bestSlots: BestSlot[];
  onSlotSelect?: (slot: BestSlot) => void;
}

type ScoreLevel = 'high' | 'medium' | 'low';

const getScoreLevel = (score: number): ScoreLevel => {
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
};

const Container = styled.div`
  background-color: ${({ theme }) => theme.colors.background.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  padding: ${({ theme }) => theme.spacing[6]};
`;

const Title = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing[4]} 0;
`;

const SlotList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const SlotItem = styled.li<{ $isHovered: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background-color: ${({ theme }) => theme.colors.background.primary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary[300]};
    background-color: ${({ theme }) => theme.colors.primary[50]};
  }
`;

const SlotInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const SlotLabel = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const scoreLevelStyles = {
  high: css`
    background-color: ${({ theme }) => theme.colors.success[100]};
    color: ${({ theme }) => theme.colors.success[700]};
  `,
  medium: css`
    background-color: ${({ theme }) => theme.colors.warning[100]};
    color: ${({ theme }) => theme.colors.warning[700]};
  `,
  low: css`
    background-color: ${({ theme }) => theme.colors.neutral[100]};
    color: ${({ theme }) => theme.colors.neutral[700]};
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

const UseTimeButton = styled.button`
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  background-color: ${({ theme }) => theme.colors.primary[500]};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme }) => theme.colors.primary[600]};
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[8]} ${({ theme }) => theme.spacing[4]};
`;

const EmptyTitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing[2]} 0;
`;

const EmptySubtitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
`;

export const TimingRecommendation = ({
  bestSlots,
  onSlotSelect,
}: TimingRecommendationProps) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Sort slots by score (highest first)
  const sortedSlots = [...bestSlots].sort((a, b) => b.score - a.score);

  const handleSlotClick = (slot: BestSlot) => {
    onSlotSelect?.(slot);
  };

  if (sortedSlots.length === 0) {
    return (
      <Container data-testid="timing-recommendation">
        <Title>Best Times to Post</Title>
        <EmptyState>
          <EmptyTitle>No recommendations</EmptyTitle>
          <EmptySubtitle>Sync more posts to get timing recommendations</EmptySubtitle>
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container data-testid="timing-recommendation">
      <Title>Best Times to Post</Title>
      <SlotList>
        {sortedSlots.map((slot, index) => {
          const scoreLevel = getScoreLevel(slot.score);
          const isHovered = hoveredIndex === index;

          return (
            <SlotItem
              key={`${slot.day}-${slot.hour}`}
              data-testid={`recommendation-slot-${index}`}
              $isHovered={isHovered}
              onClick={() => handleSlotClick(slot)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <SlotInfo>
                <SlotLabel>{slot.label}</SlotLabel>
                <ScoreBadge
                  data-testid={`score-badge-${index}`}
                  data-score-level={scoreLevel}
                  $level={scoreLevel}
                >
                  {slot.score}%
                </ScoreBadge>
              </SlotInfo>
              {isHovered && (
                <UseTimeButton
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSlotClick(slot);
                  }}
                >
                  Use this time
                </UseTimeButton>
              )}
            </SlotItem>
          );
        })}
      </SlotList>
    </Container>
  );
};

TimingRecommendation.displayName = 'TimingRecommendation';
