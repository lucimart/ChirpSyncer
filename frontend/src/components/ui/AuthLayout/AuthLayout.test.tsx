import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { AuthLayout } from './AuthLayout';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('AuthLayout', () => {
  it('renders children correctly', () => {
    renderWithTheme(
      <AuthLayout>
        <form>
          <input type="email" placeholder="Email" />
        </form>
      </AuthLayout>
    );

    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
  });

  it('displays logo and title by default', () => {
    renderWithTheme(<AuthLayout>Content</AuthLayout>);

    expect(screen.getByText('Swoop')).toBeInTheDocument();
  });

  it('displays custom title and subtitle', () => {
    renderWithTheme(
      <AuthLayout title="Welcome Back" subtitle="Sign in to continue">
        Content
      </AuthLayout>
    );

    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    expect(screen.getByText('Sign in to continue')).toBeInTheDocument();
  });

  it('hides logo when showLogo is false', () => {
    renderWithTheme(
      <AuthLayout showLogo={false}>Content</AuthLayout>
    );

    expect(screen.queryByText('Swoop')).not.toBeInTheDocument();
  });
});
