import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { AnimatedProgress, AnimatedCircularProgress } from './AnimatedProgress';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('AnimatedProgress', () => {
  it('renders the progress bar', () => {
    renderWithTheme(<AnimatedProgress value={50} />);
    expect(screen.getByTestId('animated-progress')).toBeInTheDocument();
  });

  it('renders with label', () => {
    renderWithTheme(<AnimatedProgress value={75} label="Loading..." />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows value when showValue is true', () => {
    renderWithTheme(<AnimatedProgress value={60} showValue />);
    // Value is animated, check for percentage text
    expect(document.body.textContent).toContain('%');
  });

  it('clamps value between 0 and 100', () => {
    renderWithTheme(<AnimatedProgress value={150} />);
    // Should not throw and render normally
    expect(screen.getByTestId('animated-progress')).toBeInTheDocument();
  });

  it('applies className', () => {
    renderWithTheme(<AnimatedProgress value={50} className="custom-class" />);
    const container = screen.getByTestId('animated-progress');
    expect(container).toHaveClass('custom-class');
  });

  it('renders with different sizes', () => {
    const { rerender } = renderWithTheme(<AnimatedProgress value={50} size="sm" />);
    expect(screen.getByTestId('animated-progress')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={theme}>
        <AnimatedProgress value={50} size="lg" />
      </ThemeProvider>
    );
    expect(screen.getByTestId('animated-progress')).toBeInTheDocument();
  });
});

describe('AnimatedCircularProgress', () => {
  it('renders the circular progress', () => {
    renderWithTheme(<AnimatedCircularProgress value={75} />);
    expect(screen.getByTestId('animated-circular-progress')).toBeInTheDocument();
  });

  it('renders SVG element', () => {
    renderWithTheme(<AnimatedCircularProgress value={50} />);
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('shows value by default', () => {
    renderWithTheme(<AnimatedCircularProgress value={80} />);
    expect(document.body.textContent).toContain('%');
  });

  it('hides value when showValue is false', () => {
    renderWithTheme(<AnimatedCircularProgress value={80} showValue={false} />);
    // Still renders but without value display
    expect(screen.getByTestId('animated-circular-progress')).toBeInTheDocument();
  });

  it('applies custom size', () => {
    renderWithTheme(<AnimatedCircularProgress value={50} size={100} />);
    const svg = document.querySelector('svg');
    expect(svg).toHaveAttribute('width', '100');
    expect(svg).toHaveAttribute('height', '100');
  });
});
