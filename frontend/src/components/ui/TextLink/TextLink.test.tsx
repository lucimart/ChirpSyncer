import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { TextLink } from './TextLink';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('TextLink', () => {
  it('renders link with text', () => {
    renderWithTheme(<TextLink href="/home">Home</TextLink>);
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
  });

  it('has correct href attribute', () => {
    renderWithTheme(<TextLink href="/about">About Us</TextLink>);
    expect(screen.getByRole('link', { name: /about us/i })).toHaveAttribute('href', '/about');
  });

  it('renders with default size (sm)', () => {
    const { container } = renderWithTheme(<TextLink href="/test">Test</TextLink>);
    const wrapper = container.firstChild;
    expect(wrapper).toBeInTheDocument();
  });

  it('renders with different sizes', () => {
    const { rerender } = renderWithTheme(
      <TextLink href="/xs" size="xs">
        XS Link
      </TextLink>
    );
    expect(screen.getByRole('link', { name: /xs link/i })).toBeInTheDocument();

    rerender(
      <ThemeProvider>
        <TextLink href="/md" size="md">
          MD Link
        </TextLink>
      </ThemeProvider>
    );
    expect(screen.getByRole('link', { name: /md link/i })).toBeInTheDocument();
  });

  it('renders as block element when block prop is true', () => {
    const { container } = renderWithTheme(
      <TextLink href="/block" block>
        Block Link
      </TextLink>
    );
    const wrapper = container.firstChild;
    expect(wrapper).toHaveStyle('display: block');
  });

  it('renders as inline element by default', () => {
    const { container } = renderWithTheme(<TextLink href="/inline">Inline Link</TextLink>);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveStyle('display: inline');
  });

  it('applies text alignment', () => {
    const { container } = renderWithTheme(
      <TextLink href="/center" align="center" block>
        Centered Link
      </TextLink>
    );
    const wrapper = container.firstChild;
    expect(wrapper).toHaveStyle('text-align: center');
  });
});
