import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { PageHeader } from './PageHeader';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('PageHeader', () => {
  it('renders title', () => {
    renderWithTheme(<PageHeader title="Dashboard" />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dashboard');
  });

  it('renders title with description', () => {
    renderWithTheme(
      <PageHeader title="Settings" description="Manage your account" />
    );

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Manage your account')).toBeInTheDocument();
  });

  it('renders without description when not provided', () => {
    renderWithTheme(<PageHeader title="Dashboard" />);

    expect(screen.queryByText(/manage/i)).not.toBeInTheDocument();
  });

  it('renders actions when provided', () => {
    renderWithTheme(
      <PageHeader
        title="Dashboard"
        actions={<button>Sync Now</button>}
      />
    );

    expect(screen.getByRole('button', { name: 'Sync Now' })).toBeInTheDocument();
  });

  it('renders multiple actions', () => {
    renderWithTheme(
      <PageHeader
        title="Dashboard"
        actions={
          <>
            <button>Settings</button>
            <button>Add</button>
          </>
        }
      />
    );

    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('has correct test id', () => {
    renderWithTheme(<PageHeader title="Test" />);

    expect(screen.getByTestId('page-header')).toBeInTheDocument();
  });
});
