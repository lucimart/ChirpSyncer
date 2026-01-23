'use client';

import { memo, useMemo, type FC } from 'react';
import styled from 'styled-components';
import { Card, Stack, SectionTitle, Caption, EmptyState } from '../../ui';

// Types
export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface ChartWidgetProps {
  data: ChartDataPoint[];
  title: string;
  chartType: 'bar' | 'line' | 'area';
  showLegend?: boolean;
}

// Constants
const CHART_DIMENSIONS = { width: 300, height: 150, padding: 10 } as const;
const LEGEND_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'] as const;

// Styled Components
const ChartContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: flex-end;
  gap: ${({ theme }) => theme.spacing[2]};
  min-height: 120px;
`;

const LegendWrapper = styled.div`
  margin-top: ${({ theme }) => theme.spacing[4]};
  padding-top: ${({ theme }) => theme.spacing[3]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const LegendDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background-color: ${({ $color }) => $color};
  flex-shrink: 0;
`;

// Bar Chart Components
const BarGroup = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  height: 100%;
`;

const Bar = styled.div<{ $height: number }>`
  width: 100%;
  max-width: 40px;
  height: ${({ $height }) => $height}%;
  background: ${({ theme }) => theme.colors.primary[500]};
  border-radius: ${({ theme }) => theme.borderRadius.sm} ${({ theme }) => theme.borderRadius.sm} 0 0;
  transition: ${({ theme }) => theme.transitions.fast};
  min-height: 4px;

  &:hover {
    background: ${({ theme }) => theme.colors.primary[600]};
  }
`;

const BarLabel = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

// Line/Area Chart Components
const SvgContainer = styled.svg`
  width: 100%;
  height: 100%;
  overflow: visible;
`;

const LinePath = styled.path<{ $isArea?: boolean }>`
  fill: ${({ $isArea, theme }) => ($isArea ? `${theme.colors.primary[500]}20` : 'none')};
  stroke: ${({ theme }) => theme.colors.primary[500]};
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
`;

const DataPoint = styled.circle`
  fill: ${({ theme }) => theme.colors.primary[500]};
  stroke: ${({ theme }) => theme.colors.background.secondary};
  stroke-width: 2;
`;

// Helper function to calculate path
const calculatePath = (
  data: ChartDataPoint[],
  width: number,
  height: number,
  isArea: boolean
): string => {
  if (data.length === 0) return '';

  const maxValue = Math.max(...data.map((d) => d.value));
  const padding = 10;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = data.map((point, index) => {
    const x = padding + (index / (data.length - 1 || 1)) * chartWidth;
    const y = padding + chartHeight - (point.value / (maxValue || 1)) * chartHeight;
    return { x, y };
  });

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }

  if (isArea) {
    path += ` L ${points[points.length - 1].x} ${height - padding}`;
    path += ` L ${points[0].x} ${height - padding}`;
    path += ' Z';
  }

  return path;
};

// Subcomponents
const BarChart: FC<{ data: ChartDataPoint[] }> = memo(({ data }) => {
  const maxValue = useMemo(() => Math.max(...data.map((d) => d.value)), [data]);

  const bars = useMemo(
    () =>
      data.map((point, index) => ({
        height: (point.value / (maxValue || 1)) * 100,
        title: `${point.label}: ${point.value}`,
        label: point.label,
        key: index,
      })),
    [data, maxValue]
  );

  return (
    <ChartContainer data-testid="chart-container">
      {bars.map((bar) => (
        <BarGroup key={bar.key}>
          <Bar $height={bar.height} title={bar.title} />
          <BarLabel>{bar.label}</BarLabel>
        </BarGroup>
      ))}
    </ChartContainer>
  );
});
BarChart.displayName = 'BarChart';

const LineChart: FC<{ data: ChartDataPoint[]; isArea?: boolean }> = memo(({ data, isArea = false }) => {
  const { width, height, padding } = CHART_DIMENSIONS;

  const { points, path } = useMemo(() => {
    const maxValue = Math.max(...data.map((d) => d.value));
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const pts = data.map((point, index) => ({
      x: padding + (index / (data.length - 1 || 1)) * chartWidth,
      y: padding + chartHeight - (point.value / (maxValue || 1)) * chartHeight,
      label: point.label,
      value: point.value,
    }));

    return { points: pts, path: calculatePath(data, width, height, isArea) };
  }, [data, width, height, padding, isArea]);

  return (
    <ChartContainer data-testid="chart-container">
      <SvgContainer viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <LinePath d={path} $isArea={isArea} />
        {points.map((point, index) => (
          <DataPoint key={index} cx={point.x} cy={point.y} r={4}>
            <title>{`${point.label}: ${point.value}`}</title>
          </DataPoint>
        ))}
      </SvgContainer>
    </ChartContainer>
  );
});
LineChart.displayName = 'LineChart';

const ChartLegend: FC<{ data: ChartDataPoint[] }> = memo(({ data }) => (
  <LegendWrapper data-testid="chart-legend">
    <Stack direction="row" wrap gap={3}>
      {data.map((point, index) => (
        <Stack key={index} direction="row" align="center" gap={1}>
          <LegendDot $color={LEGEND_COLORS[index % LEGEND_COLORS.length]} />
          <Caption>{point.label}</Caption>
        </Stack>
      ))}
    </Stack>
  </LegendWrapper>
));
ChartLegend.displayName = 'ChartLegend';

// Main Component
export const ChartWidget: FC<ChartWidgetProps> = ({
  data,
  title,
  chartType,
  showLegend = false,
}) => {
  const isEmpty = data.length === 0;

  const chartContent = useMemo(() => {
    if (isEmpty) {
      return <EmptyState title="No data available" size="sm" data-testid="chart-empty" />;
    }

    switch (chartType) {
      case 'bar':
        return <BarChart data={data} />;
      case 'line':
        return <LineChart data={data} />;
      case 'area':
        return <LineChart data={data} isArea />;
      default:
        return <BarChart data={data} />;
    }
  }, [chartType, data, isEmpty]);

  return (
    <Card
      padding="md"
      data-testid="chart-widget"
      data-chart-type={chartType}
      style={{ height: '100%' }}
    >
      <Stack gap={4} style={{ height: '100%' }}>
        <SectionTitle>{title}</SectionTitle>
        {chartContent}
        {showLegend && !isEmpty && <ChartLegend data={data} />}
      </Stack>
    </Card>
  );
};

export default ChartWidget;
