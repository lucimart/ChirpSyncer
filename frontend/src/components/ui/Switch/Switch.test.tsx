import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { Switch } from './Switch';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('Switch', () => {
  it('renders correctly', () => {
    renderWithTheme(<Switch data-testid="switch" aria-label="Test Switch" />);
    const switchElement = screen.getByRole('switch', { name: 'Test Switch' });
    expect(switchElement).toBeInTheDocument();
    expect(switchElement).toHaveAttribute('aria-checked', 'false');
  });

  it('handles toggle interaction', () => {
    const handleChange = jest.fn();
    renderWithTheme(<Switch onChange={handleChange} aria-label="Test Switch" />);

    const switchInput = screen.getByRole('switch', { name: 'Test Switch' });
    fireEvent.click(switchInput);

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(switchInput).toHaveAttribute('aria-checked', 'true');
  });

  it('respects disabled state', () => {
    renderWithTheme(<Switch disabled aria-label="Test Switch" />);

    const switchInput = screen.getByRole('switch', { name: 'Test Switch' });
    expect(switchInput).toBeDisabled();
  });

  it('renders as checked when prop provided', () => {
    renderWithTheme(<Switch checked readOnly aria-label="Test Switch" />);
    const switchInput = screen.getByRole('switch', { name: 'Test Switch' });
    expect(switchInput).toHaveAttribute('aria-checked', 'true');
  });

  it('renders with label', () => {
    renderWithTheme(<Switch label="Notification" />);
    expect(screen.getByText('Notification')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('renders different sizes', () => {
    renderWithTheme(<Switch size="sm" aria-label="Small" />);
    expect(screen.getByRole('switch', { name: 'Small' })).toBeInTheDocument();
  });
});
