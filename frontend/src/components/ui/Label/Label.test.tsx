import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { Label } from './Label';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('Label', () => {
  it('renders correctly', () => {
    renderWithTheme(<Label>Email</Label>);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders as label element', () => {
    renderWithTheme(<Label>Email</Label>);
    expect(screen.getByText('Email').tagName).toBe('LABEL');
  });

  it('applies htmlFor attribute', () => {
    renderWithTheme(<Label htmlFor="email-input">Email</Label>);
    expect(screen.getByText('Email')).toHaveAttribute('for', 'email-input');
  });

  it('forwards ref', () => {
    const ref = { current: null };
    renderWithTheme(<Label ref={ref}>Email</Label>);
    expect(ref.current).toBeInstanceOf(HTMLLabelElement);
  });

  it('applies custom className', () => {
    renderWithTheme(<Label className="custom-class">Email</Label>);
    expect(screen.getByText('Email')).toHaveClass('custom-class');
  });

  it('renders with sm spacing by default', () => {
    renderWithTheme(<Label>Email</Label>);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders with none spacing', () => {
    renderWithTheme(<Label spacing="none">Email</Label>);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders with md spacing', () => {
    renderWithTheme(<Label spacing="md">Email</Label>);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders children content', () => {
    renderWithTheme(
      <Label>
        Username <span>*</span>
      </Label>
    );
    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
  });
});
