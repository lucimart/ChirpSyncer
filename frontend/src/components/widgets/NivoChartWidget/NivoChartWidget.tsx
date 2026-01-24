'use client';

/**
 * NivoChartWidget
 *
 * Chart widget using Nivo for better animations, tooltips, and theming.
 * Drop-in replacement for ChartWidget with same API.
 */

import { memo, useMemo, type FC } from 'react';
import styled, { useTheme } from 'styled-components';
import { ResponsiveBar } from '@nivo/bar';
import { ResponsiveLine } from '@nivo/line';
import { Card, Stack, SectionTitle, EmptyState } from '../../ui';
import { nivoLightTheme, chartColors, chartMargins, chartAnimation } from '@/styles/nivoTheme';

// Types - same as original ChartWidget
export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface NivoChartWidgetProps {
  data: ChartDataPoint[];
  title: string;
  chartType: 'bar' | 'line' | 'area';
  showLegend?: boolean;
  height?: number;
  colors?: string[];
}

// Styled Components
const ChartContainer = styled.div<{ $height: number }>`
  flex: 1;
  min-height: ${({ $height }) => $height}px;
  height: ${({ $height }) => $height}px;
`;

// Transform data for Nivo Bar
const transformBarData = (data: ChartDataPoint[]) => {
  return data.map((point) => ({
    id: point.label,
    label: point.label,
    value: point.value,
  }));
};

// Transform data for Nivo Line
const transformLineData = (data: ChartDataPoint[], id: string = 'series') => {
  return [
    {
      id,
      data: data.map((point) => ({
        x: point.label,
        y: point.value,
      })),
    },
  ];
};

// Bar Chart with Nivo
const NivoBarChart: FC<{
  data: ChartDataPoint[];
  height: number;
  colors: string[];
}> = memo(({ data, height, colors }) => {
  const barData = useMemo(() => transformBarData(data), [data]);

  return (
    <ChartContainer $height={height} data-testid="chart-container">
      <ResponsiveBar
        data={barData}
        keys={['value']}
        indexBy="label"
        margin={chartMargins.compact}
        padding={0.3}
        colors={colors}
        theme={nivoLightTheme}
        borderRadius={4}
        axisBottom={{
          tickSize: 0,
          tickPadding: 8,
          tickRotation: data.length > 6 ? -45 : 0,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          tickValues: 5,
        }}
        enableGridY={true}
        enableLabel={false}
        {...chartAnimation.default}
        role="img"
        ariaLabel="Bar chart"
        barAriaLabel={(d) => `${d.indexValue}: ${d.value}`}
      />
    </ChartContainer>
  );
});
NivoBarChart.displayName = 'NivoBarChart';

// Line Chart with Nivo
const NivoLineChart: FC<{
  data: ChartDataPoint[];
  height: number;
  colors: string[];
  isArea?: boolean;
}> = memo(({ data, height, colors, isArea = false }) => {
  const lineData = useMemo(() => transformLineData(data), [data]);

  return (
    <ChartContainer $height={height} data-testid="chart-container">
      <ResponsiveLine
        data={lineData}
        margin={chartMargins.compact}
        xScale={{ type: 'point' }}
        yScale={{ type: 'linear', min: 'auto', max: 'auto' }}
        colors={colors}
        theme={nivoLightTheme}
        curve="monotoneX"
        axisBottom={{
          tickSize: 0,
          tickPadding: 8,
          tickRotation: data.length > 6 ? -45 : 0,
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          tickValues: 5,
        }}
        enableGridX={false}
        enableGridY={true}
        pointSize={8}
        pointColor={{ theme: 'background' }}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }}
        enableArea={isArea}
        areaOpacity={0.15}
        useMesh={true}
        {...chartAnimation.default}
        role="img"
        ariaLabel={isArea ? 'Area chart' : 'Line chart'}
      />
    </ChartContainer>
  );
});
NivoLineChart.displayName = 'NivoLineChart';

// Main Component
export const NivoChartWidget: FC<NivoChartWidgetProps> = memo(({
  data,
  title,
  chartType,
  showLegend = false,
  height = 200,
  colors = chartColors.primary,
}) => {
  const isEmpty = data.length === 0;

  const chartContent = useMemo(() => {
    if (isEmpty) {
      return <EmptyState title="No data available" size="sm" data-testid="chart-empty" />;
    }

    switch (chartType) {
      case 'bar':
        return <NivoBarChart data={data} height={height} colors={colors} />;
      case 'line':
        return <NivoLineChart data={data} height={height} colors={colors} />;
      case 'area':
        return <NivoLineChart data={data} height={height} colors={colors} isArea />;
      default:
        return <NivoBarChart data={data} height={height} colors={colors} />;
    }
  }, [chartType, data, isEmpty, height, colors]);

  return (
    <Card
      padding="md"
      data-testid="nivo-chart-widget"
      data-chart-type={chartType}
      style={{ height: '100%' }}
    >
      <Stack gap={4} style={{ height: '100%' }}>
        <SectionTitle>{title}</SectionTitle>
        {chartContent}
      </Stack>
    </Card>
  );
});

NivoChartWidget.displayName = 'NivoChartWidget';

export default NivoChartWidget;
