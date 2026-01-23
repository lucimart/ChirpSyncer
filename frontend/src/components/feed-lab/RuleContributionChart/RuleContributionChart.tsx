/**
 * Sprint 20: Rule Contribution Chart
 * Bar chart showing rule contributions to post score
 */

import React, { useState, useCallback, useMemo, useId } from 'react';

export interface RuleContribution {
  ruleId: string;
  ruleName: string;
  ruleType: 'boost' | 'demote' | 'filter';
  contribution: number;
}

export interface RuleContributionChartProps {
  contributions: RuleContribution[];
  baseScore?: number;
  totalScore?: number;
  onRuleHover?: (ruleId: string | null) => void;
  onRuleClick?: (ruleId: string) => void;
}

interface AppliedRule {
  ruleId: string;
  ruleName: string;
  type: 'boost' | 'demote' | 'filter';
  contribution: number;
  percentage: number;
  matchedConditions: Array<{ field: string; operator: string; value: string }>;
}

interface Explanation {
  postId: string;
  baseScore: number;
  totalScore: number;
  appliedRules: AppliedRule[];
}

interface RuleContributionChartWithExplanationProps {
  explanation: Explanation;
}

// Detect which props format is being used
type CombinedProps = RuleContributionChartProps | RuleContributionChartWithExplanationProps;

function isExplanationProps(props: CombinedProps): props is RuleContributionChartWithExplanationProps {
  return 'explanation' in props;
}

// Styles as CSS-in-JS for portability
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    padding: '16px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalScore: {
    fontSize: '24px',
    fontWeight: 600,
  },
  chartContainer: {
    position: 'relative' as const,
    width: '100%',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px',
    color: '#666',
    textAlign: 'center' as const,
  },
  tooltip: {
    position: 'absolute' as const,
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '14px',
    zIndex: 1000,
    pointerEvents: 'none' as const,
    whiteSpace: 'nowrap' as const,
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  label: {
    fontSize: '12px',
    fill: '#333',
  },
  truncate: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    maxWidth: '120px',
  },
};

const COLORS = {
  boost: '#22c55e', // green-500
  demote: '#ef4444', // red-500
  baseline: '#6b7280', // gray-500
  background: '#f3f4f6', // gray-100
};

const CHART_CONFIG = {
  barHeight: 32,
  barGap: 8,
  leftMargin: 140,
  rightMargin: 60,
  topMargin: 40,
  bottomMargin: 20,
};

export function RuleContributionChart(props: CombinedProps) {
  const [hoveredRule, setHoveredRule] = useState<AppliedRule | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const tooltipId = useId();

  // Normalize props to handle both formats
  const { baseScore, totalScore, appliedRules } = useMemo(() => {
    if (isExplanationProps(props)) {
      return {
        baseScore: props.explanation.baseScore,
        totalScore: props.explanation.totalScore,
        appliedRules: props.explanation.appliedRules,
      };
    }
    // Convert contributions to appliedRules format
    return {
      baseScore: props.baseScore ?? 50,
      totalScore: props.totalScore ?? props.contributions.reduce((sum, c) => sum + c.contribution, props.baseScore ?? 50),
      appliedRules: props.contributions.map((c) => ({
        ruleId: c.ruleId,
        ruleName: c.ruleName,
        type: c.ruleType,
        contribution: c.contribution,
        percentage: 0,
        matchedConditions: [],
      })),
    };
  }, [props]);

  // Sort rules by contribution magnitude (largest first)
  const sortedRules = useMemo(() => {
    return [...appliedRules].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  }, [appliedRules]);

  // Calculate chart dimensions
  const chartWidth = 400;
  const chartHeight = sortedRules.length > 0
    ? CHART_CONFIG.topMargin + sortedRules.length * (CHART_CONFIG.barHeight + CHART_CONFIG.barGap) + CHART_CONFIG.bottomMargin
    : 120;

  // Calculate scale for contributions
  const maxContribution = useMemo(() => {
    if (sortedRules.length === 0) return 100;
    const max = Math.max(...sortedRules.map(r => Math.abs(r.contribution)));
    return max > 0 ? max * 1.2 : 100; // Add 20% padding
  }, [sortedRules]);

  const barAreaWidth = chartWidth - CHART_CONFIG.leftMargin - CHART_CONFIG.rightMargin;
  const scale = barAreaWidth / (maxContribution * 2); // Scale for both positive and negative
  const baselineX = CHART_CONFIG.leftMargin + barAreaWidth / 2;

  const handleMouseEnter = useCallback((rule: AppliedRule, event: React.MouseEvent) => {
    setHoveredRule(rule);
    const rect = (event.target as Element).getBoundingClientRect();
    const containerRect = (event.currentTarget as Element).closest('[data-testid="contribution-chart"]')?.getBoundingClientRect();
    if (containerRect) {
      setTooltipPosition({
        x: rect.right - containerRect.left + 8,
        y: rect.top - containerRect.top,
      });
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredRule(null);
  }, []);

  const handleClick = useCallback((ruleId: string) => {
    if (!isExplanationProps(props) && props.onRuleClick) {
      props.onRuleClick(ruleId);
    }
  }, [props]);

  const handleHover = useCallback((ruleId: string | null) => {
    if (!isExplanationProps(props) && props.onRuleHover) {
      props.onRuleHover(ruleId);
    }
  }, [props]);

  // Empty state
  if (sortedRules.length === 0) {
    return (
      <div
        data-testid="contribution-chart"
        aria-label="Feed score breakdown chart"
        style={styles.container}
      >
        <div style={styles.emptyState}>
          <p>No rules applied</p>
          <p>Showing base score only</p>
        </div>
      </div>
    );
  }

  const formatContribution = (value: number) => {
    return value > 0 ? `+${value}` : `${value}`;
  };

  return (
    <div
      data-testid="contribution-chart"
      aria-label="Feed score breakdown chart"
      style={{ ...styles.container, position: 'relative' }}
    >
      {/* Total Score Header */}
      <div style={styles.header}>
        <span>Score Breakdown</span>
        <span data-testid="total-score" style={styles.totalScore}>
          {totalScore}
        </span>
      </div>

      {/* SVG Chart */}
      <svg
        width={chartWidth}
        height={chartHeight}
        aria-label="Bar chart showing rule contributions"
      >
        {/* Background */}
        <rect
          x={CHART_CONFIG.leftMargin}
          y={CHART_CONFIG.topMargin - 10}
          width={barAreaWidth}
          height={chartHeight - CHART_CONFIG.topMargin - CHART_CONFIG.bottomMargin + 20}
          fill={COLORS.background}
          rx={4}
        />

        {/* Baseline (zero line) */}
        <g data-testid="base-score-line">
          <line
            x1={baselineX}
            y1={CHART_CONFIG.topMargin - 15}
            x2={baselineX}
            y2={chartHeight - CHART_CONFIG.bottomMargin + 5}
            stroke={COLORS.baseline}
            strokeWidth={2}
            strokeDasharray="4,4"
          />
          <text
            x={baselineX}
            y={CHART_CONFIG.topMargin - 20}
            textAnchor="middle"
            fontSize={12}
            fill={COLORS.baseline}
          >
            {baseScore}
          </text>
        </g>

        {/* X-axis labels */}
        <text
          x={CHART_CONFIG.leftMargin}
          y={chartHeight - 5}
          fontSize={10}
          fill="#666"
        >
          -{Math.round(maxContribution)}
        </text>
        <text
          x={CHART_CONFIG.leftMargin + barAreaWidth}
          y={chartHeight - 5}
          textAnchor="end"
          fontSize={10}
          fill="#666"
        >
          +{Math.round(maxContribution)}
        </text>

        {/* Bars */}
        {sortedRules.map((rule, index) => {
          const y = CHART_CONFIG.topMargin + index * (CHART_CONFIG.barHeight + CHART_CONFIG.barGap);
          const barWidth = Math.abs(rule.contribution) * scale;
          const isPositive = rule.contribution >= 0;
          const barX = isPositive ? baselineX : baselineX - barWidth;
          const color = rule.type === 'boost' ? COLORS.boost : COLORS.demote;

          return (
            <g key={rule.ruleId}>
              {/* Rule name label */}
              <foreignObject
                x={0}
                y={y + CHART_CONFIG.barHeight / 2 - 8}
                width={CHART_CONFIG.leftMargin - 8}
                height={20}
              >
                <div
                  data-testid={`chart-label-${rule.ruleId}`}
                  className="truncate"
                  style={{
                    ...styles.label,
                    ...styles.truncate,
                    color: '#333',
                    textAlign: 'right',
                    paddingRight: '8px',
                  }}
                  title={rule.ruleName}
                >
                  {rule.ruleName}
                </div>
              </foreignObject>

              {/* Bar */}
              <rect
                data-testid={`chart-bar-${rule.ruleId}`}
                data-height={barWidth}
                data-position={isPositive ? 'above-baseline' : 'below-baseline'}
                className={`${rule.type === 'boost' ? 'boost-bar' : 'demote-bar'} animate-grow`}
                x={barX}
                y={y}
                width={barWidth}
                height={CHART_CONFIG.barHeight}
                fill={color}
                rx={4}
                style={{
                  backgroundColor: color,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
                aria-label={`${rule.ruleName}: ${formatContribution(rule.contribution)} points (${rule.percentage}%)`}
                onMouseEnter={(e) => {
                  handleMouseEnter(rule, e);
                  handleHover(rule.ruleId);
                }}
                onMouseLeave={() => {
                  handleMouseLeave();
                  handleHover(null);
                }}
                onClick={() => handleClick(rule.ruleId)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleClick(rule.ruleId);
                  }
                }}
              />

              {/* Contribution value on bar */}
              <text
                x={isPositive ? barX + barWidth + 4 : barX - 4}
                y={y + CHART_CONFIG.barHeight / 2 + 4}
                textAnchor={isPositive ? 'start' : 'end'}
                fontSize={12}
                fontWeight={600}
                fill="#333"
              >
                {formatContribution(rule.contribution)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredRule && (
        <div
          role="tooltip"
          id={tooltipId}
          style={{
            ...styles.tooltip,
            left: tooltipPosition.x,
            top: tooltipPosition.y,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>
            {hoveredRule.ruleName}
          </div>
          <div>
            Contribution: {formatContribution(hoveredRule.contribution)}
          </div>
          <div>
            Impact: {hoveredRule.percentage}%
          </div>
        </div>
      )}

      {/* Screen reader summary */}
      <div className="sr-only" aria-live="polite">
        {`Chart showing ${sortedRules.length} rules. Base score: ${baseScore}. Total score: ${totalScore}.`}
      </div>
    </div>
  );
}
