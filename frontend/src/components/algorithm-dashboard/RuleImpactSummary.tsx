/**
 * Sprint 20: Rule Impact Summary
 * Lists top 5 most impactful rules with sorting and interactions
 */

import React, { useState, useMemo, useCallback } from 'react';

export interface RuleImpact {
  id: string;
  name: string;
  type: 'boost' | 'demote' | 'filter';
  postsAffected: number;
  averageImpact?: number;
}

export interface RuleImpactSummaryProps {
  rules: RuleImpact[];
  totalPosts?: number;
  sortBy?: 'impact' | 'postsAffected';
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (sortBy: 'impact' | 'postsAffected', sortOrder: 'asc' | 'desc') => void;
  onViewDetails?: (ruleId: string) => void;
  onRuleClick?: (ruleId: string) => void;
  onViewAllClick?: () => void;
}

const MAX_DISPLAYED_RULES = 5;

const TYPE_COLORS: Record<RuleImpact['type'], string> = {
  boost: '#22c55e',
  demote: '#f97316',
  filter: '#ef4444',
};

const TYPE_LABELS: Record<RuleImpact['type'], string> = {
  boost: 'Boost',
  demote: 'Demote',
  filter: 'Filter',
};

export function RuleImpactSummary({
  rules,
  totalPosts,
  sortBy: controlledSortBy,
  sortOrder: controlledSortOrder,
  onSortChange,
  onViewDetails,
  onRuleClick,
  onViewAllClick,
}: RuleImpactSummaryProps) {
  const [internalSortBy, setInternalSortBy] = useState<'impact' | 'postsAffected'>('impact');
  const [internalSortOrder, setInternalSortOrder] = useState<'asc' | 'desc'>('desc');

  const sortBy = controlledSortBy ?? internalSortBy;
  const sortOrder = controlledSortOrder ?? internalSortOrder;

  const handleRuleClick = useCallback(
    (ruleId: string) => {
      onViewDetails?.(ruleId);
      onRuleClick?.(ruleId);
    },
    [onViewDetails, onRuleClick]
  );

  const handleSortClick = useCallback(
    (newSortBy: 'impact' | 'postsAffected') => {
      let newSortOrder: 'asc' | 'desc';

      if (sortBy === newSortBy) {
        // Toggle between asc and desc
        newSortOrder = sortOrder === 'desc' ? 'asc' : 'desc';
      } else {
        // Default to descending when switching to a new sort field
        newSortOrder = 'desc';
      }

      if (onSortChange) {
        onSortChange(newSortBy, newSortOrder);
      } else {
        setInternalSortBy(newSortBy);
        setInternalSortOrder(newSortOrder);
      }
    },
    [sortBy, sortOrder, onSortChange]
  );

  const sortedRules = useMemo(() => {
    const sorted = [...rules].sort((a, b) => {
      let comparison: number;

      if (sortBy === 'impact') {
        const aImpact = a.averageImpact ?? 0;
        const bImpact = b.averageImpact ?? 0;
        comparison = Math.abs(aImpact) - Math.abs(bImpact);
      } else {
        comparison = a.postsAffected - b.postsAffected;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted.slice(0, MAX_DISPLAYED_RULES);
  }, [rules, sortBy, sortOrder]);

  const getPostsAffectedPercentage = useCallback(
    (postsAffected: number): number => {
      if (!totalPosts || totalPosts === 0) return 0;
      return Math.round((postsAffected / totalPosts) * 100);
    },
    [totalPosts]
  );

  const formatAverageImpact = (impact: number): string => {
    return impact >= 0 ? `+${impact} avg` : `${impact} avg`;
  };

  if (rules.length === 0) {
    return (
      <div
        data-testid="rule-impact-summary"
        className="rule-impact-summary rule-impact-summary--empty"
        role="region"
        aria-label="Rule Impact Summary"
      >
        <div className="rule-impact-summary__empty-state">
          <p className="rule-impact-summary__empty-title">No rules configured</p>
          <p className="rule-impact-summary__empty-description">
            Create rules to customize your feed
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="rule-impact-summary"
      className="rule-impact-summary"
      role="region"
      aria-label="Rule Impact Summary"
    >
      <div className="rule-impact-summary__header">
        <h3 className="rule-impact-summary__title">Top Rules</h3>
        <div className="rule-impact-summary__sort-controls" role="group" aria-label="Sort options">
          <button
            type="button"
            onClick={() => handleSortClick('impact')}
            aria-pressed={sortBy === 'impact'}
            className={`rule-impact-summary__sort-button ${
              sortBy === 'impact' ? 'rule-impact-summary__sort-button--active' : ''
            }`}
          >
            Sort by impact
            {sortBy === 'impact' && (
              <span aria-hidden="true">{sortOrder === 'asc' ? ' \u2191' : ' \u2193'}</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleSortClick('postsAffected')}
            aria-pressed={sortBy === 'postsAffected'}
            className={`rule-impact-summary__sort-button ${
              sortBy === 'postsAffected' ? 'rule-impact-summary__sort-button--active' : ''
            }`}
          >
            Sort by posts affected
            {sortBy === 'postsAffected' && (
              <span aria-hidden="true">{sortOrder === 'asc' ? ' \u2191' : ' \u2193'}</span>
            )}
          </button>
        </div>
      </div>

      <ul className="rule-impact-summary__list" role="list" aria-label="Impact rules list">
        {sortedRules.map((rule) => {
          const percentage = getPostsAffectedPercentage(rule.postsAffected);
          const showImpact = rule.type !== 'filter' && rule.averageImpact !== undefined;

          return (
            <li
              key={rule.id}
              data-testid={`rule-impact-item-${rule.id}`}
              className="rule-impact-summary__item"
              onClick={() => handleRuleClick(rule.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleRuleClick(rule.id);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`${rule.name}, ${TYPE_LABELS[rule.type]} rule, ${rule.postsAffected} posts affected`}
            >
              <div className="rule-impact-summary__item-header">
                <span className="rule-impact-summary__rule-name">{rule.name}</span>
                <span
                  data-testid={`type-badge-${rule.type}`}
                  className="rule-impact-summary__type-badge"
                  style={{ backgroundColor: TYPE_COLORS[rule.type] }}
                  aria-label={`Rule type: ${TYPE_LABELS[rule.type]}`}
                >
                  {TYPE_LABELS[rule.type]}
                </span>
              </div>

              <div className="rule-impact-summary__item-stats">
                <span className="rule-impact-summary__posts-affected">
                  {rule.postsAffected} posts
                </span>
                {showImpact && (
                  <span
                    className={`rule-impact-summary__average-impact ${
                      rule.averageImpact! >= 0
                        ? 'rule-impact-summary__average-impact--positive'
                        : 'rule-impact-summary__average-impact--negative'
                    }`}
                  >
                    {formatAverageImpact(rule.averageImpact!)}
                  </span>
                )}
              </div>

              {totalPosts && totalPosts > 0 && (
                <div className="rule-impact-summary__progress-container">
                  <div
                    role="progressbar"
                    aria-valuenow={percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${percentage}% of posts affected`}
                    className="rule-impact-summary__progress-bar"
                    style={{ width: `${percentage}%`, backgroundColor: TYPE_COLORS[rule.type] }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="rule-impact-summary__footer">
        <a
          href="#view-all-rules"
          onClick={(e) => {
            e.preventDefault();
            onViewAllClick?.();
          }}
          className="rule-impact-summary__view-all-link"
          aria-label="View all rules"
        >
          View all rules
        </a>
      </div>
    </div>
  );
}
