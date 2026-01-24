import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { FormActions } from './FormActions';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('FormActions', () => {
  it('renders children correctly', () => {
    renderWithTheme(
      <FormActions>
        <button type="button">Cancel</button>
        <button type="submit">Save</button>
      </FormActions>
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('renders with different alignments', () => {
    const { container, rerender } = renderWithTheme(
      <FormActions align="start">
        <button>Action</button>
      </FormActions>
    );

    expect(container.firstChild).toBeInTheDocument();

    rerender(
      <ThemeProvider>
        <FormActions align="between">
          <button>Cancel</button>
          <button>Save</button>
        </FormActions>
      </ThemeProvider>
    );

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('renders without border when withBorder is false', () => {
    const { container } = renderWithTheme(
      <FormActions withBorder={false}>
        <button>Submit</button>
      </FormActions>
    );

    expect(container.firstChild).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = renderWithTheme(
      <FormActions className="custom-actions">
        <button>Submit</button>
      </FormActions>
    );

    expect(container.firstChild).toHaveClass('custom-actions');
  });
});
