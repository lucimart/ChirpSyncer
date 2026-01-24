import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { ChartWidget, type ChartDataPoint } from './ChartWidget';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const mockData: ChartDataPoint[] = [
  { label: 'Mon', value: 100 },
  { label: 'Tue', value: 150 },
  { label: 'Wed', value: 80 },
  { label: 'Thu', value: 200 },
  { label: 'Fri', value: 120 },
];

describe('ChartWidget', () => {
  it('renders with title', () => {
    renderWithTheme(
      <ChartWidget data={mockData} title="Weekly Stats" chartType="bar" />
    );
    expect(screen.getByText('Weekly Stats')).toBeInTheDocument();
  });

  it('renders bar chart by default', () => {
    renderWithTheme(
      <ChartWidget data={mockData} title="Bar Chart" chartType="bar" />
    );
    expect(screen.getByTestId('chart-widget')).toBeInTheDocument();
    expect(screen.getByTestId('chart-container')).toBeInTheDocument();
    // Bar chart renders labels directly
    expect(screen.getByText('Mon')).toBeInTheDocument();
  });

  it('renders line chart when specified', () => {
    const { container } = renderWithTheme(
      <ChartWidget data={mockData} title="Line Chart" chartType="line" />
    );
    expect(screen.getByTestId('chart-widget')).toBeInTheDocument();
    // Line chart uses SVG
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders area chart when specified', () => {
    const { container } = renderWithTheme(
      <ChartWidget data={mockData} title="Area Chart" chartType="area" />
    );
    expect(screen.getByTestId('chart-widget')).toBeInTheDocument();
    // Area chart uses SVG with filled path
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('shows legend when showLegend is true', () => {
    renderWithTheme(
      <ChartWidget data={mockData} title="With Legend" chartType="bar" showLegend />
    );
    expect(screen.getByTestId('chart-legend')).toBeInTheDocument();
    // Mon appears both in bars and legend
    expect(screen.getAllByText('Mon')).toHaveLength(2);
  });

  it('hides legend by default', () => {
    renderWithTheme(
      <ChartWidget data={mockData} title="No Legend" chartType="bar" />
    );
    expect(screen.queryByTestId('chart-legend')).not.toBeInTheDocument();
  });

  it('shows empty state when data is empty', () => {
    renderWithTheme(
      <ChartWidget data={[]} title="Empty Chart" chartType="bar" />
    );
    expect(screen.getByTestId('chart-empty')).toBeInTheDocument();
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('does not show legend when data is empty', () => {
    renderWithTheme(
      <ChartWidget data={[]} title="Empty" chartType="bar" showLegend />
    );
    expect(screen.queryByTestId('chart-legend')).not.toBeInTheDocument();
  });

  it('renders all data points as bars', () => {
    renderWithTheme(
      <ChartWidget data={mockData} title="Bar Data" chartType="bar" />
    );
    mockData.forEach((point) => {
      expect(screen.getByText(point.label)).toBeInTheDocument();
    });
  });
});
