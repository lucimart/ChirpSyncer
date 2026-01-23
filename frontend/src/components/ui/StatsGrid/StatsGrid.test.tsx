import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { StatsGrid } from './StatsGrid';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('StatsGrid', () => {
  it('renders children content', () => {
    renderWithTheme(
      <StatsGrid>
        <div>Stat 1</div>
        <div>Stat 2</div>
        <div>Stat 3</div>
      </StatsGrid>
    );

    expect(screen.getByText('Stat 1')).toBeInTheDocument();
    expect(screen.getByText('Stat 2')).toBeInTheDocument();
    expect(screen.getByText('Stat 3')).toBeInTheDocument();
  });

  it('renders with data-testid', () => {
    renderWithTheme(
      <StatsGrid>
        <div>Content</div>
      </StatsGrid>
    );

    expect(screen.getByTestId('stats-grid')).toBeInTheDocument();
  });

  it('applies auto-fit columns by default', () => {
    renderWithTheme(
      <StatsGrid>
        <div>Content</div>
      </StatsGrid>
    );

    const grid = screen.getByTestId('stats-grid');
    expect(grid).toHaveStyle('display: grid');
  });

  it('applies fixed column count when specified', () => {
    renderWithTheme(
      <StatsGrid columns={4}>
        <div>A</div>
        <div>B</div>
        <div>C</div>
        <div>D</div>
      </StatsGrid>
    );

    const grid = screen.getByTestId('stats-grid');
    expect(grid).toHaveStyle('grid-template-columns: repeat(4, 1fr)');
  });

  it('applies margin bottom by default', () => {
    renderWithTheme(
      <StatsGrid>
        <div>Content</div>
      </StatsGrid>
    );

    const grid = screen.getByTestId('stats-grid');
    // margin-bottom should not be 0 by default
    const styles = getComputedStyle(grid);
    expect(styles.marginBottom).not.toBe('0');
  });

  it('removes margin bottom when marginBottom is false', () => {
    renderWithTheme(
      <StatsGrid marginBottom={false}>
        <div>Content</div>
      </StatsGrid>
    );

    const grid = screen.getByTestId('stats-grid');
    expect(grid).toHaveStyle('margin-bottom: 0');
  });

  it('renders multiple stat cards', () => {
    renderWithTheme(
      <StatsGrid>
        <div data-testid="stat-1">Total Posts: 1,234</div>
        <div data-testid="stat-2">Synced: 987</div>
        <div data-testid="stat-3">Pending: 247</div>
        <div data-testid="stat-4">Failed: 0</div>
      </StatsGrid>
    );

    expect(screen.getByTestId('stat-1')).toBeInTheDocument();
    expect(screen.getByTestId('stat-2')).toBeInTheDocument();
    expect(screen.getByTestId('stat-3')).toBeInTheDocument();
    expect(screen.getByTestId('stat-4')).toBeInTheDocument();
  });

  it('applies custom minColumnWidth', () => {
    renderWithTheme(
      <StatsGrid minColumnWidth="250px">
        <div>Content</div>
      </StatsGrid>
    );

    const grid = screen.getByTestId('stats-grid');
    expect(grid).toHaveStyle('grid-template-columns: repeat(auto-fit, minmax(250px, 1fr))');
  });
});
