/**
 * Smart Timing Heatmap Tests (TDD)
 *
 * Tests for TimingHeatmap and TimingRecommendation components
 * Based on UI_UX_INNOVATIONS_IMPLEMENTATION.md spec (P1.2 - Smart Timing Heatmap)
 */

import React, { ReactNode } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';

// Component imports (to be implemented)
import { TimingHeatmap } from '@/components/scheduler/TimingHeatmap';
import { TimingRecommendation } from '@/components/scheduler/TimingRecommendation';

// Types for Timing Heatmap feature
export interface HeatmapCell {
  day: number; // 0-6 (Sunday-Saturday)
  hour: number; // 0-23
  score: number; // 0-100 engagement score
  postCount?: number; // Number of posts in this slot
  avgEngagement?: number; // Average engagement
}

export interface TimingHeatmapData {
  cells: HeatmapCell[];
  bestSlots: Array<{
    day: number;
    hour: number;
    score: number;
    label: string;
  }>;
  dataQuality: 'low' | 'medium' | 'high';
  basedOnPosts: number;
}

// Create a fresh QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

// Theme wrapper for component tests
const ThemeWrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

const renderWithTheme = (ui: React.ReactElement) => {
  return render(ui, { wrapper: ThemeWrapper });
};

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </QueryClientProvider>
  );
};

// Generate mock heatmap data
const generateMockHeatmapData = (): TimingHeatmapData => {
  const cells: HeatmapCell[] = [];

  // Generate scores for each day/hour combination
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      // Simulate higher engagement during business hours
      const baseScore = (hour >= 9 && hour <= 18) ? 60 : 30;
      const dayBonus = (day >= 1 && day <= 5) ? 10 : 0; // Weekdays bonus
      const score = Math.min(100, baseScore + dayBonus + Math.floor(Math.random() * 20));

      cells.push({
        day,
        hour,
        score,
        postCount: Math.floor(Math.random() * 10),
        avgEngagement: score * 1.2,
      });
    }
  }

  // Find best slots
  const sortedCells = [...cells].sort((a, b) => b.score - a.score);
  const bestSlots = sortedCells.slice(0, 5).map((cell) => ({
    day: cell.day,
    hour: cell.hour,
    score: cell.score,
    label: `${getDayName(cell.day)} ${formatHour(cell.hour)}`,
  }));

  return {
    cells,
    bestSlots,
    dataQuality: 'high',
    basedOnPosts: 150,
  };
};

function getDayName(day: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[day];
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  return hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
}

const mockHeatmapData = generateMockHeatmapData();

// ============================================================================
// TimingHeatmap Component Tests
// ============================================================================

describe('TimingHeatmap Component', () => {
  const defaultProps = {
    data: mockHeatmapData,
    onCellSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders heatmap grid with data-testid="timing-heatmap"', () => {
      renderWithTheme(<TimingHeatmap {...defaultProps} />);

      expect(screen.getByTestId('timing-heatmap')).toBeInTheDocument();
    });

    it('renders 7 day columns (Sun-Sat)', () => {
      renderWithTheme(<TimingHeatmap {...defaultProps} />);

      const dayHeaders = screen.getAllByTestId(/^day-header-/);
      expect(dayHeaders).toHaveLength(7);

      expect(screen.getByText('Sun')).toBeInTheDocument();
      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Tue')).toBeInTheDocument();
      expect(screen.getByText('Wed')).toBeInTheDocument();
      expect(screen.getByText('Thu')).toBeInTheDocument();
      expect(screen.getByText('Fri')).toBeInTheDocument();
      expect(screen.getByText('Sat')).toBeInTheDocument();
    });

    it('renders 24 hour rows (0-23)', () => {
      renderWithTheme(<TimingHeatmap {...defaultProps} />);

      const hourLabels = screen.getAllByTestId(/^hour-label-/);
      expect(hourLabels).toHaveLength(24);
    });

    it('renders correct number of cells (7x24 = 168)', () => {
      renderWithTheme(<TimingHeatmap {...defaultProps} />);

      const cells = screen.getAllByTestId(/^heatmap-cell-/);
      expect(cells).toHaveLength(168);
    });

    it('renders cells with data-testid="heatmap-cell-{day}-{hour}"', () => {
      renderWithTheme(<TimingHeatmap {...defaultProps} />);

      // Check specific cells
      expect(screen.getByTestId('heatmap-cell-0-0')).toBeInTheDocument(); // Sunday 12AM
      expect(screen.getByTestId('heatmap-cell-1-9')).toBeInTheDocument(); // Monday 9AM
      expect(screen.getByTestId('heatmap-cell-6-23')).toBeInTheDocument(); // Saturday 11PM
    });
  });

  describe('Color Coding', () => {
    it('applies color based on engagement score', () => {
      const testData: TimingHeatmapData = {
        cells: [
          { day: 0, hour: 0, score: 90 }, // High
          { day: 0, hour: 1, score: 50 }, // Medium
          { day: 0, hour: 2, score: 20 }, // Low
        ],
        bestSlots: [],
        dataQuality: 'high',
        basedOnPosts: 100,
      };

      renderWithTheme(<TimingHeatmap {...defaultProps} data={testData} />);

      const highScoreCell = screen.getByTestId('heatmap-cell-0-0');
      const mediumScoreCell = screen.getByTestId('heatmap-cell-0-1');
      const lowScoreCell = screen.getByTestId('heatmap-cell-0-2');

      // Verify data-score attribute for styling
      expect(highScoreCell).toHaveAttribute('data-score', '90');
      expect(mediumScoreCell).toHaveAttribute('data-score', '50');
      expect(lowScoreCell).toHaveAttribute('data-score', '20');
    });

    it('shows legend with score ranges', () => {
      renderWithTheme(<TimingHeatmap {...defaultProps} />);

      expect(screen.getByTestId('heatmap-legend')).toBeInTheDocument();
      expect(screen.getByText(/low/i)).toBeInTheDocument();
      expect(screen.getByText(/high/i)).toBeInTheDocument();
    });
  });

  describe('Cell Interaction', () => {
    it('calls onCellSelect when cell is clicked', () => {
      const onCellSelect = jest.fn();
      renderWithTheme(<TimingHeatmap {...defaultProps} onCellSelect={onCellSelect} />);

      const cell = screen.getByTestId('heatmap-cell-1-10'); // Monday 10AM
      fireEvent.click(cell);

      expect(onCellSelect).toHaveBeenCalledTimes(1);
      expect(onCellSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          day: 1,
          hour: 10,
        })
      );
    });

    it('highlights selected cell', () => {
      renderWithTheme(<TimingHeatmap {...defaultProps} selectedDay={1} selectedHour={10} />);

      const selectedCell = screen.getByTestId('heatmap-cell-1-10');
      expect(selectedCell).toHaveAttribute('data-selected', 'true');
    });

    it('shows cursor pointer on hoverable cells', () => {
      renderWithTheme(<TimingHeatmap {...defaultProps} />);

      const cell = screen.getByTestId('heatmap-cell-0-0');
      expect(cell).toHaveStyle({ cursor: 'pointer' });
    });
  });

  describe('Tooltips', () => {
    it('shows tooltip on cell hover', async () => {
      renderWithTheme(<TimingHeatmap {...defaultProps} />);

      const cell = screen.getByTestId('heatmap-cell-0-0');
      fireEvent.mouseEnter(cell);

      await waitFor(() => {
        expect(screen.getByTestId('heatmap-tooltip')).toBeInTheDocument();
      });
    });

    it('tooltip contains score information', async () => {
      const testData: TimingHeatmapData = {
        cells: [{ day: 0, hour: 0, score: 85, postCount: 12, avgEngagement: 100 }],
        bestSlots: [],
        dataQuality: 'high',
        basedOnPosts: 100,
      };

      renderWithTheme(<TimingHeatmap {...defaultProps} data={testData} />);

      const cell = screen.getByTestId('heatmap-cell-0-0');
      fireEvent.mouseEnter(cell);

      await waitFor(() => {
        expect(screen.getByText(/85/)).toBeInTheDocument(); // Score
      });
    });

    it('tooltip shows time slot information', async () => {
      renderWithTheme(<TimingHeatmap {...defaultProps} />);

      const cell = screen.getByTestId('heatmap-cell-1-10'); // Monday 10AM
      fireEvent.mouseEnter(cell);

      await waitFor(() => {
        const tooltip = screen.getByTestId('heatmap-tooltip');
        expect(tooltip).toHaveTextContent(/monday/i);
        expect(tooltip).toHaveTextContent(/10/);
      });
    });

    it('hides tooltip on mouse leave', async () => {
      renderWithTheme(<TimingHeatmap {...defaultProps} />);

      const cell = screen.getByTestId('heatmap-cell-0-0');
      fireEvent.mouseEnter(cell);

      await waitFor(() => {
        expect(screen.getByTestId('heatmap-tooltip')).toBeInTheDocument();
      });

      fireEvent.mouseLeave(cell);

      await waitFor(() => {
        expect(screen.queryByTestId('heatmap-tooltip')).not.toBeInTheDocument();
      });
    });
  });

  describe('Best Slots Highlighting', () => {
    it('highlights best time slots', () => {
      const testData: TimingHeatmapData = {
        ...mockHeatmapData,
        bestSlots: [
          { day: 1, hour: 10, score: 95, label: 'Mon 10 AM' },
          { day: 2, hour: 14, score: 92, label: 'Tue 2 PM' },
        ],
      };

      renderWithTheme(<TimingHeatmap {...defaultProps} data={testData} />);

      const bestCell1 = screen.getByTestId('heatmap-cell-1-10');
      const bestCell2 = screen.getByTestId('heatmap-cell-2-14');

      expect(bestCell1).toHaveAttribute('data-best', 'true');
      expect(bestCell2).toHaveAttribute('data-best', 'true');
    });
  });

  describe('Loading State', () => {
    it('shows loading state when loading prop is true', () => {
      renderWithTheme(<TimingHeatmap {...defaultProps} data={null} loading />);

      expect(screen.getByTestId('heatmap-loading')).toBeInTheDocument();
    });

    it('shows skeleton grid during loading', () => {
      renderWithTheme(<TimingHeatmap {...defaultProps} data={null} loading />);

      // Should still show the grid structure
      const skeletonCells = screen.getAllByTestId(/skeleton-cell/);
      expect(skeletonCells.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no data', () => {
      const emptyData: TimingHeatmapData = {
        cells: [],
        bestSlots: [],
        dataQuality: 'low',
        basedOnPosts: 0,
      };

      renderWithTheme(<TimingHeatmap {...defaultProps} data={emptyData} />);

      expect(screen.getByTestId('heatmap-empty')).toBeInTheDocument();
      expect(screen.getByText(/not enough data/i)).toBeInTheDocument();
    });
  });

  describe('Data Quality Indicator', () => {
    it('shows data quality indicator', () => {
      renderWithTheme(<TimingHeatmap {...defaultProps} />);

      expect(screen.getByTestId('data-quality-indicator')).toBeInTheDocument();
    });

    it('shows "high" confidence for sufficient data', () => {
      const highQualityData = { ...mockHeatmapData, dataQuality: 'high' as const };
      renderWithTheme(<TimingHeatmap {...defaultProps} data={highQualityData} />);

      expect(screen.getByText(/high confidence/i)).toBeInTheDocument();
    });

    it('shows posts count', () => {
      renderWithTheme(<TimingHeatmap {...defaultProps} />);

      expect(screen.getByText(/150 posts/i)).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('renders in compact mode when compact prop is true', () => {
      renderWithTheme(<TimingHeatmap {...defaultProps} compact />);

      const heatmap = screen.getByTestId('timing-heatmap');
      expect(heatmap).toHaveAttribute('data-compact', 'true');
    });
  });
});

// ============================================================================
// TimingRecommendation Component Tests
// ============================================================================

describe('TimingRecommendation Component', () => {
  const defaultProps = {
    bestSlots: mockHeatmapData.bestSlots,
    onSlotSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders recommendation card with data-testid="timing-recommendation"', () => {
      renderWithTheme(<TimingRecommendation {...defaultProps} />);

      expect(screen.getByTestId('timing-recommendation')).toBeInTheDocument();
    });

    it('renders title "Best Times to Post"', () => {
      renderWithTheme(<TimingRecommendation {...defaultProps} />);

      expect(screen.getByText(/best times to post/i)).toBeInTheDocument();
    });

    it('renders list of recommended time slots', () => {
      renderWithTheme(<TimingRecommendation {...defaultProps} />);

      const slots = screen.getAllByTestId(/^recommendation-slot-/);
      expect(slots.length).toBeGreaterThan(0);
      expect(slots.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Slot Display', () => {
    it('shows day and time for each slot', () => {
      const slots = [
        { day: 1, hour: 10, score: 95, label: 'Mon 10 AM' },
        { day: 2, hour: 14, score: 90, label: 'Tue 2 PM' },
      ];

      renderWithTheme(<TimingRecommendation {...defaultProps} bestSlots={slots} />);

      expect(screen.getByText(/mon 10 am/i)).toBeInTheDocument();
      expect(screen.getByText(/tue 2 pm/i)).toBeInTheDocument();
    });

    it('shows engagement score for each slot', () => {
      const slots = [{ day: 1, hour: 10, score: 95, label: 'Mon 10 AM' }];

      renderWithTheme(<TimingRecommendation {...defaultProps} bestSlots={slots} />);

      expect(screen.getByText(/95%/)).toBeInTheDocument();
    });

    it('ranks slots by score (highest first)', () => {
      const slots = [
        { day: 1, hour: 10, score: 80, label: 'Mon 10 AM' },
        { day: 2, hour: 14, score: 95, label: 'Tue 2 PM' },
        { day: 3, hour: 9, score: 85, label: 'Wed 9 AM' },
      ];

      renderWithTheme(<TimingRecommendation {...defaultProps} bestSlots={slots} />);

      const slotElements = screen.getAllByTestId(/^recommendation-slot-/);
      expect(slotElements[0]).toHaveTextContent(/95%/);
    });
  });

  describe('Slot Selection', () => {
    it('calls onSlotSelect when slot is clicked', () => {
      const onSlotSelect = jest.fn();
      const slots = [{ day: 1, hour: 10, score: 95, label: 'Mon 10 AM' }];

      renderWithTheme(
        <TimingRecommendation {...defaultProps} bestSlots={slots} onSlotSelect={onSlotSelect} />
      );

      const slot = screen.getByTestId('recommendation-slot-0');
      fireEvent.click(slot);

      expect(onSlotSelect).toHaveBeenCalledTimes(1);
      expect(onSlotSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          day: 1,
          hour: 10,
          score: 95,
        })
      );
    });

    it('shows "Use this time" button on hover', async () => {
      const slots = [{ day: 1, hour: 10, score: 95, label: 'Mon 10 AM' }];

      renderWithTheme(<TimingRecommendation {...defaultProps} bestSlots={slots} />);

      const slot = screen.getByTestId('recommendation-slot-0');
      fireEvent.mouseEnter(slot);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /use this time/i })).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no best slots', () => {
      renderWithTheme(<TimingRecommendation {...defaultProps} bestSlots={[]} />);

      expect(screen.getByText(/no recommendations/i)).toBeInTheDocument();
    });

    it('shows message to sync more posts for better data', () => {
      renderWithTheme(<TimingRecommendation {...defaultProps} bestSlots={[]} />);

      expect(screen.getByText(/sync more posts/i)).toBeInTheDocument();
    });
  });

  describe('Score Visualization', () => {
    it('shows score badge with appropriate color for high scores', () => {
      const slots = [{ day: 1, hour: 10, score: 90, label: 'Mon 10 AM' }];

      renderWithTheme(<TimingRecommendation {...defaultProps} bestSlots={slots} />);

      const scoreBadge = screen.getByTestId('score-badge-0');
      expect(scoreBadge).toHaveAttribute('data-score-level', 'high');
    });

    it('shows score badge with appropriate color for medium scores', () => {
      const slots = [{ day: 1, hour: 10, score: 65, label: 'Mon 10 AM' }];

      renderWithTheme(<TimingRecommendation {...defaultProps} bestSlots={slots} />);

      const scoreBadge = screen.getByTestId('score-badge-0');
      expect(scoreBadge).toHaveAttribute('data-score-level', 'medium');
    });

    it('shows score badge with appropriate color for low scores', () => {
      const slots = [{ day: 1, hour: 10, score: 40, label: 'Mon 10 AM' }];

      renderWithTheme(<TimingRecommendation {...defaultProps} bestSlots={slots} />);

      const scoreBadge = screen.getByTestId('score-badge-0');
      expect(scoreBadge).toHaveAttribute('data-score-level', 'low');
    });
  });
});
