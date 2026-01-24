import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { Avatar } from './Avatar';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('Avatar', () => {
  it('renders initials from single name', () => {
    renderWithTheme(<Avatar name="John" />);

    expect(screen.getByText('Jo')).toBeInTheDocument();
  });

  it('renders initials from full name', () => {
    renderWithTheme(<Avatar name="John Doe" />);

    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders question mark when no name provided', () => {
    renderWithTheme(<Avatar />);

    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('does not show initials when src is provided', () => {
    renderWithTheme(<Avatar name="John Doe" src="https://example.com/avatar.jpg" />);

    expect(screen.queryByText('JD')).not.toBeInTheDocument();
  });

  it('renders with title attribute', () => {
    renderWithTheme(<Avatar name="John Doe" />);

    expect(screen.getByTitle('John Doe')).toBeInTheDocument();
  });
});
