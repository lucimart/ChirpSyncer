import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { TimingHeatmap, TimingHeatmapData, HeatmapCell } from './TimingHeatmap';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

const createMockData = (overrides: Partial<TimingHeatmapData> = {}): TimingHeatmapData => ({
  cells: [
    { day: 0, hour: 9, score: 75, postCount: 10, avgEngagement: 200 },
    { day: 1, hour: 12, score: 90, postCount: 15, avgEngagement: 350 },
    { day: 2, hour: 18, score: 85, postCount: 12, avgEngagement: 280 },
    { day: 3, hour: 14, score: 60, postCount: 8, avgEngagement: 150 },
    { day: 4, hour: 19, score: 95, postCount: 20, avgEngagement: 420 },
  ],
  bestSlots: [
    { day: 4, hour: 19, score: 95, label: 'Friday 7 PM' },
    { day: 1, hour: 12, score: 90, label: 'Monday 12 PM' },
  ],
  dataQuality: 'high',
  basedOnPosts: 100,
  ...overrides,
});

describe('TimingHeatmap', () => {
  it('renders the heatmap with title', () => {
    const data = createMockData();
    renderWithTheme(<TimingHeatmap data={data} />);

    expect(screen.getByText('Engagement Heatmap')).toBeInTheDocument();
    expect(screen.getByTestId('timing-heatmap')).toBeInTheDocument();
  });

  it('renders day headers', () => {
    const data = createMockData();
    renderWithTheme(<TimingHeatmap data={data} />);

    expect(screen.getByTestId('day-header-0')).toHaveTextContent('Sun');
    expect(screen.getByTestId('day-header-1')).toHaveTextContent('Mon');
    expect(screen.getByTestId('day-header-2')).toHaveTextContent('Tue');
    expect(screen.getByTestId('day-header-6')).toHaveTextContent('Sat');
  });

  it('renders hour labels', () => {
    const data = createMockData();
    renderWithTheme(<TimingHeatmap data={data} />);

    expect(screen.getByTestId('hour-label-0')).toHaveTextContent('12 AM');
    expect(screen.getByTestId('hour-label-9')).toHaveTextContent('9 AM');
    expect(screen.getByTestId('hour-label-12')).toHaveTextContent('12 PM');
    expect(screen.getByTestId('hour-label-18')).toHaveTextContent('6 PM');
  });

  it('renders cells with score data', () => {
    const data = createMockData();
    renderWithTheme(<TimingHeatmap data={data} />);

    const cell = screen.getByTestId('heatmap-cell-1-12');
    expect(cell).toHaveAttribute('data-score', '90');
  });

  it('marks best slots', () => {
    const data = createMockData();
    renderWithTheme(<TimingHeatmap data={data} />);

    const bestCell = screen.getByTestId('heatmap-cell-4-19');
    expect(bestCell).toHaveAttribute('data-best', 'true');
  });

  it('highlights selected cell', () => {
    const data = createMockData();
    renderWithTheme(<TimingHeatmap data={data} selectedDay={1} selectedHour={12} />);

    const selectedCell = screen.getByTestId('heatmap-cell-1-12');
    expect(selectedCell).toHaveAttribute('data-selected', 'true');
  });

  it('calls onCellSelect when cell is clicked', () => {
    const data = createMockData();
    const onCellSelect = jest.fn();
    renderWithTheme(<TimingHeatmap data={data} onCellSelect={onCellSelect} />);

    fireEvent.click(screen.getByTestId('heatmap-cell-1-12'));

    expect(onCellSelect).toHaveBeenCalledWith(
      expect.objectContaining({ day: 1, hour: 12, score: 90 })
    );
  });

  it('renders legend', () => {
    const data = createMockData();
    renderWithTheme(<TimingHeatmap data={data} />);

    expect(screen.getByTestId('heatmap-legend')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('Best')).toBeInTheDocument();
  });

  it('displays data quality indicator', () => {
    const data = createMockData({ dataQuality: 'high' });
    renderWithTheme(<TimingHeatmap data={data} />);

    expect(screen.getByTestId('data-quality-indicator')).toBeInTheDocument();
    expect(screen.getByText('High confidence')).toBeInTheDocument();
  });

  it('shows medium confidence for medium quality', () => {
    const data = createMockData({ dataQuality: 'medium' });
    renderWithTheme(<TimingHeatmap data={data} />);

    expect(screen.getByText('Medium confidence')).toBeInTheDocument();
  });

  it('shows low confidence for low quality', () => {
    const data = createMockData({ dataQuality: 'low' });
    renderWithTheme(<TimingHeatmap data={data} />);

    expect(screen.getByText('Low confidence')).toBeInTheDocument();
  });

  it('displays post count', () => {
    const data = createMockData({ basedOnPosts: 247 });
    renderWithTheme(<TimingHeatmap data={data} />);

    expect(screen.getByText('Based on 247 posts')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    renderWithTheme(<TimingHeatmap data={null} loading={true} />);

    expect(screen.getByTestId('heatmap-loading')).toBeInTheDocument();
    expect(screen.getByTestId('skeleton-cell-0-0')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    renderWithTheme(<TimingHeatmap data={null} loading={false} />);

    expect(screen.getByTestId('heatmap-empty')).toBeInTheDocument();
    expect(screen.getByText('Not Enough Data')).toBeInTheDocument();
  });

  it('renders in compact mode', () => {
    const data = createMockData();
    renderWithTheme(<TimingHeatmap data={data} compact={true} />);

    expect(screen.getByTestId('timing-heatmap')).toHaveAttribute('data-compact', 'true');
  });

  it('shows tooltip on hover', () => {
    const data = createMockData();
    renderWithTheme(<TimingHeatmap data={data} />);

    fireEvent.mouseEnter(screen.getByTestId('heatmap-cell-1-12'), { clientX: 100, clientY: 100 });

    expect(screen.getByTestId('heatmap-tooltip')).toBeInTheDocument();
    expect(screen.getByText('Monday 12 PM')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  it('hides tooltip on mouse leave', () => {
    const data = createMockData();
    renderWithTheme(<TimingHeatmap data={data} />);

    const cell = screen.getByTestId('heatmap-cell-1-12');
    fireEvent.mouseEnter(cell, { clientX: 100, clientY: 100 });
    expect(screen.getByTestId('heatmap-tooltip')).toBeInTheDocument();

    fireEvent.mouseLeave(cell);
    expect(screen.queryByTestId('heatmap-tooltip')).not.toBeInTheDocument();
  });
});
