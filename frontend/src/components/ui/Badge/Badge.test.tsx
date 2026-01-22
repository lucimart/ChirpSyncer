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
    renderWithTheme(<Badge dot>Live</Badge>);
    expect(screen.getByText('Live').previousSibling).toBeTruthy();
  });
});
