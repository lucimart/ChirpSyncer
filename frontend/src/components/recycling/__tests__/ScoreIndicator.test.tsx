import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/styles/ThemeContext';
import { ScoreIndicator } from '../ScoreIndicator';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('ScoreIndicator', () => {
  it('renders with label', () => {
    renderWithTheme(<ScoreIndicator value={50} label="Engagement" />);

    expect(screen.getByText('Engagement')).toBeInTheDocument();
  });

  it('displays the score value', () => {
    renderWithTheme(<ScoreIndicator value={75} label="Score" />);

    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it('renders progress bar with correct aria attributes', () => {
    renderWithTheme(<ScoreIndicator value={60} label="Evergreen" />);

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '60');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
  });

  it('shows red color for low scores (< 30)', () => {
    renderWithTheme(<ScoreIndicator value={20} label="Low" />);

    const indicator = screen.getByTestId('score-indicator');
    expect(indicator).toHaveAttribute('data-score-level', 'low');
  });

  it('shows yellow color for medium scores (30-70)', () => {
    renderWithTheme(<ScoreIndicator value={50} label="Medium" />);

    const indicator = screen.getByTestId('score-indicator');
    expect(indicator).toHaveAttribute('data-score-level', 'medium');
  });

  it('shows green color for high scores (> 70)', () => {
    renderWithTheme(<ScoreIndicator value={85} label="High" />);

    const indicator = screen.getByTestId('score-indicator');
    expect(indicator).toHaveAttribute('data-score-level', 'high');
  });

  it('clamps value to 0 when negative', () => {
    renderWithTheme(<ScoreIndicator value={-10} label="Negative" />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('clamps value to 100 when over max', () => {
    renderWithTheme(<ScoreIndicator value={150} label="Over" />);

    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('renders in compact mode without label text', () => {
    renderWithTheme(<ScoreIndicator value={50} label="Hidden" compact />);

    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
    // But aria-label should still be present for accessibility
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label', 'Hidden: 50');
  });

  it('shows tooltip on hover with description', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <ScoreIndicator
        value={75}
        label="Engagement"
        tooltip="How well this content performs"
      />
    );

    const indicator = screen.getByTestId('score-indicator');
    await user.hover(indicator);

    expect(screen.getByRole('tooltip')).toHaveTextContent('How well this content performs');
  });

  it('renders different sizes', () => {
    const { rerender } = renderWithTheme(<ScoreIndicator value={50} label="Small" size="sm" />);
    expect(screen.getByTestId('score-indicator')).toHaveAttribute('data-size', 'sm');

    rerender(<ThemeProvider><ScoreIndicator value={50} label="Medium" size="md" /></ThemeProvider>);
    expect(screen.getByTestId('score-indicator')).toHaveAttribute('data-size', 'md');

    rerender(<ThemeProvider><ScoreIndicator value={50} label="Large" size="lg" /></ThemeProvider>);
    expect(screen.getByTestId('score-indicator')).toHaveAttribute('data-size', 'lg');
  });

  it('applies custom className', () => {
    renderWithTheme(<ScoreIndicator value={50} label="Custom" className="my-custom-class" />);

    expect(screen.getByTestId('score-indicator')).toHaveClass('my-custom-class');
  });

  it('renders boundary score of 30 as medium', () => {
    renderWithTheme(<ScoreIndicator value={30} label="Boundary" />);

    const indicator = screen.getByTestId('score-indicator');
    expect(indicator).toHaveAttribute('data-score-level', 'medium');
  });

  it('renders boundary score of 70 as medium', () => {
    renderWithTheme(<ScoreIndicator value={70} label="Boundary" />);

    const indicator = screen.getByTestId('score-indicator');
    expect(indicator).toHaveAttribute('data-score-level', 'medium');
  });

  it('renders score of 71 as high', () => {
    renderWithTheme(<ScoreIndicator value={71} label="High" />);

    const indicator = screen.getByTestId('score-indicator');
    expect(indicator).toHaveAttribute('data-score-level', 'high');
  });
});
