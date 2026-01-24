import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/styles/ThemeContext';
import { Input } from './Input';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('Input', () => {
  it('renders label and associates with input', () => {
    renderWithTheme(<Input label="Email" />);
    const input = screen.getByLabelText('Email');
    expect(input).toBeInTheDocument();
  });

  it('renders hint when provided', () => {
    renderWithTheme(<Input label="Email" hint="Helpful hint" />);
    expect(screen.getByText('Helpful hint')).toBeInTheDocument();
  });

  it('renders error when provided', () => {
    renderWithTheme(<Input label="Email" error="Invalid email" />);
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
  });

  it('updates value when typing', async () => {
    const user = userEvent.setup();
    renderWithTheme(<Input label="Username" />);
    const input = screen.getByLabelText('Username');
    await user.type(input, 'sisyphus');
    expect(input).toHaveValue('sisyphus');
  });
});
