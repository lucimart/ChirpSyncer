import type { ReactElement } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { FeedCompositionChart, type FeedComposition } from './FeedCompositionChart';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const mockComposition: FeedComposition = {
  boosted: 30,
  demoted: 20,
  filtered: 10,
  unaffected: 40,
};

describe('FeedCompositionChart', () => {
  describe('Rendering', () => {
    it('renders chart container', () => {
      renderWithTheme(<FeedCompositionChart data={mockComposition} />);

      expect(screen.getByTestId('feed-composition-chart')).toBeInTheDocument();
    });

    it('renders SVG donut chart', () => {
      renderWithTheme(<FeedCompositionChart data={mockComposition} />);

      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('renders chart segments for non-zero values', () => {
      renderWithTheme(<FeedCompositionChart data={mockComposition} />);

      expect(screen.getByTestId('chart-segment-boosted')).toBeInTheDocument();
      expect(screen.getByTestId('chart-segment-demoted')).toBeInTheDocument();
      expect(screen.getByTestId('chart-segment-filtered')).toBeInTheDocument();
      expect(screen.getByTestId('chart-segment-unaffected')).toBeInTheDocument();
    });

    it('does not render segments with zero values', () => {
      const dataWithZero: FeedComposition = {
        boosted: 50,
        demoted: 0,
        filtered: 0,
        unaffected: 50,
      };
      renderWithTheme(<FeedCompositionChart data={dataWithZero} />);

      expect(screen.getByTestId('chart-segment-boosted')).toBeInTheDocument();
      expect(screen.queryByTestId('chart-segment-demoted')).not.toBeInTheDocument();
      expect(screen.queryByTestId('chart-segment-filtered')).not.toBeInTheDocument();
      expect(screen.getByTestId('chart-segment-unaffected')).toBeInTheDocument();
    });

    it('supports composition prop as alias for data', () => {
      renderWithTheme(<FeedCompositionChart composition={mockComposition} />);

      expect(screen.getByTestId('chart-segment-boosted')).toBeInTheDocument();
    });
  });

  describe('Legend', () => {
    it('renders legend by default', () => {
      renderWithTheme(<FeedCompositionChart data={mockComposition} />);

      expect(screen.getByTestId('chart-legend')).toBeInTheDocument();
    });

    it('hides legend when showLegend is false', () => {
      renderWithTheme(<FeedCompositionChart data={mockComposition} showLegend={false} />);

      expect(screen.queryByTestId('chart-legend')).not.toBeInTheDocument();
    });

    it('shows all category labels in legend', () => {
      renderWithTheme(<FeedCompositionChart data={mockComposition} />);

      expect(screen.getByText('Boosted')).toBeInTheDocument();
      expect(screen.getByText('Demoted')).toBeInTheDocument();
      expect(screen.getByText('Filtered')).toBeInTheDocument();
      expect(screen.getByText('Unaffected')).toBeInTheDocument();
    });

    it('only shows labels for non-zero segments', () => {
      const dataWithZero: FeedComposition = {
        boosted: 100,
        demoted: 0,
        filtered: 0,
        unaffected: 0,
      };
      renderWithTheme(<FeedCompositionChart data={dataWithZero} />);

      expect(screen.getByText('Boosted')).toBeInTheDocument();
      expect(screen.queryByText('Demoted')).not.toBeInTheDocument();
      expect(screen.queryByText('Filtered')).not.toBeInTheDocument();
      expect(screen.queryByText('Unaffected')).not.toBeInTheDocument();
    });
  });

  describe('Percentages', () => {
    it('shows percentages by default', () => {
      renderWithTheme(<FeedCompositionChart data={mockComposition} />);

      expect(screen.getByText('30%')).toBeInTheDocument();
      expect(screen.getByText('20%')).toBeInTheDocument();
      expect(screen.getByText('10%')).toBeInTheDocument();
      expect(screen.getByText('40%')).toBeInTheDocument();
    });

    it('shows total in center by default', () => {
      renderWithTheme(<FeedCompositionChart data={mockComposition} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
    });

    it('segments have correct percentage data attributes', () => {
      renderWithTheme(<FeedCompositionChart data={mockComposition} />);

      expect(screen.getByTestId('chart-segment-boosted')).toHaveAttribute(
        'data-percentage',
        '30'
      );
      expect(screen.getByTestId('chart-segment-demoted')).toHaveAttribute(
        'data-percentage',
        '20'
      );
    });
  });

  describe('Interactions', () => {
    it('calls onSegmentHover when hovering over segment', () => {
      const onHover = jest.fn();
      renderWithTheme(
        <FeedCompositionChart data={mockComposition} onSegmentHover={onHover} />
      );

      fireEvent.mouseEnter(screen.getByTestId('chart-segment-boosted'));
      expect(onHover).toHaveBeenCalledWith('boosted');
    });

    it('calls onSegmentHover with null when leaving segment', () => {
      const onHover = jest.fn();
      renderWithTheme(
        <FeedCompositionChart data={mockComposition} onSegmentHover={onHover} />
      );

      fireEvent.mouseEnter(screen.getByTestId('chart-segment-boosted'));
      fireEvent.mouseLeave(screen.getByTestId('chart-segment-boosted'));
      expect(onHover).toHaveBeenLastCalledWith(null);
    });

    it('calls onSegmentClick when clicking segment', () => {
      const onClick = jest.fn();
      renderWithTheme(
        <FeedCompositionChart data={mockComposition} onSegmentClick={onClick} />
      );

      fireEvent.click(screen.getByTestId('chart-segment-demoted'));
      expect(onClick).toHaveBeenCalledWith('demoted');
    });

    it('shows tooltip on hover', () => {
      renderWithTheme(<FeedCompositionChart data={mockComposition} />);

      fireEvent.mouseEnter(screen.getByTestId('chart-segment-boosted'));
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      expect(screen.getByRole('tooltip')).toHaveTextContent('Boosted: 30%');
    });

    it('hides tooltip when mouse leaves', () => {
      renderWithTheme(<FeedCompositionChart data={mockComposition} />);

      fireEvent.mouseEnter(screen.getByTestId('chart-segment-boosted'));
      fireEvent.mouseLeave(screen.getByTestId('chart-segment-boosted'));
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('updates center text on hover', () => {
      renderWithTheme(<FeedCompositionChart data={mockComposition} />);

      fireEvent.mouseEnter(screen.getByTestId('chart-segment-filtered'));
      // Center text shows percentage and label - check within SVG
      const svg = screen.getByRole('img');
      expect(svg).toHaveTextContent('10%');
      expect(svg).toHaveTextContent('Filtered');
    });
  });

  describe('Accessibility', () => {
    it('has accessible label on SVG', () => {
      renderWithTheme(<FeedCompositionChart data={mockComposition} />);

      expect(screen.getByRole('img')).toHaveAttribute(
        'aria-label',
        'Feed composition chart showing the distribution of boosted, demoted, filtered, and unaffected posts'
      );
    });

    it('has title element in SVG', () => {
      renderWithTheme(<FeedCompositionChart data={mockComposition} />);

      expect(screen.getByText('Feed Composition Chart')).toBeInTheDocument();
    });

    it('segments have aria-labels', () => {
      renderWithTheme(<FeedCompositionChart data={mockComposition} />);

      expect(screen.getByTestId('chart-segment-boosted')).toHaveAttribute(
        'aria-label',
        '30% of posts are boosted'
      );
    });
  });

  describe('Edge Cases', () => {
    it('handles all zeros gracefully', () => {
      const emptyData: FeedComposition = {
        boosted: 0,
        demoted: 0,
        filtered: 0,
        unaffected: 0,
      };
      renderWithTheme(<FeedCompositionChart data={emptyData} />);

      expect(screen.getByTestId('feed-composition-chart')).toBeInTheDocument();
      expect(screen.queryByTestId('chart-segment-boosted')).not.toBeInTheDocument();
    });

    it('handles single segment (100%)', () => {
      const singleData: FeedComposition = {
        boosted: 100,
        demoted: 0,
        filtered: 0,
        unaffected: 0,
      };
      renderWithTheme(<FeedCompositionChart data={singleData} />);

      expect(screen.getByTestId('chart-segment-boosted')).toBeInTheDocument();
      expect(screen.getByTestId('chart-segment-boosted')).toHaveAttribute(
        'data-percentage',
        '100'
      );
    });

    it('handles missing data prop', () => {
      renderWithTheme(<FeedCompositionChart />);

      expect(screen.getByTestId('feed-composition-chart')).toBeInTheDocument();
    });
  });
});
