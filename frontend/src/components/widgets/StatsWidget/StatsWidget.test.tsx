import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { StatsWidget, type StatItem } from './StatsWidget';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const mockStats: StatItem[] = [
  { label: 'Total Posts', value: 1250 },
  { label: 'Followers', value: '10.5K', change: 125 },
  { label: 'Engagement', value: '4.2%', change: -0.5 },
  { label: 'Impressions', value: 50000 },
];

describe('StatsWidget', () => {
  it('renders all stat items', () => {
    renderWithTheme(
      <StatsWidget stats={mockStats} title="Dashboard Stats" />
    );
    expect(screen.getByTestId('stats-widget')).toBeInTheDocument();
    expect(screen.getByText('Total Posts')).toBeInTheDocument();
    expect(screen.getByText('Followers')).toBeInTheDocument();
  });

  it('displays stat values', () => {
    renderWithTheme(
      <StatsWidget stats={mockStats} title="Dashboard Stats" />
    );
    expect(screen.getByText('1250')).toBeInTheDocument();
    expect(screen.getByText('10.5K')).toBeInTheDocument();
  });

  it('shows positive change indicator', () => {
    renderWithTheme(
      <StatsWidget stats={mockStats} title="Dashboard Stats" />
    );
    expect(screen.getByText('+125')).toBeInTheDocument();
  });

  it('shows negative change indicator', () => {
    renderWithTheme(
      <StatsWidget stats={mockStats} title="Dashboard Stats" />
    );
    expect(screen.getByText('-0.5')).toBeInTheDocument();
  });

  it('applies aria-label with title', () => {
    renderWithTheme(
      <StatsWidget stats={mockStats} title="Performance Metrics" />
    );
    expect(screen.getByLabelText('Performance Metrics')).toBeInTheDocument();
  });

  it('applies compact mode styles', () => {
    renderWithTheme(
      <StatsWidget stats={mockStats} title="Compact Stats" compact />
    );
    expect(screen.getByTestId('stats-widget')).toHaveAttribute('data-compact', 'true');
  });

  it('applies grid layout', () => {
    renderWithTheme(
      <StatsWidget stats={mockStats} title="Grid Stats" layout="grid" />
    );
    expect(screen.getByTestId('stats-widget')).toHaveAttribute('data-layout', 'grid');
  });

  it('applies list layout by default', () => {
    renderWithTheme(
      <StatsWidget stats={mockStats} title="List Stats" />
    );
    expect(screen.getByTestId('stats-widget')).toHaveAttribute('data-layout', 'list');
  });

  it('marks positive change items', () => {
    renderWithTheme(
      <StatsWidget stats={mockStats} title="Stats" />
    );
    expect(screen.getByTestId('stat-item-1')).toHaveAttribute('data-change', 'positive');
  });

  it('marks negative change items', () => {
    renderWithTheme(
      <StatsWidget stats={mockStats} title="Stats" />
    );
    expect(screen.getByTestId('stat-item-2')).toHaveAttribute('data-change', 'negative');
  });

  it('marks neutral items when no change', () => {
    renderWithTheme(
      <StatsWidget stats={mockStats} title="Stats" />
    );
    expect(screen.getByTestId('stat-item-0')).toHaveAttribute('data-change', 'neutral');
  });
});
