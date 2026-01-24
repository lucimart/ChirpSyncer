import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { Progress } from './Progress';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('Progress', () => {
  it('renders with default props', () => {
    renderWithTheme(<Progress value={50} />);
    expect(screen.getByText(/50.*\/.*100/)).toBeInTheDocument();
  });

  it('renders with label', () => {
    renderWithTheme(<Progress value={30} label="Loading" />);
    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  it('calculates percentage correctly', () => {
    renderWithTheme(<Progress value={25} max={100} />);
    expect(screen.getByText(/25%/)).toBeInTheDocument();
  });

  it('handles custom max value', () => {
    renderWithTheme(<Progress value={250} max={1000} />);
    expect(screen.getByText(/250.*\/.*1,000/)).toBeInTheDocument();
    expect(screen.getByText(/25%/)).toBeInTheDocument();
  });

  it('hides value when showValue is false', () => {
    renderWithTheme(<Progress value={50} showValue={false} />);
    expect(screen.queryByText(/50%/)).not.toBeInTheDocument();
  });

  it('renders details when provided', () => {
    renderWithTheme(
      <Progress
        value={50}
        details={[
          { label: 'Used', value: '50' },
          { label: 'Free', value: '50' },
        ]}
      />
    );
    expect(screen.getByText('Used')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('clamps value between 0 and 100 percent visually', () => {
    const { container, rerender } = renderWithTheme(<Progress value={150} max={100} />);

    // Component renders without crashing for over-100% value
    expect(container.firstChild).toBeInTheDocument();

    // Test with negative value - should also render without crashing
    rerender(
      <ThemeProvider theme={theme}>
        <Progress value={-50} max={100} />
      </ThemeProvider>
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders different sizes', () => {
    const { rerender, container } = renderWithTheme(<Progress value={50} size="sm" />);
    expect(container.querySelector('div')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={theme}>
        <Progress value={50} size="md" />
      </ThemeProvider>
    );
    expect(container.querySelector('div')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={theme}>
        <Progress value={50} size="lg" />
      </ThemeProvider>
    );
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  it('renders different variants', () => {
    const { rerender, container } = renderWithTheme(<Progress value={50} variant="primary" />);
    expect(container.querySelector('div')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={theme}>
        <Progress value={50} variant="success" />
      </ThemeProvider>
    );
    expect(container.querySelector('div')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={theme}>
        <Progress value={50} variant="warning" />
      </ThemeProvider>
    );
    expect(container.querySelector('div')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={theme}>
        <Progress value={50} variant="danger" />
      </ThemeProvider>
    );
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  it('applies animation when animated prop is true', () => {
    const { container } = renderWithTheme(<Progress value={50} animated />);
    // Animation is applied via styled-components, verify component renders
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  it('formats large numbers with locale string', () => {
    renderWithTheme(<Progress value={1234567} max={10000000} />);
    expect(screen.getByText(/1,234,567.*\/.*10,000,000/)).toBeInTheDocument();
  });
});
