'use client';

/**
 * NivoFeedCompositionChart
 *
 * Donut chart using Nivo for better animations and tooltips.
 * Drop-in replacement for FeedCompositionChart with same API.
 */

import { memo, useMemo, type FC } from 'react';
import styled, { useTheme } from 'styled-components';
import { ResponsivePie } from '@nivo/pie';
import { nivoLightTheme, chartAnimation } from '@/styles/nivoTheme';

export interface FeedComposition {
  boosted: number;
  demoted: number;
  filtered: number;
  unaffected: number;
}

export interface NivoFeedCompositionChartProps {
  /** Feed composition data - use either `data` or `composition` */
  data?: FeedComposition;
  /** Alias for `data` - used by AlgorithmDashboard */
  composition?: FeedComposition;
  showLegend?: boolean;
  showPercentages?: boolean;
  onSegmentHover?: (segment: keyof FeedComposition | null) => void;
  onSegmentClick?: (segment: keyof FeedComposition) => void;
  /** Size of the chart in pixels */
  size?: number;
}

interface SegmentConfig {
  key: keyof FeedComposition;
  label: string;
  color: string;
}

const SEGMENT_CONFIGS: SegmentConfig[] = [
  { key: 'boosted', label: 'Boosted', color: '#22c55e' },
  { key: 'demoted', label: 'Demoted', color: '#f97316' },
  { key: 'filtered', label: 'Filtered', color: '#ef4444' },
  { key: 'unaffected', label: 'Unaffected', color: '#9ca3af' },
];

const DEFAULT_COMPOSITION: FeedComposition = {
  boosted: 0,
  demoted: 0,
  filtered: 0,
  unaffected: 0,
};

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const ChartWrapper = styled.div<{ $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
`;

const Legend = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[3]};
  background-color: ${({ theme }) => theme.colors.background.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  min-width: 180px;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const LegendLabel = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const LegendDot = styled.div<{ $color: string }>`
  width: 12px;
  height: 12px;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  background-color: ${({ $color }) => $color};
`;

const LegendText = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const LegendValue = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const TotalRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  padding-top: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const TotalText = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

// Transform data for Nivo
interface NivoPieData {
  id: string;
  label: string;
  value: number;
  color: string;
}

export const NivoFeedCompositionChart: FC<NivoFeedCompositionChartProps> = memo(({
  data,
  composition,
  showLegend = true,
  showPercentages = true,
  onSegmentHover,
  onSegmentClick,
  size = 200,
}) => {
  const theme = useTheme();

  // Support both `data` and `composition` props
  const safeData = useMemo(
    () => data ?? composition ?? DEFAULT_COMPOSITION,
    [data, composition]
  );

  const total = useMemo(() => {
    return safeData.boosted + safeData.demoted + safeData.filtered + safeData.unaffected;
  }, [safeData]);

  // Transform to Nivo format
  const pieData = useMemo((): NivoPieData[] => {
    return SEGMENT_CONFIGS
      .filter((config) => safeData[config.key] > 0)
      .map((config) => ({
        id: config.key,
        label: config.label,
        value: safeData[config.key],
        color: config.color,
      }));
  }, [safeData]);

  // Calculate percentages for legend
  const percentages = useMemo(() => {
    const result: Record<keyof FeedComposition, number> = {
      boosted: 0,
      demoted: 0,
      filtered: 0,
      unaffected: 0,
    };
    if (total === 0) return result;
    for (const key of Object.keys(safeData) as Array<keyof FeedComposition>) {
      result[key] = Math.round((safeData[key] / total) * 100);
    }
    return result;
  }, [safeData, total]);

  // Visible legend items
  const visibleLegendItems = useMemo(
    () => SEGMENT_CONFIGS.filter((config) => safeData[config.key] > 0),
    [safeData]
  );

  // Colors array for Nivo
  const colors = useMemo(
    () => pieData.map((d) => d.color),
    [pieData]
  );

  // Handle interactions
  const handleMouseEnter = (datum: { id: string | number }) => {
    onSegmentHover?.(datum.id as keyof FeedComposition);
  };

  const handleMouseLeave = () => {
    onSegmentHover?.(null);
  };

  const handleClick = (datum: { id: string | number }) => {
    onSegmentClick?.(datum.id as keyof FeedComposition);
  };

  if (pieData.length === 0) {
    return (
      <Container data-testid="feed-composition-chart">
        <ChartWrapper $size={size}>
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.colors.text.tertiary,
            fontSize: theme.fontSizes.sm,
          }}>
            No data available
          </div>
        </ChartWrapper>
      </Container>
    );
  }

  return (
    <Container data-testid="feed-composition-chart">
      <ChartWrapper $size={size}>
        <ResponsivePie
          data={pieData}
          margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
          innerRadius={0.6}
          padAngle={1}
          cornerRadius={4}
          colors={colors}
          borderWidth={0}
          enableArcLinkLabels={false}
          arcLabelsSkipAngle={20}
          arcLabelsTextColor="#ffffff"
          theme={nivoLightTheme}
          {...chartAnimation.default}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          tooltip={({ datum }) => (
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
              {datum.label}: {datum.value} ({Math.round((datum.value / total) * 100)}%)
            </div>
          )}
          role="img"
        />
      </ChartWrapper>

      {showLegend && (
        <Legend data-testid="chart-legend">
          {visibleLegendItems.map((config) => (
            <LegendItem key={config.key}>
              <LegendLabel>
                <LegendDot $color={config.color} />
                <LegendText>{config.label}</LegendText>
              </LegendLabel>
              {showPercentages && (
                <LegendValue>{percentages[config.key]}%</LegendValue>
              )}
            </LegendItem>
          ))}
          <TotalRow>
            <TotalText>Total: 100%</TotalText>
          </TotalRow>
        </Legend>
      )}
    </Container>
  );
});

NivoFeedCompositionChart.displayName = 'NivoFeedCompositionChart';

export default NivoFeedCompositionChart;
