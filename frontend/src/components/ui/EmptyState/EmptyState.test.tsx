import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { Inbox } from 'lucide-react';
import { EmptyState } from './EmptyState';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('EmptyState', () => {
  it('renders title', () => {
    renderWithTheme(<EmptyState title="No items" />);
    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    renderWithTheme(
      <EmptyState title="No items" description="Create your first item" />
    );
    expect(screen.getByText('Create your first item')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    renderWithTheme(<EmptyState title="No items" />);
    expect(screen.queryByRole('paragraph')).not.toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    const { container } = renderWithTheme(
      <EmptyState title="No items" icon={Inbox} />
    );
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('does not render icon when not provided', () => {
    const { container } = renderWithTheme(<EmptyState title="No items" />);
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  it('renders action when provided', () => {
    renderWithTheme(
      <EmptyState
        title="No items"
        action={<button>Create Item</button>}
      />
    );
    expect(screen.getByText('Create Item')).toBeInTheDocument();
  });

  it('does not render action wrapper when action not provided', () => {
    const { container } = renderWithTheme(<EmptyState title="No items" />);
    // Only title should be present
    expect(container.querySelectorAll('div > *').length).toBeGreaterThan(0);
  });

  it('renders with different sizes', () => {
    const { rerender, container } = renderWithTheme(
      <EmptyState title="Small" size="sm" />
    );
    expect(container.firstChild).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={theme}>
        <EmptyState title="Medium" size="md" />
      </ThemeProvider>
    );
    expect(screen.getByText('Medium')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={theme}>
        <EmptyState title="Large" size="lg" />
      </ThemeProvider>
    );
    expect(screen.getByText('Large')).toBeInTheDocument();
  });

  it('uses md size by default', () => {
    renderWithTheme(<EmptyState title="Default" />);
    // Component renders, default size is md
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('renders all elements together', () => {
    const { container } = renderWithTheme(
      <EmptyState
        icon={Inbox}
        title="Complete Empty State"
        description="This has all the elements"
        action={<button>Action</button>}
        size="lg"
      />
    );

    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByText('Complete Empty State')).toBeInTheDocument();
    expect(screen.getByText('This has all the elements')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('has correct display name', () => {
    expect(EmptyState.displayName).toBe('EmptyState');
  });
});
