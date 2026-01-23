import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { Stack } from './Stack';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('Stack', () => {
  it('renders children content', () => {
    renderWithTheme(
      <Stack>
        <div>Item 1</div>
        <div>Item 2</div>
        <div>Item 3</div>
      </Stack>
    );

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('applies column direction by default', () => {
    renderWithTheme(
      <Stack data-testid="stack">
        <div>Item</div>
      </Stack>
    );

    expect(screen.getByTestId('stack')).toHaveStyle('flex-direction: column');
  });

  it('applies row direction when specified', () => {
    renderWithTheme(
      <Stack data-testid="stack" direction="row">
        <div>Item</div>
      </Stack>
    );

    expect(screen.getByTestId('stack')).toHaveStyle('flex-direction: row');
  });

  it('applies different alignment values', () => {
    const { rerender } = renderWithTheme(
      <Stack data-testid="stack" align="center">
        <div>Item</div>
      </Stack>
    );

    expect(screen.getByTestId('stack')).toHaveStyle('align-items: center');

    rerender(
      <ThemeProvider>
        <Stack data-testid="stack" align="start">
          <div>Item</div>
        </Stack>
      </ThemeProvider>
    );

    expect(screen.getByTestId('stack')).toHaveStyle('align-items: flex-start');

    rerender(
      <ThemeProvider>
        <Stack data-testid="stack" align="end">
          <div>Item</div>
        </Stack>
      </ThemeProvider>
    );

    expect(screen.getByTestId('stack')).toHaveStyle('align-items: flex-end');
  });

  it('applies different justify values', () => {
    const { rerender } = renderWithTheme(
      <Stack data-testid="stack" justify="center">
        <div>Item</div>
      </Stack>
    );

    expect(screen.getByTestId('stack')).toHaveStyle('justify-content: center');

    rerender(
      <ThemeProvider>
        <Stack data-testid="stack" justify="between">
          <div>Item</div>
        </Stack>
      </ThemeProvider>
    );

    expect(screen.getByTestId('stack')).toHaveStyle('justify-content: space-between');

    rerender(
      <ThemeProvider>
        <Stack data-testid="stack" justify="around">
          <div>Item</div>
        </Stack>
      </ThemeProvider>
    );

    expect(screen.getByTestId('stack')).toHaveStyle('justify-content: space-around');
  });

  it('applies wrap when specified', () => {
    renderWithTheme(
      <Stack data-testid="stack" wrap>
        <div>Item</div>
      </Stack>
    );

    expect(screen.getByTestId('stack')).toHaveStyle('flex-wrap: wrap');
  });

  it('applies nowrap by default', () => {
    renderWithTheme(
      <Stack data-testid="stack">
        <div>Item</div>
      </Stack>
    );

    expect(screen.getByTestId('stack')).toHaveStyle('flex-wrap: nowrap');
  });

  it('forwards ref correctly', () => {
    const ref = { current: null } as React.RefObject<HTMLDivElement>;
    renderWithTheme(
      <Stack ref={ref}>
        <div>Item</div>
      </Stack>
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('applies className to the container', () => {
    renderWithTheme(
      <Stack data-testid="stack" className="custom-class">
        <div>Item</div>
      </Stack>
    );

    expect(screen.getByTestId('stack')).toHaveClass('custom-class');
  });
});
