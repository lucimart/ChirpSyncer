import { render, screen, fireEvent } from '@testing-library/react';
// describe, it, expect are global in Jest
import { Switch } from './Switch';

describe('Switch', () => {
  it('renders correctly', () => {
    render(<Switch data-testid="switch" aria-label="Test Switch" />);
    const switchElement = screen.getByTestId('switch');
    expect(switchElement).toBeInTheDocument();
    expect(switchElement).not.toBeChecked();
  });

  it('handles toggle interaction', () => {
    const handleChange = jest.fn();
    render(<Switch onChange={handleChange} aria-label="Test Switch" />);

    const switchInput = screen.getByLabelText('Test Switch');
    fireEvent.click(switchInput);

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(switchInput).toBeChecked();
  });

  it('respects disabled state', () => {
    const handleChange = jest.fn();
    render(<Switch disabled onChange={handleChange} aria-label="Test Switch" />);

    const switchInput = screen.getByLabelText('Test Switch');
    fireEvent.click(switchInput);

    expect(handleChange).not.toHaveBeenCalled();
    expect(switchInput).toBeDisabled();
  });

  it('renders as checked when prop provided', () => {
    render(<Switch checked readOnly aria-label="Test Switch" />);
    const switchInput = screen.getByLabelText('Test Switch');
    expect(switchInput).toBeChecked();
  });

  it('renders with label', () => {
    render(<Switch label="Notification" />);
    expect(screen.getByText('Notification')).toBeInTheDocument();
  });

  it('renders different sizes', () => {
    render(<Switch size="sm" aria-label="Small" />);
    expect(screen.getByLabelText('Small')).toBeInTheDocument();
  });
});
