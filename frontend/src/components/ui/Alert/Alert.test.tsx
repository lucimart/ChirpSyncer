import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { Alert } from './Alert';

const renderWithTheme = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('Alert', () => {
  it('renders content', () => {
    renderWithTheme(<Alert variant="error">Message</Alert>);
    expect(screen.getByText('Message')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    renderWithTheme(
      <Alert variant="info" title="Notice">
        Details
      </Alert>
    );
    expect(screen.getByText('Notice')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    renderWithTheme(
      <Alert variant="success" icon={<span data-testid="icon" />}>
        Done
      </Alert>
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('sets data-variant attribute', () => {
    renderWithTheme(<Alert variant="warning">Warn</Alert>);
    expect(screen.getByRole('alert')).toHaveAttribute('data-variant', 'warning');
  });
});
