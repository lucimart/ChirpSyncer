import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/styles/ThemeContext';
import { Button } from './Button';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('Button', () => {
  it('renders the label', () => {
    renderWithTheme(<Button>Submit</Button>);
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
  });

  it('fires onClick when enabled', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();

    renderWithTheme(<Button onClick={handleClick}>Save</Button>);

    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables the button while loading', () => {
    renderWithTheme(<Button isLoading>Saving</Button>);
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  });

  it('respects the disabled prop', () => {
    renderWithTheme(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button', { name: /disabled/i })).toBeDisabled();
  });
});
