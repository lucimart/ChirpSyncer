import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { IconBadge } from './IconBadge';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const MockIcon = () => <svg data-testid="mock-icon" />;

describe('IconBadge', () => {
  it('renders correctly', () => {
    renderWithTheme(
      <IconBadge>
        <MockIcon />
      </IconBadge>
    );
    expect(screen.getByTestId('icon-badge')).toBeInTheDocument();
  });

  it('renders children', () => {
    renderWithTheme(
      <IconBadge>
        <MockIcon />
      </IconBadge>
    );
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    renderWithTheme(
      <IconBadge className="custom-class">
        <MockIcon />
      </IconBadge>
    );
    expect(screen.getByTestId('icon-badge')).toHaveClass('custom-class');
  });

  it('renders with primary variant by default', () => {
    renderWithTheme(
      <IconBadge>
        <MockIcon />
      </IconBadge>
    );
    expect(screen.getByTestId('icon-badge')).toBeInTheDocument();
  });

  it('renders with success variant', () => {
    renderWithTheme(
      <IconBadge variant="success">
        <MockIcon />
      </IconBadge>
    );
    expect(screen.getByTestId('icon-badge')).toBeInTheDocument();
  });

  it('renders with warning variant', () => {
    renderWithTheme(
      <IconBadge variant="warning">
        <MockIcon />
      </IconBadge>
    );
    expect(screen.getByTestId('icon-badge')).toBeInTheDocument();
  });

  it('renders with danger variant', () => {
    renderWithTheme(
      <IconBadge variant="danger">
        <MockIcon />
      </IconBadge>
    );
    expect(screen.getByTestId('icon-badge')).toBeInTheDocument();
  });

  it('renders with neutral variant', () => {
    renderWithTheme(
      <IconBadge variant="neutral">
        <MockIcon />
      </IconBadge>
    );
    expect(screen.getByTestId('icon-badge')).toBeInTheDocument();
  });

  it('renders with custom color', () => {
    renderWithTheme(
      <IconBadge color="#ff5500">
        <MockIcon />
      </IconBadge>
    );
    expect(screen.getByTestId('icon-badge')).toBeInTheDocument();
  });

  it('renders with sm size', () => {
    renderWithTheme(
      <IconBadge size="sm">
        <MockIcon />
      </IconBadge>
    );
    expect(screen.getByTestId('icon-badge')).toBeInTheDocument();
  });

  it('renders with md size by default', () => {
    renderWithTheme(
      <IconBadge>
        <MockIcon />
      </IconBadge>
    );
    expect(screen.getByTestId('icon-badge')).toBeInTheDocument();
  });

  it('renders with lg size', () => {
    renderWithTheme(
      <IconBadge size="lg">
        <MockIcon />
      </IconBadge>
    );
    expect(screen.getByTestId('icon-badge')).toBeInTheDocument();
  });
});
