import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { PlatformIcon } from './PlatformIcon';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('PlatformIcon', () => {
  it('renders icon character', () => {
    renderWithTheme(<PlatformIcon icon="T" color="#1DA1F2" />);

    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('renders with default medium size', () => {
    const { container } = renderWithTheme(
      <PlatformIcon icon="B" color="#0085FF" />
    );

    const icon = container.firstChild;
    expect(icon).toHaveStyle({ width: '48px', height: '48px' });
  });

  it('renders small size', () => {
    const { container } = renderWithTheme(
      <PlatformIcon icon="B" color="#0085FF" size="sm" />
    );

    const icon = container.firstChild;
    expect(icon).toHaveStyle({ width: '32px', height: '32px' });
  });

  it('renders large size', () => {
    const { container } = renderWithTheme(
      <PlatformIcon icon="B" color="#0085FF" size="lg" />
    );

    const icon = container.firstChild;
    expect(icon).toHaveStyle({ width: '64px', height: '64px' });
  });

  it('applies custom color as background', () => {
    const { container } = renderWithTheme(
      <PlatformIcon icon="T" color="#ff0000" />
    );

    const icon = container.firstChild;
    expect(icon).toHaveStyle({ backgroundColor: '#ff0000' });
  });

  it('has white text color', () => {
    const { container } = renderWithTheme(
      <PlatformIcon icon="T" color="#1DA1F2" />
    );

    const icon = container.firstChild;
    expect(icon).toHaveStyle({ color: 'white' });
  });

  it('has correct test id', () => {
    renderWithTheme(<PlatformIcon icon="T" color="#1DA1F2" />);

    expect(screen.getByTestId('platform-icon')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = renderWithTheme(
      <PlatformIcon icon="T" color="#1DA1F2" className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
