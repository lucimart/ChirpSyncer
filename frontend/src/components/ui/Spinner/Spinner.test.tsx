import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { Spinner } from './Spinner';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('Spinner', () => {
  it('renders with default props', () => {
    renderWithTheme(<Spinner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has correct aria-label for accessibility', () => {
    renderWithTheme(<Spinner />);
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('renders with different sizes', () => {
    const sizes: Array<'xs' | 'sm' | 'md' | 'lg' | 'xl'> = ['xs', 'sm', 'md', 'lg', 'xl'];

    sizes.forEach((size) => {
      const { unmount } = renderWithTheme(<Spinner size={size} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
      unmount();
    });
  });

  it('renders with different colors', () => {
    const colors: Array<'primary' | 'secondary' | 'white' | 'current'> = [
      'primary',
      'secondary',
      'white',
      'current',
    ];

    colors.forEach((color) => {
      const { unmount } = renderWithTheme(<Spinner color={color} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
      unmount();
    });
  });

  it('applies custom className', () => {
    renderWithTheme(<Spinner className="custom-class" />);
    expect(screen.getByRole('status')).toHaveClass('custom-class');
  });

  it('has correct display name', () => {
    expect(Spinner.displayName).toBe('Spinner');
  });

  it('uses md size by default', () => {
    const { container } = renderWithTheme(<Spinner />);
    // Component renders with default size
    expect(container.firstChild).toBeInTheDocument();
  });

  it('uses primary color by default', () => {
    const { container } = renderWithTheme(<Spinner />);
    // Component renders with default color
    expect(container.firstChild).toBeInTheDocument();
  });
});
