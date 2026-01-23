import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { Badge } from './Badge';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('Badge', () => {
  it('renders label text', () => {
    renderWithTheme(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('renders dot when enabled', () => {
    renderWithTheme(<Badge dot data-testid="badge-with-dot">Live</Badge>);
    const badge = screen.getByTestId('badge-with-dot');
    // The badge should contain both the dot span and the text
    expect(badge.children.length).toBeGreaterThan(0);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });
});
