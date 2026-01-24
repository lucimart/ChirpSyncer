import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { TimingRecommendation } from './TimingRecommendation';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

const mockBestSlots = [
  { day: 2, hour: 12, score: 92, label: 'Tuesday 12:00 PM' },
  { day: 4, hour: 18, score: 88, label: 'Thursday 6:00 PM' },
  { day: 1, hour: 19, score: 65, label: 'Monday 7:00 PM' },
  { day: 3, hour: 14, score: 45, label: 'Wednesday 2:00 PM' },
];

describe('TimingRecommendation', () => {
  it('renders the component with title', () => {
    renderWithTheme(<TimingRecommendation bestSlots={mockBestSlots} />);

    expect(screen.getByText('Best Times to Post')).toBeInTheDocument();
    expect(screen.getByTestId('timing-recommendation')).toBeInTheDocument();
  });

  it('renders all slots', () => {
    renderWithTheme(<TimingRecommendation bestSlots={mockBestSlots} />);

    expect(screen.getByText('Tuesday 12:00 PM')).toBeInTheDocument();
    expect(screen.getByText('Thursday 6:00 PM')).toBeInTheDocument();
    expect(screen.getByText('Monday 7:00 PM')).toBeInTheDocument();
    expect(screen.getByText('Wednesday 2:00 PM')).toBeInTheDocument();
  });

  it('sorts slots by score (highest first)', () => {
    renderWithTheme(<TimingRecommendation bestSlots={mockBestSlots} />);

    const slots = screen.getAllByTestId(/recommendation-slot-/);
    expect(slots[0]).toHaveTextContent('Tuesday 12:00 PM');
    expect(slots[0]).toHaveTextContent('92%');
    expect(slots[1]).toHaveTextContent('Thursday 6:00 PM');
    expect(slots[1]).toHaveTextContent('88%');
  });

  it('displays score badges with correct levels', () => {
    renderWithTheme(<TimingRecommendation bestSlots={mockBestSlots} />);

    // High score (>= 80)
    expect(screen.getByTestId('score-badge-0')).toHaveAttribute('data-score-level', 'high');
    expect(screen.getByTestId('score-badge-1')).toHaveAttribute('data-score-level', 'high');

    // Medium score (>= 60)
    expect(screen.getByTestId('score-badge-2')).toHaveAttribute('data-score-level', 'medium');

    // Low score (< 60)
    expect(screen.getByTestId('score-badge-3')).toHaveAttribute('data-score-level', 'low');
  });

  it('calls onSlotSelect when slot is clicked', () => {
    const onSlotSelect = jest.fn();
    renderWithTheme(
      <TimingRecommendation bestSlots={mockBestSlots} onSlotSelect={onSlotSelect} />
    );

    fireEvent.click(screen.getByTestId('recommendation-slot-0'));

    expect(onSlotSelect).toHaveBeenCalledWith(
      expect.objectContaining({ day: 2, hour: 12, score: 92 })
    );
  });

  it('shows "Use this time" button on hover', () => {
    renderWithTheme(<TimingRecommendation bestSlots={mockBestSlots} />);

    expect(screen.queryByText('Use this time')).not.toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByTestId('recommendation-slot-0'));

    expect(screen.getByText('Use this time')).toBeInTheDocument();
  });

  it('hides "Use this time" button on mouse leave', () => {
    renderWithTheme(<TimingRecommendation bestSlots={mockBestSlots} />);

    const slot = screen.getByTestId('recommendation-slot-0');
    fireEvent.mouseEnter(slot);
    expect(screen.getByText('Use this time')).toBeInTheDocument();

    fireEvent.mouseLeave(slot);
    expect(screen.queryByText('Use this time')).not.toBeInTheDocument();
  });

  it('calls onSlotSelect when "Use this time" button is clicked', () => {
    const onSlotSelect = jest.fn();
    renderWithTheme(
      <TimingRecommendation bestSlots={mockBestSlots} onSlotSelect={onSlotSelect} />
    );

    fireEvent.mouseEnter(screen.getByTestId('recommendation-slot-0'));
    fireEvent.click(screen.getByText('Use this time'));

    expect(onSlotSelect).toHaveBeenCalledWith(
      expect.objectContaining({ day: 2, hour: 12, score: 92 })
    );
  });

  it('renders empty state when no slots', () => {
    renderWithTheme(<TimingRecommendation bestSlots={[]} />);

    expect(screen.getByText('No recommendations')).toBeInTheDocument();
    expect(screen.getByText('Sync more posts to get timing recommendations')).toBeInTheDocument();
  });

  it('works without onSlotSelect handler', () => {
    renderWithTheme(<TimingRecommendation bestSlots={mockBestSlots} />);

    // Should not throw when clicking without handler
    fireEvent.click(screen.getByTestId('recommendation-slot-0'));
  });
});
