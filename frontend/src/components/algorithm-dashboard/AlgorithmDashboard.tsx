/**
 * Sprint 20: Algorithm Dashboard
 * Transparency dashboard showing how the algorithm affects the feed
 */

import React, { useCallback } from 'react';
import { FeedCompositionChart } from './FeedCompositionChart';
import { RuleImpactSummary, RuleImpact as SummaryRuleImpact } from './RuleImpactSummary';

export interface FeedComposition {
  boosted: number;
  demoted: number;
  filtered: number;
  unaffected: number;
}

/** RuleImpact with canonical naming (ruleId, ruleName, ruleType) */
export interface RuleImpactCanonical {
  ruleId: string;
  ruleName: string;
  ruleType: 'boost' | 'demote' | 'filter';
  postsAffected: number;
  averageImpact?: number;
}

/** RuleImpact with short naming (id, name, type) - used by tests */
export interface RuleImpactShort {
  id: string;
  name: string;
  type: 'boost' | 'demote' | 'filter';
  postsAffected: number;
  averageImpact?: number;
}

/** Union type accepting both formats */
export type RuleImpact = RuleImpactCanonical | RuleImpactShort;

export interface AlgorithmStats {
  transparencyScore: number;
  totalRules: number;
  activeRules: number;
  feedComposition: FeedComposition;
  topRules: RuleImpact[];
  lastUpdated: string;
  lastUpdate?: string; // Alias for compatibility with tests
}

export interface AlgorithmDashboardProps {
  stats?: AlgorithmStats;
  isLoading?: boolean;
  error?: Error | null;
  algorithmEnabled?: boolean;
  onToggleAlgorithm?: (enabled: boolean) => void;
  onEditRules?: () => void;
  onViewRule?: (ruleId?: string) => void;
}

/** Threshold for low transparency warning */
const LOW_TRANSPARENCY_THRESHOLD = 50;

/**
 * Formats ISO timestamp to human-readable format
 * e.g., "2025-01-14T10:30:00Z" -> "Jan 14, 10:30 AM"
 */
function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;
    return `${month} ${day}, ${hour12}:${minutes} ${ampm}`;
  } catch {
    return isoString;
  }
}

/**
 * Maps RuleImpact to format expected by RuleImpactSummary
 */
function mapTopRulesToSummaryFormat(topRules: RuleImpact[]): SummaryRuleImpact[] {
  return topRules.map((rule): SummaryRuleImpact => {
    // Handle RuleImpactCanonical format (ruleId, ruleName, ruleType)
    if ('ruleId' in rule) {
      const ruleImpact = rule as RuleImpactCanonical;
      return {
        id: ruleImpact.ruleId,
        name: ruleImpact.ruleName,
        type: ruleImpact.ruleType,
        postsAffected: ruleImpact.postsAffected,
        averageImpact: ruleImpact.averageImpact,
      };
    }
    // Handle RuleImpactShort format (id, name, type) - from tests
    const shortRule = rule as RuleImpactShort;
    return {
      id: shortRule.id,
      name: shortRule.name,
      type: shortRule.type,
      postsAffected: shortRule.postsAffected,
      averageImpact: shortRule.averageImpact,
    };
  });
}

export function AlgorithmDashboard({
  stats,
  isLoading = false,
  error = null,
  algorithmEnabled = true,
  onToggleAlgorithm,
  onEditRules,
  onViewRule,
}: AlgorithmDashboardProps) {
  const handleToggle = useCallback(() => {
    onToggleAlgorithm?.(!algorithmEnabled);
  }, [algorithmEnabled, onToggleAlgorithm]);

  const handleEditRules = useCallback(() => {
    onEditRules?.();
    onViewRule?.();
  }, [onEditRules, onViewRule]);

  const handleRuleClick = useCallback((ruleId: string) => {
    onViewRule?.(ruleId);
  }, [onViewRule]);

  // Loading state
  if (isLoading) {
    return (
      <div
        data-testid="algorithm-dashboard"
        className="algorithm-dashboard algorithm-dashboard--loading"
        aria-busy="true"
        aria-label="Loading algorithm dashboard"
      >
        <div className="algorithm-dashboard__spinner" role="status">
          <span className="visually-hidden">Loading algorithm statistics...</span>
          <div className="spinner" aria-hidden="true" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        data-testid="algorithm-dashboard"
        className="algorithm-dashboard algorithm-dashboard--error"
        role="alert"
        aria-live="polite"
      >
        <div className="algorithm-dashboard__error">
          <h3 className="algorithm-dashboard__error-title">Failed to load algorithm statistics</h3>
          <p className="algorithm-dashboard__error-message">{error.message}</p>
          <button
            type="button"
            className="algorithm-dashboard__retry-button"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Get timestamp from either field
  const lastUpdatedRaw = stats?.lastUpdated || stats?.lastUpdate || '';
  const formattedTimestamp = lastUpdatedRaw ? formatTimestamp(lastUpdatedRaw) : '';

  const transparencyScore = stats?.transparencyScore ?? 0;
  const isLowTransparency = transparencyScore < LOW_TRANSPARENCY_THRESHOLD;

  // Map topRules to correct format (tests use different property names)
  const mappedTopRules = stats?.topRules
    ? mapTopRulesToSummaryFormat(stats.topRules as unknown as RuleImpact[])
    : [];

  return (
    <div
      data-testid="algorithm-dashboard"
      className="algorithm-dashboard"
    >
      {/* Header with toggle */}
      <header className="algorithm-dashboard__header">
        <h2 className="algorithm-dashboard__title">Algorithm Dashboard</h2>

        <div className="algorithm-dashboard__toggle-container">
          <label className="algorithm-dashboard__toggle-label">
            <input
              type="checkbox"
              role="switch"
              aria-label="Enable Algorithmic Sorting"
              checked={algorithmEnabled}
              onChange={handleToggle}
              className="algorithm-dashboard__toggle-input"
            />
            <span className="algorithm-dashboard__toggle-slider" aria-hidden="true" />
            <span className="algorithm-dashboard__toggle-text">
              {algorithmEnabled ? 'Algorithm Enabled' : 'Algorithm Disabled'}
            </span>
          </label>
        </div>
      </header>

      {/* Chronological mode notice when algorithm is disabled */}
      {!algorithmEnabled && (
        <div
          className="algorithm-dashboard__chronological-notice"
          role="status"
          aria-live="polite"
        >
          <p>Chronological mode active</p>
          <p className="algorithm-dashboard__chronological-description">
            Posts are displayed in reverse chronological order. Enable algorithmic sorting to see personalized content.
          </p>
        </div>
      )}

      {/* Main content - only show when algorithm is enabled */}
      {algorithmEnabled && stats && (
        <>
          {/* Transparency Score Section */}
          <section
            className="algorithm-dashboard__section algorithm-dashboard__transparency"
            aria-labelledby="transparency-heading"
          >
            <h3 id="transparency-heading" className="algorithm-dashboard__section-title">
              Transparency Score
            </h3>

            <div className="algorithm-dashboard__score-container">
              <div
                data-testid="transparency-score-indicator"
                className={`algorithm-dashboard__score-indicator ${
                  isLowTransparency ? 'algorithm-dashboard__score-indicator--low' : ''
                }`}
                role="meter"
                aria-valuenow={transparencyScore}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Transparency score: ${transparencyScore} out of 100`}
              >
                <span className="algorithm-dashboard__score-value">{transparencyScore}</span>
                <span className="algorithm-dashboard__score-unit">%</span>
              </div>

              <div
                className="algorithm-dashboard__score-bar"
                style={{ '--score-percentage': `${transparencyScore}%` } as React.CSSProperties}
                aria-hidden="true"
              >
                <div className="algorithm-dashboard__score-bar-fill" />
              </div>
            </div>

            {/* Low transparency warning */}
            {isLowTransparency && (
              <div
                className="algorithm-dashboard__warning"
                role="alert"
              >
                <span className="algorithm-dashboard__warning-icon" aria-hidden="true">⚠️</span>
                <div className="algorithm-dashboard__warning-content">
                  <strong>Low transparency</strong>
                  <p>Consider reviewing your rules to improve transparency.</p>
                </div>
              </div>
            )}
          </section>

          {/* Rules Summary Section */}
          <section
            className="algorithm-dashboard__section algorithm-dashboard__rules-summary"
            aria-labelledby="rules-heading"
          >
            <h3 id="rules-heading" className="algorithm-dashboard__section-title">
              Active Rules
            </h3>

            <div className="algorithm-dashboard__rules-count">
              <span className="algorithm-dashboard__rules-active">
                {stats.activeRules} of {stats.totalRules}
              </span>
              <span className="algorithm-dashboard__rules-label">rules active</span>
            </div>

            <button
              type="button"
              className="algorithm-dashboard__edit-rules-button"
              onClick={handleEditRules}
              aria-label="Edit rules"
            >
              Edit Rules
            </button>
          </section>

          {/* Feed Composition Section */}
          <section
            className="algorithm-dashboard__section algorithm-dashboard__composition"
            aria-labelledby="composition-heading"
          >
            <h3 id="composition-heading" className="algorithm-dashboard__section-title">
              Feed Composition
            </h3>

            <FeedCompositionChart
              composition={stats.feedComposition}
              showLegend
              showPercentages
            />

            {/* Text breakdown for accessibility and test matching */}
            <div className="algorithm-dashboard__composition-breakdown" aria-live="polite">
              <p>{stats.feedComposition.boosted}% boosted</p>
              <p>{stats.feedComposition.demoted}% demoted</p>
              <p>{stats.feedComposition.filtered}% filtered</p>
              <p>{stats.feedComposition.unaffected}% unaffected</p>
            </div>
          </section>

          {/* Top Impactful Rules Section */}
          <section
            className="algorithm-dashboard__section algorithm-dashboard__top-rules"
            aria-labelledby="top-rules-heading"
          >
            <h3 id="top-rules-heading" className="algorithm-dashboard__section-title">
              Top Impactful Rules
            </h3>

            <RuleImpactSummary
              rules={mappedTopRules}
              onRuleClick={handleRuleClick}
            />
          </section>

          {/* Last Updated Footer */}
          {formattedTimestamp && (
            <footer className="algorithm-dashboard__footer">
              <p className="algorithm-dashboard__last-updated">
                <span>Last updated:</span>{' '}
                <time dateTime={lastUpdatedRaw}>{formattedTimestamp}</time>
              </p>
            </footer>
          )}
        </>
      )}
    </div>
  );
}
