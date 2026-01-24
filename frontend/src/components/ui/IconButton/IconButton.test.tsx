import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/styles/ThemeContext';
import { IconButton } from './IconButton';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const MockIcon = () => <svg data-testid="mock-icon" />;

describe('IconButton', () => {
  it('renders correctly', () => {
    renderWithTheme(
      <IconButton aria-label="Settings">
        <MockIcon />
      </IconButton>
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders children', () => {
    renderWithTheme(
      <IconButton aria-label="Settings">
        <MockIcon />
      </IconButton>
    );
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
  });

  it('has accessible label', () => {
    renderWithTheme(
      <IconButton aria-label="Settings">
        <MockIcon />
      </IconButton>
    );
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();

    renderWithTheme(
      <IconButton aria-label="Click me" onClick={handleClick}>
        <MockIcon />
      </IconButton>
    );

    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();

    renderWithTheme(
      <IconButton aria-label="Disabled" disabled onClick={handleClick}>
        <MockIcon />
      </IconButton>
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    await user.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('forwards ref', () => {
    const ref = { current: null };
    renderWithTheme(
      <IconButton ref={ref} aria-label="Ref test">
        <MockIcon />
      </IconButton>
    );
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('renders with ghost variant by default', () => {
    renderWithTheme(
      <IconButton aria-label="Ghost">
        <MockIcon />
      </IconButton>
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders with soft variant', () => {
    renderWithTheme(
      <IconButton variant="soft" aria-label="Soft">
        <MockIcon />
      </IconButton>
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders with outline variant', () => {
    renderWithTheme(
      <IconButton variant="outline" aria-label="Outline">
        <MockIcon />
      </IconButton>
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders with sm size', () => {
    renderWithTheme(
      <IconButton size="sm" aria-label="Small">
        <MockIcon />
      </IconButton>
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders with md size by default', () => {
    renderWithTheme(
      <IconButton aria-label="Medium">
        <MockIcon />
      </IconButton>
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders with lg size', () => {
    renderWithTheme(
      <IconButton size="lg" aria-label="Large">
        <MockIcon />
      </IconButton>
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    renderWithTheme(
      <IconButton aria-label="Custom" className="custom-class">
        <MockIcon />
      </IconButton>
    );
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });
});
