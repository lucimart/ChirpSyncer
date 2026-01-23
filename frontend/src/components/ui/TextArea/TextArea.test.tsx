import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/styles/ThemeContext';
import { TextArea } from './TextArea';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('TextArea', () => {
  it('renders with placeholder', () => {
    renderWithTheme(<TextArea placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    renderWithTheme(<TextArea label="Description" />);
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('displays error message when provided', () => {
    renderWithTheme(<TextArea error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('handles user input', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();

    renderWithTheme(<TextArea onChange={handleChange} placeholder="Type here" />);

    const textarea = screen.getByPlaceholderText('Type here');
    await user.type(textarea, 'Hello world');

    expect(handleChange).toHaveBeenCalled();
    expect(textarea).toHaveValue('Hello world');
  });

  it('respects disabled state', () => {
    renderWithTheme(<TextArea disabled placeholder="Disabled textarea" />);
    expect(screen.getByPlaceholderText('Disabled textarea')).toBeDisabled();
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    renderWithTheme(<TextArea ref={ref} placeholder="With ref" />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('applies fullWidth style', () => {
    const { container } = renderWithTheme(<TextArea fullWidth />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveStyle('width: 100%');
  });
});
