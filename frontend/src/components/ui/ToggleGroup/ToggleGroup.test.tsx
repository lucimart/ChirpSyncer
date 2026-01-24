import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/styles/ThemeContext';
import { ToggleGroup } from './ToggleGroup';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const defaultOptions = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

describe('ToggleGroup', () => {
  it('renders all options', () => {
    renderWithTheme(<ToggleGroup options={defaultOptions} value="day" onChange={() => {}} />);

    expect(screen.getByRole('radio', { name: /day/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /week/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /month/i })).toBeInTheDocument();
  });

  it('calls onChange when option is clicked', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();

    renderWithTheme(<ToggleGroup options={defaultOptions} value="day" onChange={handleChange} />);

    await user.click(screen.getByRole('radio', { name: /week/i }));
    expect(handleChange).toHaveBeenCalledWith('week');
  });

  it('highlights the selected option', () => {
    renderWithTheme(<ToggleGroup options={defaultOptions} value="week" onChange={() => {}} />);

    const weekButton = screen.getByRole('radio', { name: /week/i });
    const dayButton = screen.getByRole('radio', { name: /day/i });

    // Active option should have aria-checked="true"
    expect(weekButton).toHaveAttribute('aria-checked', 'true');
    expect(dayButton).toHaveAttribute('aria-checked', 'false');
  });

  it('renders with icons', () => {
    const optionsWithIcons = [
      { value: 'list', label: 'List', icon: <span data-testid="list-icon">L</span> },
      { value: 'grid', label: 'Grid', icon: <span data-testid="grid-icon">G</span> },
    ];

    renderWithTheme(<ToggleGroup options={optionsWithIcons} value="list" onChange={() => {}} />);

    expect(screen.getByTestId('list-icon')).toBeInTheDocument();
    expect(screen.getByTestId('grid-icon')).toBeInTheDocument();
  });

  it('supports small size variant', () => {
    renderWithTheme(<ToggleGroup options={defaultOptions} value="day" onChange={() => {}} size="sm" />);

    expect(screen.getByRole('radio', { name: /day/i })).toBeInTheDocument();
  });

  it('supports pill variant', () => {
    renderWithTheme(
      <ToggleGroup options={defaultOptions} value="day" onChange={() => {}} variant="pill" />
    );

    expect(screen.getByRole('radio', { name: /day/i })).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = renderWithTheme(
      <ToggleGroup
        options={defaultOptions}
        value="day"
        onChange={() => {}}
        className="custom-class"
      />
    );

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('handles multiple clicks correctly', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();

    renderWithTheme(<ToggleGroup options={defaultOptions} value="day" onChange={handleChange} />);

    await user.click(screen.getByRole('radio', { name: /week/i }));
    await user.click(screen.getByRole('radio', { name: /month/i }));

    expect(handleChange).toHaveBeenCalledTimes(2);
    expect(handleChange).toHaveBeenNthCalledWith(1, 'week');
    expect(handleChange).toHaveBeenNthCalledWith(2, 'month');
  });
});
