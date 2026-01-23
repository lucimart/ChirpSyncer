import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { Grid } from './Grid';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('Grid', () => {
  it('renders correctly', () => {
    renderWithTheme(
      <Grid data-testid="grid">
        <div>Item 1</div>
        <div>Item 2</div>
      </Grid>
    );
    expect(screen.getByTestId('grid')).toBeInTheDocument();
  });

  it('renders children', () => {
    renderWithTheme(
      <Grid>
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      </Grid>
    );
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    renderWithTheme(
      <Grid className="custom-class" data-testid="grid">
        <div>Content</div>
      </Grid>
    );
    expect(screen.getByTestId('grid')).toHaveClass('custom-class');
  });

  it('forwards ref', () => {
    const ref = { current: null };
    renderWithTheme(
      <Grid ref={ref}>
        <div>Content</div>
      </Grid>
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('accepts different gap values', () => {
    const { rerender } = renderWithTheme(
      <Grid gap={2} data-testid="grid">
        <div>Content</div>
      </Grid>
    );
    expect(screen.getByTestId('grid')).toBeInTheDocument();

    rerender(
      <ThemeProvider>
        <Grid gap={6} data-testid="grid">
          <div>Content</div>
        </Grid>
      </ThemeProvider>
    );
    expect(screen.getByTestId('grid')).toBeInTheDocument();
  });

  it('accepts columns prop', () => {
    renderWithTheme(
      <Grid columns={3} data-testid="grid">
        <div>1</div>
        <div>2</div>
        <div>3</div>
      </Grid>
    );
    expect(screen.getByTestId('grid')).toBeInTheDocument();
  });

  it('accepts minWidth prop', () => {
    renderWithTheme(
      <Grid minWidth="200px" data-testid="grid">
        <div>Content</div>
      </Grid>
    );
    expect(screen.getByTestId('grid')).toBeInTheDocument();
  });
});
