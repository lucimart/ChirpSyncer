import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { MetaItem } from './MetaItem';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const MockIcon = () => <svg data-testid="mock-icon" />;

describe('MetaItem', () => {
  it('renders correctly', () => {
    renderWithTheme(<MetaItem>5 min ago</MetaItem>);
    expect(screen.getByText('5 min ago')).toBeInTheDocument();
  });

  it('renders as span element', () => {
    renderWithTheme(<MetaItem data-testid="meta-item">Content</MetaItem>);
    expect(screen.getByTestId('meta-item').tagName).toBe('SPAN');
  });

  it('renders children with icon', () => {
    renderWithTheme(
      <MetaItem>
        <MockIcon />
        <span>5 min ago</span>
      </MetaItem>
    );
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
    expect(screen.getByText('5 min ago')).toBeInTheDocument();
  });

  it('forwards ref', () => {
    const ref = { current: null };
    renderWithTheme(<MetaItem ref={ref}>Content</MetaItem>);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });

  it('applies custom className', () => {
    renderWithTheme(
      <MetaItem className="custom-class" data-testid="meta-item">
        Content
      </MetaItem>
    );
    expect(screen.getByTestId('meta-item')).toHaveClass('custom-class');
  });

  it('renders with inline variant by default', () => {
    renderWithTheme(<MetaItem data-testid="meta-item">Content</MetaItem>);
    expect(screen.getByTestId('meta-item')).toBeInTheDocument();
  });

  it('renders with text variant', () => {
    renderWithTheme(
      <MetaItem variant="text" data-testid="meta-item">
        Content
      </MetaItem>
    );
    expect(screen.getByTestId('meta-item')).toBeInTheDocument();
  });

  it('renders with xs size', () => {
    renderWithTheme(
      <MetaItem size="xs" data-testid="meta-item">
        Content
      </MetaItem>
    );
    expect(screen.getByTestId('meta-item')).toBeInTheDocument();
  });

  it('renders with sm size by default', () => {
    renderWithTheme(<MetaItem data-testid="meta-item">Content</MetaItem>);
    expect(screen.getByTestId('meta-item')).toBeInTheDocument();
  });

  it('renders with md size', () => {
    renderWithTheme(
      <MetaItem size="md" data-testid="meta-item">
        Content
      </MetaItem>
    );
    expect(screen.getByTestId('meta-item')).toBeInTheDocument();
  });

  it('renders with primary color', () => {
    renderWithTheme(
      <MetaItem color="primary" data-testid="meta-item">
        Content
      </MetaItem>
    );
    expect(screen.getByTestId('meta-item')).toBeInTheDocument();
  });

  it('renders with secondary color by default', () => {
    renderWithTheme(<MetaItem data-testid="meta-item">Content</MetaItem>);
    expect(screen.getByTestId('meta-item')).toBeInTheDocument();
  });

  it('renders with tertiary color', () => {
    renderWithTheme(
      <MetaItem color="tertiary" data-testid="meta-item">
        Content
      </MetaItem>
    );
    expect(screen.getByTestId('meta-item')).toBeInTheDocument();
  });
});
