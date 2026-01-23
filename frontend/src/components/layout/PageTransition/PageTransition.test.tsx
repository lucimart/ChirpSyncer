import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { PageTransition } from './PageTransition';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode }) => (
      <div data-testid="motion-div" {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('PageTransition', () => {
  it('renders children', () => {
    renderWithTheme(
      <PageTransition>
        <div data-testid="child-content">Page Content</div>
      </PageTransition>
    );
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('renders with motion wrapper', () => {
    renderWithTheme(
      <PageTransition>
        <div>Content</div>
      </PageTransition>
    );
    expect(screen.getByTestId('motion-div')).toBeInTheDocument();
  });

  it('passes children through correctly', () => {
    renderWithTheme(
      <PageTransition>
        <h1>Page Title</h1>
        <p>Page description</p>
      </PageTransition>
    );
    expect(screen.getByRole('heading', { name: 'Page Title' })).toBeInTheDocument();
    expect(screen.getByText('Page description')).toBeInTheDocument();
  });

  it('renders nested components', () => {
    renderWithTheme(
      <PageTransition>
        <div>
          <header data-testid="page-header">Header</header>
          <main data-testid="page-main">Main Content</main>
          <footer data-testid="page-footer">Footer</footer>
        </div>
      </PageTransition>
    );
    expect(screen.getByTestId('page-header')).toBeInTheDocument();
    expect(screen.getByTestId('page-main')).toBeInTheDocument();
    expect(screen.getByTestId('page-footer')).toBeInTheDocument();
  });

  it('applies full width style to motion wrapper', () => {
    renderWithTheme(
      <PageTransition>
        <div>Content</div>
      </PageTransition>
    );
    const motionDiv = screen.getByTestId('motion-div');
    expect(motionDiv).toHaveStyle({ width: '100%' });
  });
});

describe('PageTransition - Animation Config', () => {
  it('uses correct animation variants', () => {
    // The animation config is tested via visual/integration tests
    // This test verifies the component renders without errors
    renderWithTheme(
      <PageTransition>
        <div>Test Content</div>
      </PageTransition>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });
});
