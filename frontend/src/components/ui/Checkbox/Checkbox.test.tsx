import type { ReactElement } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { Checkbox } from './Checkbox';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const noop = () => {};

describe('Checkbox', () => {
  it('renders without label', () => {
    renderWithTheme(<Checkbox aria-label="Accept" onChange={noop} />);

    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('renders with label', () => {
    renderWithTheme(<Checkbox label="Accept terms and conditions" onChange={noop} />);

    expect(screen.getByText('Accept terms and conditions')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('renders with description', () => {
    renderWithTheme(
      <Checkbox
        label="Subscribe"
        description="Receive weekly newsletter updates"
        onChange={noop}
      />
    );

    expect(screen.getByText('Subscribe')).toBeInTheDocument();
    expect(screen.getByText('Receive weekly newsletter updates')).toBeInTheDocument();
  });

  it('handles checked state', () => {
    const handleChange = jest.fn();
    renderWithTheme(
      <Checkbox label="Option" checked={false} onChange={handleChange} />
    );

    fireEvent.click(screen.getByRole('checkbox'));
    expect(handleChange).toHaveBeenCalled();
  });

  it('displays error message', () => {
    renderWithTheme(
      <Checkbox
        label="Required field"
        error
        errorMessage="This field is required"
        onChange={noop}
      />
    );

    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    renderWithTheme(<Checkbox label="Disabled" disabled onChange={noop} />);

    expect(screen.getByRole('checkbox')).toBeDisabled();
  });
});
