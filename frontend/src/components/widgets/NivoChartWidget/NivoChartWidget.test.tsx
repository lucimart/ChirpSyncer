import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { NivoChartWidget, type ChartDataPoint } from './NivoChartWidget';

// Mock ResizeObserver for Nivo
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock Nivo components
jest.mock('@nivo/bar', () => ({
  ResponsiveBar: ({ data }: { data: unknown[] }) => (
    <div data-testid="nivo-bar-mock" data-count={data.length}>
      Bar Chart Mock
    </div>
  ),
}));

jest.mock('@nivo/line', () => ({
  ResponsiveLine: ({ data }: { data: unknown[] }) => (
    <div data-testid="nivo-line-mock" data-count={data.length}>
      Line Chart Mock
    </div>
  ),
}));

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

const mockData: ChartDataPoint[] = [
  { label: 'Mon', value: 10 },
  { label: 'Tue', value: 25 },
  { label: 'Wed', value: 15 },
  { label: 'Thu', value: 30 },
  { label: 'Fri', value: 20 },
];

describe('NivoChartWidget', () => {
  it('renders with title', () => {
    renderWithTheme(
      <NivoChartWidget data={mockData} title="Test Chart" chartType="bar" />
    );

    expect(screen.getByText('Test Chart')).toBeInTheDocument();
  });

  it('renders bar chart', () => {
    renderWithTheme(
      <NivoChartWidget data={mockData} title="Bar Chart" chartType="bar" />
    );

    // Verify bar chart mock is rendered
    expect(screen.getByTestId('nivo-bar-mock')).toBeInTheDocument();
    expect(screen.getByText('Bar Chart Mock')).toBeInTheDocument();
  });

  it('renders line chart', () => {
    renderWithTheme(
      <NivoChartWidget data={mockData} title="Line Chart" chartType="line" />
    );

    // Verify line chart mock is rendered
    expect(screen.getByTestId('nivo-line-mock')).toBeInTheDocument();
    expect(screen.getByText('Line Chart Mock')).toBeInTheDocument();
  });

  it('renders area chart', () => {
    renderWithTheme(
      <NivoChartWidget data={mockData} title="Area Chart" chartType="area" />
    );

    // Area uses the same line mock with isArea prop
    expect(screen.getByTestId('nivo-line-mock')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    renderWithTheme(
      <NivoChartWidget data={[]} title="Empty Chart" chartType="bar" />
    );

    expect(screen.getByTestId('chart-empty')).toBeInTheDocument();
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('renders chart container', () => {
    renderWithTheme(
      <NivoChartWidget data={mockData} title="Chart" chartType="bar" />
    );

    expect(screen.getByTestId('chart-container')).toBeInTheDocument();
  });
});
