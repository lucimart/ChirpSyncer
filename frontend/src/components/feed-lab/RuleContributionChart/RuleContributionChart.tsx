/**
 * Sprint 20: Rule Contribution Chart
 * Bar chart showing rule contributions to post score
 */

'use client';

import React, { useState, useCallback, useMemo, useId } from 'react';
import styled from 'styled-components';
import { CHART_COLORS, CHART_CONFIG, formatContribution } from '../shared';
import type { AppliedRule, FeedExplanation, RuleContribution } from '../shared';

export type { RuleContribution };

export interface RuleContributionChartProps {
  contributions: RuleContribution[];
  baseScore?: number;
  totalScore?: number;
  onRuleHover?: (ruleId: string | null) => void;
  onRuleClick?: (ruleId: string) => void;
}

interface RuleContributionChartWithExplanationProps {
  explanation: FeedExplanation;
}

// Detect which props format is being used
type CombinedProps = RuleContributionChartProps | RuleContributionChartWithExplanationProps;

function isExplanationProps(props: CombinedProps): props is RuleContributionChartWithExplanationProps {
  return 'explanation' in props;
}

const ChartContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[4]};
  position: relative;
`;

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ChartTitle = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const TotalScoreValue = styled.span`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[8]};
  color: ${({ theme }) => theme.colors.text.secondary};
  text-align: center;
`;

const EmptyText = styled.p`
  margin: 0;
`;

const Tooltip = styled.div`
  position: absolute;
  background-color: ${({ theme }) => theme.colors.text.primary};
  color: ${({ theme }) => theme.colors.background.primary};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  z-index: 1000;
  pointer-events: none;
  white-space: nowrap;
  box-shadow: ${({ theme }) => theme.shadows.lg};
`;

const TooltipTitle = styled.div`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`;

const LabelContainer = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.primary};
  text-align: right;
  padding-right: ${({ theme }) => theme.spacing[2]};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
`;

const ScreenReaderOnly = styled.div`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

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
      <ChartContainer
        data-testid="contribution-chart"
        aria-label="Feed score breakdown chart"
      >
        <EmptyState>
          <EmptyText>No rules applied</EmptyText>
          <EmptyText>Showing base score only</EmptyText>
        </EmptyState>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer
      data-testid="contribution-chart"
      aria-label="Feed score breakdown chart"
    >
      {/* Total Score Header */}
      <ChartHeader>
        <ChartTitle>Score Breakdown</ChartTitle>
        <TotalScoreValue data-testid="total-score">
          {totalScore}
        </TotalScoreValue>
      </ChartHeader>

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
          fill={CHART_COLORS.background}
          rx={4}
        />

        {/* Baseline (zero line) */}
        <g data-testid="base-score-line">
          <line
            x1={baselineX}
            y1={CHART_CONFIG.topMargin - 15}
            x2={baselineX}
            y2={chartHeight - CHART_CONFIG.bottomMargin + 5}
            stroke={CHART_COLORS.baseline}
            strokeWidth={2}
            strokeDasharray="4,4"
          />
          <text
            x={baselineX}
            y={CHART_CONFIG.topMargin - 20}
            textAnchor="middle"
            fontSize={12}
            fill={CHART_COLORS.baseline}
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
          const color = rule.type === 'boost' ? CHART_COLORS.boost : CHART_COLORS.demote;

          return (
            <g key={rule.ruleId}>
              {/* Rule name label */}
              <foreignObject
                x={0}
                y={y + CHART_CONFIG.barHeight / 2 - 8}
                width={CHART_CONFIG.leftMargin - 8}
                height={20}
              >
                <LabelContainer
                  data-testid={`chart-label-${rule.ruleId}`}
                  title={rule.ruleName}
                >
                  {rule.ruleName}
                </LabelContainer>
              </foreignObject>

              {/* Bar */}
              <rect
                data-testid={`chart-bar-${rule.ruleId}`}
                data-height={barWidth}
                data-position={isPositive ? 'above-baseline' : 'below-baseline'}
                x={barX}
                y={y}
                width={barWidth}
                height={CHART_CONFIG.barHeight}
                fill={color}
                rx={4}
                style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
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
        <Tooltip
          role="tooltip"
          id={tooltipId}
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
          }}
        >
          <TooltipTitle>{hoveredRule.ruleName}</TooltipTitle>
          <div>Contribution: {formatContribution(hoveredRule.contribution)}</div>
          <div>Impact: {hoveredRule.percentage}%</div>
        </Tooltip>
      )}

      {/* Screen reader summary */}
      <ScreenReaderOnly aria-live="polite">
        {`Chart showing ${sortedRules.length} rules. Base score: ${baseScore}. Total score: ${totalScore}.`}
      </ScreenReaderOnly>
    </ChartContainer>
  );
}
