'use client';

/**
 * NivoRuleContributionChart
 *
 * Horizontal bar chart using Nivo for rule contributions.
 * Shows positive (boost) and negative (demote) contributions.
 * Supports both direct contributions and explanation props.
 */

import { memo, useMemo, type FC } from 'react';
import styled, { useTheme } from 'styled-components';
import { ResponsiveBar } from '@nivo/bar';
import { nivoLightTheme, chartAnimation } from '@/styles/nivoTheme';
import { formatContribution } from '../shared';
import type { RuleContribution, FeedExplanation } from '../shared';

/** Props for direct contributions mode */
export interface NivoRuleContributionChartDirectProps {
  contributions: RuleContribution[];
  baseScore?: number;
  totalScore?: number;
  onRuleHover?: (ruleId: string | null) => void;
  onRuleClick?: (ruleId: string) => void;
  height?: number;
}

/** Props for explanation mode (used by WhyAmISeeingThis) */
export interface NivoRuleContributionChartExplanationProps {
  explanation: FeedExplanation;
  onRuleHover?: (ruleId: string | null) => void;
  onRuleClick?: (ruleId: string) => void;
  height?: number;
}

export type NivoRuleContributionChartProps =
  | NivoRuleContributionChartDirectProps
  | NivoRuleContributionChartExplanationProps;

function isExplanationProps(
  props: NivoRuleContributionChartProps
): props is NivoRuleContributionChartExplanationProps {
  return 'explanation' in props;
}

// Colors for rule types
const COLORS = {
  boost: '#22c55e',
  demote: '#f97316',
  filter: '#ef4444',
};

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const TotalScore = styled.span`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ChartWrapper = styled.div<{ $height: number }>`
  height: ${({ $height }) => $height}px;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[8]};
  color: ${({ theme }) => theme.colors.text.secondary};
  text-align: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const EmptyText = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

interface BarData {
  id: string;
  ruleName: string;
  ruleType: string;
  contribution: number;
  [key: string]: string | number;
}

export const NivoRuleContributionChart: FC<NivoRuleContributionChartProps> = memo((props) => {
  const theme = useTheme();
  const { onRuleHover, onRuleClick, height = 200 } = props;

  // Normalize props to handle both formats
  const { baseScore, totalScore, contributions } = useMemo(() => {
    if (isExplanationProps(props)) {
      const { explanation } = props;
      return {
        baseScore: explanation.baseScore,
        totalScore: explanation.totalScore,
        contributions: explanation.appliedRules.map((rule) => ({
          ruleId: rule.ruleId,
          ruleName: rule.ruleName,
          ruleType: rule.type,
          contribution: rule.contribution,
        })),
      };
    }
    return {
      baseScore: props.baseScore ?? 50,
      totalScore: props.totalScore,
      contributions: props.contributions,
    };
  }, [props]);

  // Calculate total if not provided
  const calculatedTotal = useMemo(() => {
    if (totalScore !== undefined) return totalScore;
    return contributions.reduce((sum, c) => sum + c.contribution, baseScore);
  }, [totalScore, contributions, baseScore]);

  // Transform data for Nivo (sorted by contribution magnitude)
  const barData = useMemo((): BarData[] => {
    return [...contributions]
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .map((c) => ({
        id: c.ruleId,
        ruleName: c.ruleName,
        ruleType: c.ruleType,
        contribution: c.contribution,
      }));
  }, [contributions]);

  // Dynamic height based on number of rules
  const chartHeight = useMemo(() => {
    const minHeight = 100;
    const barHeight = 40;
    return Math.max(minHeight, barData.length * barHeight + 40);
  }, [barData.length]);

  // Color function based on rule type
  const getColor = (bar: { data: Record<string, unknown> }) => {
    const ruleType = bar.data.ruleType as string;
    return COLORS[ruleType as keyof typeof COLORS] ?? COLORS.demote;
  };

  // Handle interactions
  const handleMouseEnter = (datum: { data: Record<string, unknown> }) => {
    onRuleHover?.(datum.data.id as string);
  };

  const handleMouseLeave = () => {
    onRuleHover?.(null);
  };

  const handleClick = (datum: { data: Record<string, unknown> }) => {
    onRuleClick?.(datum.data.id as string);
  };

  // Empty state
  if (contributions.length === 0) {
    return (
      <Container data-testid="contribution-chart">
        <EmptyState>
          <EmptyText>No rules applied</EmptyText>
          <EmptyText>Showing base score only</EmptyText>
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container data-testid="contribution-chart">
      <Header>
        <Title>Score Breakdown</Title>
        <TotalScore data-testid="total-score">{calculatedTotal}</TotalScore>
      </Header>

      <ChartWrapper $height={height || chartHeight}>
        <ResponsiveBar
          data={barData}
          keys={['contribution']}
          indexBy="ruleName"
          layout="horizontal"
          margin={{ top: 10, right: 60, bottom: 10, left: 120 }}
          padding={0.3}
          valueScale={{ type: 'symlog' }}
          colors={getColor}
          theme={nivoLightTheme}
          borderRadius={4}
          enableGridY={false}
          enableGridX={true}
          axisTop={null}
          axisRight={null}
          axisBottom={null}
          axisLeft={{
            tickSize: 0,
            tickPadding: 8,
          }}
          labelSkipWidth={40}
          labelTextColor="#ffffff"
          label={(d) => formatContribution(d.value as number)}
          {...chartAnimation.default}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          tooltip={({ data, value }) => (
            <div
              style={{
                backgroundColor: theme.colors.text.primary,
                color: theme.colors.background.primary,
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>{data.ruleName}</div>
              <div>Contribution: {formatContribution(value as number)}</div>
              <div>Type: {data.ruleType}</div>
            </div>
          )}
          role="img"
        />
      </ChartWrapper>
    </Container>
  );
});

NivoRuleContributionChart.displayName = 'NivoRuleContributionChart';

export default NivoRuleContributionChart;
