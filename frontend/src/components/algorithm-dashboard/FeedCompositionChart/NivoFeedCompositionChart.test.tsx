import type { ReactElement } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { NivoFeedCompositionChart, type FeedComposition } from './NivoFeedCompositionChart';

// Mock Nivo pie chart
jest.mock('@nivo/pie', () => ({
  ResponsivePie: ({ data, onMouseEnter, onMouseLeave, onClick }: {
    data: Array<{ id: string; label: string; value: number }>;
    onMouseEnter?: (datum: { id: string }) => void;
    onMouseLeave?: () => void;
    onClick?: (datum: { id: string }) => void;
  }) => (
    <div data-testid="nivo-pie">
      {data.map((datum) => (
        <div
          key={datum.id}
          data-testid={`pie-segment-${datum.id}`}
          onMouseEnter={() => onMouseEnter?.({ id: datum.id })}
          onMouseLeave={() => onMouseLeave?.()}
          onClick={() => onClick?.({ id: datum.id })}
        >
          {datum.label}: {datum.value}
        </div>
      ))}
    </div>
  ),
}));

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const mockData: FeedComposition = {
  boosted: 30,
  demoted: 20,
  filtered: 10,
  unaffected: 40,
};

describe('NivoFeedCompositionChart', () => {
  it('renders with data-testid', () => {
    renderWithTheme(<NivoFeedCompositionChart data={mockData} />);
    expect(screen.getByTestId('feed-composition-chart')).toBeInTheDocument();
  });

  it('renders Nivo pie chart', () => {
    renderWithTheme(<NivoFeedCompositionChart data={mockData} />);
    expect(screen.getByTestId('nivo-pie')).toBeInTheDocument();
  });

  it('renders all segments with values > 0', () => {
    renderWithTheme(<NivoFeedCompositionChart data={mockData} />);
    expect(screen.getByTestId('pie-segment-boosted')).toBeInTheDocument();
    expect(screen.getByTestId('pie-segment-demoted')).toBeInTheDocument();
    expect(screen.getByTestId('pie-segment-filtered')).toBeInTheDocument();
    expect(screen.getByTestId('pie-segment-unaffected')).toBeInTheDocument();
  });

  it('does not render segments with value 0', () => {
    const partialData: FeedComposition = {
      boosted: 50,
      demoted: 0,
      filtered: 0,
      unaffected: 50,
    };
    renderWithTheme(<NivoFeedCompositionChart data={partialData} />);
    expect(screen.getByTestId('pie-segment-boosted')).toBeInTheDocument();
    expect(screen.queryByTestId('pie-segment-demoted')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pie-segment-filtered')).not.toBeInTheDocument();
    expect(screen.getByTestId('pie-segment-unaffected')).toBeInTheDocument();
  });

  it('shows legend by default', () => {
    renderWithTheme(<NivoFeedCompositionChart data={mockData} />);
    expect(screen.getByTestId('chart-legend')).toBeInTheDocument();
  });

  it('hides legend when showLegend is false', () => {
    renderWithTheme(<NivoFeedCompositionChart data={mockData} showLegend={false} />);
    expect(screen.queryByTestId('chart-legend')).not.toBeInTheDocument();
  });

  it('shows percentages in legend by default', () => {
    renderWithTheme(<NivoFeedCompositionChart data={mockData} />);
    expect(screen.getByText('30%')).toBeInTheDocument(); // boosted
    expect(screen.getByText('40%')).toBeInTheDocument(); // unaffected
  });

  it('hides percentages when showPercentages is false', () => {
    renderWithTheme(<NivoFeedCompositionChart data={mockData} showPercentages={false} />);
    expect(screen.queryByText('30%')).not.toBeInTheDocument();
  });

  it('supports composition prop alias', () => {
    renderWithTheme(<NivoFeedCompositionChart composition={mockData} />);
    expect(screen.getByTestId('nivo-pie')).toBeInTheDocument();
  });

  it('calls onSegmentHover on mouse enter', () => {
    const handleHover = jest.fn();
    renderWithTheme(<NivoFeedCompositionChart data={mockData} onSegmentHover={handleHover} />);

    fireEvent.mouseEnter(screen.getByTestId('pie-segment-boosted'));

    expect(handleHover).toHaveBeenCalledWith('boosted');
  });

  it('calls onSegmentHover with null on mouse leave', () => {
    const handleHover = jest.fn();
    renderWithTheme(<NivoFeedCompositionChart data={mockData} onSegmentHover={handleHover} />);

    fireEvent.mouseLeave(screen.getByTestId('pie-segment-boosted'));

    expect(handleHover).toHaveBeenCalledWith(null);
  });

  it('calls onSegmentClick on click', () => {
    const handleClick = jest.fn();
    renderWithTheme(<NivoFeedCompositionChart data={mockData} onSegmentClick={handleClick} />);

    screen.getByTestId('pie-segment-demoted').click();

    expect(handleClick).toHaveBeenCalledWith('demoted');
  });

  it('shows empty state when all values are 0', () => {
    const emptyData: FeedComposition = {
      boosted: 0,
      demoted: 0,
      filtered: 0,
      unaffected: 0,
    };
    renderWithTheme(<NivoFeedCompositionChart data={emptyData} />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('uses default data when no props provided', () => {
    renderWithTheme(<NivoFeedCompositionChart />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });
});
