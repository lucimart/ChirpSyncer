/**
 * Sprint 20: Why Am I Seeing This
 * Explains why a post appears in the user's feed
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RuleContributionChart } from '@/components/feed-lab/RuleContributionChart';
import { useFeedExplanation } from '@/hooks/useFeedExplanation';

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

const InfoIcon = () => (
  <svg
    data-testid="info-icon"
    className="w-4 h-4 mr-1"
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
    className="w-4 h-4"
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
        <div data-testid="explanation-loading" className="flex items-center text-gray-500">
          <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full mr-2" />
          Loading...
        </div>
      </div>
    );
  }

  // Error state passed as prop - show error message
  if (externalError && !isOpen) {
    return (
      <div data-testid="why-seeing-this" className="text-red-500 text-sm">
        {externalError}
      </div>
    );
  }

  return (
    <div data-testid="why-seeing-this">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Why am I seeing this post?"
        className="flex items-center text-sm text-gray-600 hover:text-blue-600 transition-colors"
      >
        <InfoIcon />
        Why am I seeing this?
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={handleBackdropClick}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 id={titleId} className="text-lg font-semibold">
                Feed Explanation
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={refetch}
                  aria-label="Refresh explanation"
                  className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                >
                  <RefreshIcon />
                </button>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={handleClose}
                  aria-label="Close"
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
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
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {hookIsLoading ? (
                <div data-testid="explanation-loading" className="flex items-center justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full" />
                </div>
              ) : hookError ? (
                <div className="text-red-500 text-center py-8">
                  {hookError}
                </div>
              ) : explanation ? (
                <ExplanationContent explanation={explanation} />
              ) : (
                <EmptyState />
              )}
            </div>
          </div>
        </div>
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
    <div className="space-y-4">
      {/* Scores */}
      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg" data-testid="explanation-scores">
        <div>
          <p className="text-sm text-gray-600">Base Score: {baseScore}</p>
          <p className="text-lg font-semibold">Total Score: {totalScore}</p>
        </div>
        {feedPosition !== undefined && (
          <div className="text-right">
            <p className="text-sm text-gray-600">Position in Feed</p>
            <p className="text-lg font-semibold">#{feedPosition}</p>
          </div>
        )}
      </div>

      {hasRules && (
        <RuleContributionChart explanation={explanation} />
      )}

      {/* Rules or Empty State */}
      {hasRules ? (
        <div className="space-y-3" data-testid="explanation-rules">
          <h3 className="font-medium text-gray-800">Applied Rules</h3>
          {appliedRules.map((rule) => (
            <RuleCard key={rule.ruleId} rule={rule} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

interface RuleCardProps {
  rule: AppliedRule;
}

function RuleCard({ rule }: RuleCardProps) {
  const isBoost = rule.type === 'boost' || rule.contribution > 0;
  const isDemote = rule.type === 'demote' || rule.contribution < 0;

  return (
    <div
      data-testid={`rule-contribution-${rule.ruleId}`}
      className={`p-4 rounded-lg border-l-4 ${
        isBoost ? 'boost bg-green-50 border-green-500' : ''
      }${isDemote ? 'demote bg-red-50 border-red-500' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">{rule.ruleName}</span>
        <div className="flex items-center gap-2">
          <span
            className={`font-bold ${
              isBoost ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {formatContribution(rule.contribution)}
          </span>
          {rule.percentage !== undefined && (
            <span className="text-sm text-gray-500">
              ({rule.percentage >= 0 ? '' : '-'}{Math.abs(rule.percentage)}%)
            </span>
          )}
        </div>
      </div>

      {rule.matchedConditions && rule.matchedConditions.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs font-semibold text-gray-600 mb-1">
            Matched Conditions:
          </p>
          <ul className="text-sm text-gray-700 space-y-1">
            {rule.matchedConditions.map((condition, idx) => (
              <li key={idx} className="ml-2">
                {formatCondition(condition)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-6 px-4 bg-gray-50 rounded-lg">
      <p className="font-medium text-gray-700">Default chronological order</p>
      <p className="text-sm text-gray-500 mt-1">No custom rules applied</p>
    </div>
  );
}
