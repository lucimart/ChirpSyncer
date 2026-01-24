import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { Settings } from 'lucide-react';
import { CollapsibleMenu } from './CollapsibleMenu';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('CollapsibleMenu', () => {
  it('renders with label', () => {
    renderWithTheme(
      <CollapsibleMenu label="Test Menu">
        <div>Content</div>
      </CollapsibleMenu>
    );

    expect(screen.getByText('Test Menu')).toBeInTheDocument();
  });

  it('starts collapsed by default', () => {
    renderWithTheme(
      <CollapsibleMenu label="Test Menu">
        <div>Hidden Content</div>
      </CollapsibleMenu>
    );

    expect(screen.queryByText('Hidden Content')).not.toBeVisible();
  });

  it('starts open when defaultOpen is true', () => {
    renderWithTheme(
      <CollapsibleMenu label="Test Menu" defaultOpen>
        <div>Visible Content</div>
      </CollapsibleMenu>
    );

    expect(screen.getByText('Visible Content')).toBeVisible();
  });

  it('toggles content visibility on click', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <CollapsibleMenu label="Test Menu">
        <div>Toggle Content</div>
      </CollapsibleMenu>
    );

    const header = screen.getByRole('button');
    expect(screen.queryByText('Toggle Content')).not.toBeVisible();

    await user.click(header);
    expect(screen.getByText('Toggle Content')).toBeVisible();

    await user.click(header);
    expect(screen.queryByText('Toggle Content')).not.toBeVisible();
  });

  it('renders icon when provided', () => {
    const { container } = renderWithTheme(
      <CollapsibleMenu label="Settings" icon={Settings}>
        <div>Content</div>
      </CollapsibleMenu>
    );

    // Should have two SVGs: icon and chevron
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(2);
  });

  it('does not render icon when not provided', () => {
    const { container } = renderWithTheme(
      <CollapsibleMenu label="No Icon">
        <div>Content</div>
      </CollapsibleMenu>
    );

    // Should only have chevron SVG
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(1);
  });

  it('renders badge when provided', () => {
    renderWithTheme(
      <CollapsibleMenu label="Notifications" badge={5}>
        <div>Content</div>
      </CollapsibleMenu>
    );

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('does not render badge when zero', () => {
    renderWithTheme(
      <CollapsibleMenu label="Empty" badge={0}>
        <div>Content</div>
      </CollapsibleMenu>
    );

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('does not render badge when undefined', () => {
    const { container } = renderWithTheme(
      <CollapsibleMenu label="No Badge">
        <div>Content</div>
      </CollapsibleMenu>
    );

    // Badge element should not exist
    const badge = container.querySelector('[class*="BadgeCount"]');
    expect(badge).not.toBeInTheDocument();
  });

  it('has correct aria-expanded attribute', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <CollapsibleMenu label="Test Menu">
        <div>Content</div>
      </CollapsibleMenu>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-expanded', 'false');

    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders children correctly', () => {
    renderWithTheme(
      <CollapsibleMenu label="Parent" defaultOpen>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
        <div data-testid="child-3">Child 3</div>
      </CollapsibleMenu>
    );

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
    expect(screen.getByTestId('child-3')).toBeInTheDocument();
  });

  it('has correct display name', () => {
    expect(CollapsibleMenu.displayName).toBe('CollapsibleMenu');
  });
});
