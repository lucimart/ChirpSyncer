'use client';

import React from 'react';
import styled from 'styled-components';
import { EmptyState } from '../ui';

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

// Styled Components
const WidgetContainer = styled.div`
  background: ${({ theme }) => theme.colors.background.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing[4]};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const Title = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing[4]};
`;

const ChartContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: flex-end;
  gap: ${({ theme }) => theme.spacing[2]};
  min-height: 120px;
`;

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[4]};
  padding-top: ${({ theme }) => theme.spacing[3]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const LegendDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background-color: ${({ $color }) => $color};
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
const BarChart: React.FC<{ data: ChartDataPoint[] }> = ({ data }) => {
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <ChartContainer data-testid="chart-container">
      {data.map((point, index) => (
        <BarGroup key={index}>
          <Bar $height={(point.value / (maxValue || 1)) * 100} title={`${point.label}: ${point.value}`} />
          <BarLabel>{point.label}</BarLabel>
        </BarGroup>
      ))}
    </ChartContainer>
  );
};

const LineChart: React.FC<{ data: ChartDataPoint[]; isArea?: boolean }> = ({ data, isArea = false }) => {
  const width = 300;
  const height = 150;
  const maxValue = Math.max(...data.map((d) => d.value));
  const padding = 10;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = data.map((point, index) => ({
    x: padding + (index / (data.length - 1 || 1)) * chartWidth,
    y: padding + chartHeight - (point.value / (maxValue || 1)) * chartHeight,
    label: point.label,
    value: point.value,
  }));

  return (
    <ChartContainer data-testid="chart-container">
      <SvgContainer viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <LinePath d={calculatePath(data, width, height, isArea)} $isArea={isArea} />
        {points.map((point, index) => (
          <DataPoint key={index} cx={point.x} cy={point.y} r={4}>
            <title>{`${point.label}: ${point.value}`}</title>
          </DataPoint>
        ))}
      </SvgContainer>
    </ChartContainer>
  );
};

const ChartLegend: React.FC<{ data: ChartDataPoint[] }> = ({ data }) => {
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <Legend data-testid="chart-legend">
      {data.map((point, index) => (
        <LegendItem key={index}>
          <LegendDot $color={colors[index % colors.length]} />
          {point.label}
        </LegendItem>
      ))}
    </Legend>
  );
};

// Main Component
export const ChartWidget: React.FC<ChartWidgetProps> = ({
  data,
  title,
  chartType,
  showLegend = false,
}) => {
  const isEmpty = data.length === 0;

  const renderChart = () => {
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
  };

  return (
    <WidgetContainer data-testid="chart-widget" data-chart-type={chartType}>
      <Title>{title}</Title>
      {renderChart()}
      {showLegend && !isEmpty && <ChartLegend data={data} />}
    </WidgetContainer>
  );
};

export default ChartWidget;
