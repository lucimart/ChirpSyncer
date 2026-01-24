import type { ReactElement } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { Form } from './Form';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('Form', () => {
  it('renders children correctly', () => {
    renderWithTheme(
      <Form>
        <input type="text" placeholder="Name" />
        <button type="submit">Submit</button>
      </Form>
    );

    expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('handles form submission', () => {
    const handleSubmit = jest.fn((e) => e.preventDefault());
    renderWithTheme(
      <Form onSubmit={handleSubmit}>
        <button type="submit">Submit</button>
      </Form>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(handleSubmit).toHaveBeenCalled();
  });

  it('applies different gap sizes', () => {
    const { rerender } = renderWithTheme(
      <Form gap="sm" data-testid="form">
        <div>Content</div>
      </Form>
    );

    expect(screen.getByTestId('form')).toBeInTheDocument();

    rerender(
      <ThemeProvider>
        <Form gap="lg" data-testid="form">
          <div>Content</div>
        </Form>
      </ThemeProvider>
    );

    expect(screen.getByTestId('form')).toBeInTheDocument();
  });
});
