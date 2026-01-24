'use client';

import React, { useMemo } from 'react';
import styled from 'styled-components';
import {
  BASE_SCORE,
  formatCondition,
  calculatePercentage,
  formatContribution,
} from '../shared';
import type { Post } from '../shared';

interface ScoreExplainerProps {
  post: Post;
}

const Container = styled.div`
  padding: ${({ theme }) => theme.spacing[6]};
  background: ${({ theme }) => theme.colors.background.primary};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: ${({ theme }) => theme.shadows.md};
`;

const Title = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing[4]} 0;
`;

const TotalScoreText = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing[4]} 0;
`;

const ProgressBarContainer = styled.div`
  margin-top: ${({ theme }) => theme.spacing[4]};
`;

const ProgressTrack = styled.div`
  position: relative;
  width: 100%;
  height: 32px;
  background: ${({ theme }) => theme.colors.background.tertiary};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  overflow: hidden;
`;

const ProgressSegment = styled.div<{ $variant: 'base' | 'positive' | 'negative' }>`
  position: absolute;
  top: 0;
  height: 100%;

  ${({ theme, $variant }) => {
    switch ($variant) {
      case 'base':
        return `background: ${theme.colors.primary[300]};`;
      case 'positive':
        return `background: ${theme.colors.success[400]};`;
      case 'negative':
        return `background: ${theme.colors.danger[400]};`;
    }
  }}
`;

const RulesContainer = styled.div`
  margin-top: ${({ theme }) => theme.spacing[6]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const BaseScoreCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.surface.primary.bg};
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const BaseScoreLabel = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const BaseScoreValue = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const EmptyState = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.background.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  text-align: center;
`;

const EmptyTitle = styled.p`
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
`;

const EmptySubtitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin: ${({ theme }) => theme.spacing[1]} 0 0 0;
`;

const RulesListContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const RuleCard = styled.div<{ $positive: boolean }>`
  padding: ${({ theme }) => theme.spacing[4]};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  border-left: 4px solid ${({ theme, $positive }) =>
    $positive ? theme.colors.success[500] : theme.colors.danger[500]};
  background: ${({ theme, $positive }) =>
    $positive ? theme.colors.surface.success.bg : theme.colors.surface.danger.bg};
`;

const RuleHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const RuleName = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const RuleContributionContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const ContributionValue = styled.span<{ $positive: boolean }>`
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme, $positive }) =>
    $positive ? theme.colors.success[600] : theme.colors.danger[600]};
`;

const PercentageText = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const ConditionsBlock = styled.div`
  margin-top: ${({ theme }) => theme.spacing[2]};
  padding-top: ${({ theme }) => theme.spacing[2]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const ConditionsTitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0 0 ${({ theme }) => theme.spacing[1]} 0;
`;

const ConditionsList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const ConditionItem = styled.li`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-left: ${({ theme }) => theme.spacing[2]};
`;

export const ScoreExplainer: React.FC<ScoreExplainerProps> = ({ post }) => {
  const totalScore = post.score;
  const appliedRules = post.appliedRules || [];
  const hasRules = appliedRules.length > 0;

  const { positiveRules, negativeRules, maxScore, baseWidth } = useMemo(() => {
    const positive = appliedRules.filter((r) => r.contribution > 0);
    const negative = appliedRules.filter((r) => r.contribution < 0);
    const max = Math.max(200, totalScore);
    const base = (BASE_SCORE / max) * 100;
    return { positiveRules: positive, negativeRules: negative, maxScore: max, baseWidth: base };
  }, [appliedRules, totalScore]);

  const renderProgressBar = () => {
    return (
      <ProgressBarContainer>
        <ProgressTrack
          role="progressbar"
          aria-valuenow={totalScore}
          aria-valuemin={0}
          aria-valuemax={maxScore}
          aria-label={`Score breakdown: ${totalScore} out of ${maxScore}`}
        >
          {/* Base score segment */}
          <ProgressSegment
            $variant="base"
            style={{ left: 0, width: `${baseWidth}%` }}
          />

          {/* Positive contributions */}
          {positiveRules.map((rule, index) => {
            const width = (rule.contribution / maxScore) * 100;
            const previousPositive = positiveRules
              .slice(0, index)
              .reduce((sum, r) => sum + r.contribution, 0);
            const left = ((BASE_SCORE + previousPositive) / maxScore) * 100;

            return (
              <ProgressSegment
                key={rule.ruleId}
                data-testid={`positive-segment-${index}`}
                $variant="positive"
                style={{ left: `${left}%`, width: `${width}%` }}
              />
            );
          })}

          {/* Negative contributions */}
          {negativeRules.map((rule, index) => {
            const width = (Math.abs(rule.contribution) / maxScore) * 100;
            const previousNegative = negativeRules
              .slice(0, index)
              .reduce((sum, r) => sum + r.contribution, 0);
            const totalPositive = positiveRules.reduce((sum, r) => sum + r.contribution, 0);
            const left = ((BASE_SCORE + totalPositive + previousNegative) / maxScore) * 100;

            return (
              <ProgressSegment
                key={rule.ruleId}
                data-testid={`negative-segment-${index}`}
                $variant="negative"
                style={{ left: `${left}%`, width: `${width}%` }}
              />
            );
          })}
        </ProgressTrack>
      </ProgressBarContainer>
    );
  };

  return (
    <Container data-testid="score-explainer">
      <Title>Score Breakdown</Title>

      <TotalScoreText>Total Score: {totalScore}</TotalScoreText>

      {renderProgressBar()}

      <RulesContainer>
        <BaseScoreCard>
          <BaseScoreLabel>Base Score</BaseScoreLabel>
          <BaseScoreValue>{BASE_SCORE}</BaseScoreValue>
        </BaseScoreCard>

        {!hasRules ? (
          <EmptyState>
            <EmptyTitle>No rules applied</EmptyTitle>
            <EmptySubtitle>Base score only</EmptySubtitle>
          </EmptyState>
        ) : (
          <RulesListContainer>
            {appliedRules.map((rule) => {
              const percentage = calculatePercentage(rule.contribution, totalScore);
              const isPositive = rule.contribution >= 0;

              return (
                <RuleCard key={rule.ruleId} $positive={isPositive}>
                  <RuleHeader>
                    <RuleName>{rule.ruleName}</RuleName>
                    <RuleContributionContainer>
                      <ContributionValue $positive={isPositive}>
                        {formatContribution(rule.contribution)}
                      </ContributionValue>
                      <PercentageText>({percentage.toFixed(1)}%)</PercentageText>
                    </RuleContributionContainer>
                  </RuleHeader>

                  {rule.matchedConditions && rule.matchedConditions.length > 0 && (
                    <ConditionsBlock>
                      <ConditionsTitle>Matched Conditions:</ConditionsTitle>
                      <ConditionsList>
                        {rule.matchedConditions.map((condition, idx) => (
                          <ConditionItem key={idx}>
                            • {formatCondition(condition)}
                          </ConditionItem>
                        ))}
                      </ConditionsList>
                    </ConditionsBlock>
                  )}
                </RuleCard>
              );
            })}
          </RulesListContainer>
        )}
      </RulesContainer>
    </Container>
  );
};
