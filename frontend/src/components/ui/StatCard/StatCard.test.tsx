import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { Users } from 'lucide-react';
import { StatCard } from './StatCard';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('StatCard', () => {
  it('renders value and label', () => {
    renderWithTheme(<StatCard value={1234} label="Total Users" />);

    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('Total Users')).toBeInTheDocument();
  });

  it('formats numeric values with locale string', () => {
    renderWithTheme(<StatCard value={1000000} label="Large Number" />);

    expect(screen.getByText('1,000,000')).toBeInTheDocument();
  });

  it('renders string values as-is', () => {
    renderWithTheme(<StatCard value="Never" label="Last Sync" />);

    expect(screen.getByText('Never')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    const { container } = renderWithTheme(
      <StatCard value={100} label="Users" icon={Users} color="#6366F1" />
    );

    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('does not render icon in centered variant', () => {
    const { container } = renderWithTheme(
      <StatCard value={100} label="Users" icon={Users} variant="centered" />
    );

    // Icon is not rendered in centered variant
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  it('renders trend indicator when provided', () => {
    renderWithTheme(
      <StatCard value={100} label="Stats" trend={{ value: 12, direction: 'up' }} />
    );

    expect(screen.getByText('↑')).toBeInTheDocument();
    expect(screen.getByText(/12%/)).toBeInTheDocument();
  });

  it('renders down trend indicator', () => {
    renderWithTheme(
      <StatCard value={100} label="Stats" trend={{ value: 5, direction: 'down' }} />
    );

    expect(screen.getByText('↓')).toBeInTheDocument();
    expect(screen.getByText(/5%/)).toBeInTheDocument();
  });

  it('applies custom color to icon container', () => {
    const { container } = renderWithTheme(
      <StatCard value={100} label="Users" icon={Users} color="#ff0000" />
    );

    const iconContainer = container.querySelector('[class*="IconContainer"]');
    expect(iconContainer).toBeInTheDocument();
  });

  it('has correct test id', () => {
    renderWithTheme(<StatCard value={100} label="Test" />);

    expect(screen.getByTestId('stat-card')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = renderWithTheme(
      <StatCard value={100} label="Test" className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
