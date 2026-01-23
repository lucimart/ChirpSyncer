import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { AuthFooter } from './AuthFooter';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('AuthFooter', () => {
  it('renders children correctly', () => {
    renderWithTheme(
      <AuthFooter>
        Already have an account? <a href="/login">Sign in</a>
      </AuthFooter>
    );

    expect(screen.getByText(/Already have an account\?/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('renders with data-testid', () => {
    renderWithTheme(<AuthFooter>Footer content</AuthFooter>);

    expect(screen.getByTestId('auth-footer')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    renderWithTheme(<AuthFooter className="custom-footer">Content</AuthFooter>);

    expect(screen.getByTestId('auth-footer')).toHaveClass('custom-footer');
  });
});
