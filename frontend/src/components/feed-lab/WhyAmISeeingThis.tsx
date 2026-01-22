/**
 * Sprint 20: Why Am I Seeing This
 * Explains why a post appears in the user's feed
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { css } from 'styled-components';
import { RuleContributionChart } from '@/components/feed-lab/RuleContributionChart';
import { useFeedExplanation } from '@/hooks/useFeedExplanation';
import { Spinner } from '@/components/ui';

export interface MatchedCondition {
  field: string;
  operator: string;
  value: string;
}

export interface AppliedRule {
  ruleId: string;
  ruleName: string;
  type: 'boost' | 'demote' | 'filter';
  contribution: number;
  percentage: number;
  matchedConditions: MatchedCondition[];
}

export interface FeedExplanation {
  postId: string;
  baseScore: number;
  totalScore: number;
  appliedRules: AppliedRule[];
  feedPosition?: number;
}

export interface WhyAmISeeingThisProps {
  postId: string;
  explanation?: FeedExplanation;
  isLoading?: boolean;
  error?: string | null;
  onClose?: () => void;
  variant?: 'button' | 'inline';
}

const TriggerButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  transition: color ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.primary[600]};
  }
`;

const InlineLoading = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const InlineError = styled.div`
  color: ${({ theme }) => theme.colors.danger[600]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.5);
  padding: ${({ theme }) => theme.spacing[4]};
`;

const ModalContainer = styled.div`
  background-color: ${({ theme }) => theme.colors.background.primary};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: ${({ theme }) => theme.shadows.xl};
  max-width: 32rem;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const ModalTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  margin: 0;
`;

const HeaderActions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.text.secondary};
  transition: color ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const ModalContent = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
`;

const ContentLoading = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[8]} 0;
`;

const ContentError = styled.div`
  color: ${({ theme }) => theme.colors.danger[600]};
  text-align: center;
  padding: ${({ theme }) => theme.spacing[8]} 0;
`;

const ExplanationWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const ScoresCard = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.background.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
`;

const ScoreLabel = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
`;

const ScoreValue = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  margin: 0;
`;

const ScoreBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const RulesSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const RulesTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const RuleCardContainer = styled.div<{ $variant?: 'boost' | 'demote' }>`
  padding: ${({ theme }) => theme.spacing[4]};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  border-left: 4px solid transparent;

  ${({ $variant, theme }) =>
    $variant === 'boost' &&
    css`
      background: ${theme.colors.success[50]};
      border-left-color: ${theme.colors.success[500]};
    `}

  ${({ $variant, theme }) =>
    $variant === 'demote' &&
    css`
      background: ${theme.colors.danger[50]};
      border-left-color: ${theme.colors.danger[500]};
    `}
`;

const RuleHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const RuleName = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const Contribution = styled.span<{ $positive?: boolean }>`
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme, $positive }) =>
    $positive ? theme.colors.success[600] : theme.colors.danger[600]};
`;

const PercentText = styled.span`
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
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ConditionItem = styled.li`
  margin-left: ${({ theme }) => theme.spacing[2]};
`;

const EmptyBox = styled.div`
  text-align: center;
  padding: ${({ theme }) => `${theme.spacing[6]} ${theme.spacing[4]}`};
  background: ${({ theme }) => theme.colors.background.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
`;

const EmptyTitle = styled.p`
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const EmptyDescription = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: ${({ theme }) => theme.spacing[1]} 0 0;
`;

const InfoIcon = () => (
  <svg
    data-testid="info-icon"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const RefreshIcon = () => (
  <svg
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

const formatCondition = (condition: MatchedCondition): string => {
  return `${condition.field} ${condition.operator} "${condition.value}"`;
};

const formatContribution = (contribution: number): string => {
  if (contribution >= 0) {
    return `+${contribution}`;
  }
  return `${contribution}`;
};

export function WhyAmISeeingThis({
  postId,
  explanation: externalExplanation,
  isLoading: externalLoading,
  error: externalError,
  onClose,
  variant = 'button',
}: WhyAmISeeingThisProps) {
  const [isOpen, setIsOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = `explanation-title-${postId}`;

  // Use hook if no external data provided
  const hookResult = useFeedExplanation(isOpen && !externalExplanation ? postId : null);

  const explanation = externalExplanation || (hookResult.data as FeedExplanation | null);
  const hookIsLoading = hookResult.isLoading;
  const hookError = hookResult.error?.message ?? null;
  const refetch = hookResult.refetch;

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  // Focus close button when modal opens
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Handle click outside
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  // Loading state passed as prop - show loading indicator
  if (externalLoading) {
    return (
      <div data-testid="why-seeing-this">
        <InlineLoading data-testid="explanation-loading">
          <Spinner size="xs" />
          Loading...
        </InlineLoading>
      </div>
    );
  }

  // Error state passed as prop - show error message
  if (externalError && !isOpen) {
    return (
      <div data-testid="why-seeing-this">
        <InlineError>{externalError}</InlineError>
      </div>
    );
  }

  return (
    <div data-testid="why-seeing-this">
      {/* Trigger Button */}
      <TriggerButton
        type="button"
        onClick={handleOpen}
        aria-label="Why am I seeing this post?"
      >
        <InfoIcon />
        Why am I seeing this?
      </TriggerButton>

      {/* Modal */}
      {isOpen && (
          <Overlay onClick={handleBackdropClick}>
            <ModalContainer
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              {/* Header */}
              <ModalHeader>
                <ModalTitle id={titleId}>Feed Explanation</ModalTitle>
                <HeaderActions>
                  <IconButton
                    type="button"
                    onClick={refetch}
                    aria-label="Refresh explanation"
                  >
                    <RefreshIcon />
                  </IconButton>
                  <IconButton
                    ref={closeButtonRef}
                    type="button"
                    onClick={handleClose}
                    aria-label="Close"
                  >
                    <svg
                      width="20"
                      height="20"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </IconButton>
                </HeaderActions>
              </ModalHeader>

            {/* Content */}
              <ModalContent>
                {hookIsLoading ? (
                  <ContentLoading data-testid="explanation-loading">
                    <Spinner size="md" />
                  </ContentLoading>
                ) : hookError ? (
                  <ContentError>{hookError}</ContentError>
                ) : explanation ? (
                  <ExplanationContent explanation={explanation} />
                ) : (
                  <EmptyState />
                )}
              </ModalContent>
            </ModalContainer>
          </Overlay>
      )}
    </div>
  );
}

interface ExplanationContentProps {
  explanation: FeedExplanation;
}

function ExplanationContent({ explanation }: ExplanationContentProps) {
  const { baseScore, totalScore, appliedRules, feedPosition } = explanation;
  const hasRules = appliedRules.length > 0;

  return (
    <ExplanationWrapper>
      {/* Scores */}
      <ScoresCard data-testid="explanation-scores">
        <ScoreBlock>
          <ScoreLabel>Base Score: {baseScore}</ScoreLabel>
          <ScoreValue>Total Score: {totalScore}</ScoreValue>
        </ScoreBlock>
        {feedPosition !== undefined && (
          <ScoreBlock style={{ textAlign: 'right' }}>
            <ScoreLabel>Position in Feed</ScoreLabel>
            <ScoreValue>#{feedPosition}</ScoreValue>
          </ScoreBlock>
        )}
      </ScoresCard>

      {hasRules && (
        <RuleContributionChart explanation={explanation} />
      )}

      {/* Rules or Empty State */}
      {hasRules ? (
        <RulesSection data-testid="explanation-rules">
          <RulesTitle>Applied Rules</RulesTitle>
          {appliedRules.map((rule) => (
            <RuleCard key={rule.ruleId} rule={rule} />
          ))}
        </RulesSection>
      ) : (
        <EmptyState />
      )}
    </ExplanationWrapper>
  );
}

interface RuleCardProps {
  rule: AppliedRule;
}

function RuleCard({ rule }: RuleCardProps) {
  const isBoost = rule.type === 'boost' || rule.contribution > 0;
  const isDemote = rule.type === 'demote' || rule.contribution < 0;

  return (
    <RuleCardContainer
      data-testid={`rule-contribution-${rule.ruleId}`}
      $variant={isBoost ? 'boost' : isDemote ? 'demote' : undefined}
    >
      <RuleHeader>
        <RuleName>{rule.ruleName}</RuleName>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Contribution $positive={isBoost}>{formatContribution(rule.contribution)}</Contribution>
          {rule.percentage !== undefined && (
            <PercentText>
              ({rule.percentage >= 0 ? '' : '-'}{Math.abs(rule.percentage)}%)
            </PercentText>
          )}
        </div>
      </RuleHeader>

      {rule.matchedConditions && rule.matchedConditions.length > 0 && (
        <ConditionsBlock>
          <ConditionsTitle>Matched Conditions:</ConditionsTitle>
          <ConditionsList>
            {rule.matchedConditions.map((condition, idx) => (
              <ConditionItem key={idx}>{formatCondition(condition)}</ConditionItem>
            ))}
          </ConditionsList>
        </ConditionsBlock>
      )}
    </RuleCardContainer>
  );
}

function EmptyState() {
  return (
    <EmptyBox>
      <EmptyTitle>Default chronological order</EmptyTitle>
      <EmptyDescription>No custom rules applied</EmptyDescription>
    </EmptyBox>
  );
}
