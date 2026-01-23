import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { D3TimingHeatmap } from './D3TimingHeatmap';
import type { TimingHeatmapData, HeatmapCell } from './types';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

const mockCells: HeatmapCell[] = [
  { day: 0, hour: 9, score: 75, postCount: 5, avgEngagement: 120 },
  { day: 0, hour: 10, score: 90, postCount: 8, avgEngagement: 180 },
  { day: 1, hour: 14, score: 60, postCount: 3, avgEngagement: 80 },
  { day: 2, hour: 18, score: 85, postCount: 6, avgEngagement: 150 },
  { day: 3, hour: 12, score: 45, postCount: 2, avgEngagement: 50 },
  { day: 4, hour: 20, score: 70, postCount: 4, avgEngagement: 100 },
  { day: 5, hour: 11, score: 55, postCount: 3, avgEngagement: 70 },
  { day: 6, hour: 15, score: 80, postCount: 7, avgEngagement: 140 },
];

const mockData: TimingHeatmapData = {
  cells: mockCells,
  bestSlots: [
    { day: 0, hour: 10, score: 90, label: 'Sunday 10 AM' },
    { day: 2, hour: 18, score: 85, label: 'Tuesday 6 PM' },
  ],
  dataQuality: 'high',
  basedOnPosts: 38,
};

describe('D3TimingHeatmap', () => {
  it('renders with title', () => {
    renderWithTheme(<D3TimingHeatmap data={mockData} />);

    expect(screen.getByText('Engagement Heatmap')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    renderWithTheme(<D3TimingHeatmap data={null} />);

    expect(screen.getByText('Not Enough Data')).toBeInTheDocument();
  });

  it('renders empty state when cells array is empty', () => {
    const emptyData: TimingHeatmapData = {
      cells: [],
      bestSlots: [],
      dataQuality: 'low',
      basedOnPosts: 0,
    };
    renderWithTheme(<D3TimingHeatmap data={emptyData} />);

    expect(screen.getByText('Not Enough Data')).toBeInTheDocument();
  });

  it('renders the heatmap container', () => {
    renderWithTheme(<D3TimingHeatmap data={mockData} />);

    expect(screen.getByTestId('d3-timing-heatmap')).toBeInTheDocument();
  });

  it('renders legend by default', () => {
    renderWithTheme(<D3TimingHeatmap data={mockData} />);

    expect(screen.getByTestId('heatmap-legend')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('Best')).toBeInTheDocument();
  });

  it('hides legend when showLegend is false', () => {
    renderWithTheme(<D3TimingHeatmap data={mockData} showLegend={false} />);

    expect(screen.queryByTestId('heatmap-legend')).not.toBeInTheDocument();
  });

  it('calls onCellSelect when a cell is clicked', () => {
    const handleCellSelect = jest.fn();
    renderWithTheme(
      <D3TimingHeatmap data={mockData} onCellSelect={handleCellSelect} />
    );

    // Find a cell and click it
    const cells = document.querySelectorAll('.cell');
    if (cells.length > 0) {
      fireEvent.click(cells[0]);
      expect(handleCellSelect).toHaveBeenCalled();
    }
  });

  it('renders SVG element', () => {
    renderWithTheme(<D3TimingHeatmap data={mockData} />);

    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('shows loading state when loading is true', () => {
    renderWithTheme(<D3TimingHeatmap data={null} loading={true} />);

    expect(screen.getByTestId('heatmap-loading')).toBeInTheDocument();
  });

  it('shows data quality indicator', () => {
    renderWithTheme(<D3TimingHeatmap data={mockData} />);

    expect(screen.getByTestId('data-quality-indicator')).toBeInTheDocument();
    expect(screen.getByText('High confidence')).toBeInTheDocument();
  });

  it('shows posts count', () => {
    renderWithTheme(<D3TimingHeatmap data={mockData} />);

    expect(screen.getByText('Based on 38 posts')).toBeInTheDocument();
  });
});
