import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/styles/ThemeContext';
import { Select } from './Select';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const options = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
];

describe('Select', () => {
  it('renders the select with options', () => {
    renderWithTheme(<Select options={options} />);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('renders a label when provided', () => {
    renderWithTheme(<Select options={options} label="Choose option" />);

    expect(screen.getByLabelText(/choose option/i)).toBeInTheDocument();
  });

  it('renders error message when provided', () => {
    renderWithTheme(<Select options={options} error="This field is required" />);

    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('renders hint message when provided', () => {
    renderWithTheme(<Select options={options} hint="Select one of the options" />);

    expect(screen.getByText('Select one of the options')).toBeInTheDocument();
  });

  it('does not show hint when error is present', () => {
    renderWithTheme(
      <Select
        options={options}
        hint="Select one of the options"
        error="This field is required"
      />
    );

    expect(screen.queryByText('Select one of the options')).not.toBeInTheDocument();
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('calls onChange when selecting an option', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();

    renderWithTheme(<Select options={options} onChange={handleChange} />);

    await user.selectOptions(screen.getByRole('combobox'), 'option2');
    expect(handleChange).toHaveBeenCalled();
  });

  it('can be disabled', () => {
    renderWithTheme(<Select options={options} disabled />);

    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('applies fullWidth style', () => {
    const { container } = renderWithTheme(<Select options={options} fullWidth />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveStyle('width: 100%');
  });
});
