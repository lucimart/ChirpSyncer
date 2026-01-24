import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { SidebarLayout } from './SidebarLayout';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('SidebarLayout', () => {
  it('renders main content and sidebar', () => {
    renderWithTheme(
      <SidebarLayout sidebar={<div>Sidebar Content</div>}>
        <div>Main Content</div>
      </SidebarLayout>
    );

    expect(screen.getByText('Main Content')).toBeInTheDocument();
    expect(screen.getByText('Sidebar Content')).toBeInTheDocument();
  });

  it('renders sidebar on the right by default', () => {
    const { container } = renderWithTheme(
      <SidebarLayout sidebar={<div>Sidebar</div>}>
        <div>Main</div>
      </SidebarLayout>
    );

    const gridContainer = container.firstChild;
    // Main content should come before sidebar when position is right
    expect(gridContainer?.firstChild?.textContent).toBe('Main');
  });

  it('renders sidebar on the left when sidebarPosition is left', () => {
    const { container } = renderWithTheme(
      <SidebarLayout sidebar={<div>Sidebar</div>} sidebarPosition="left">
        <div>Main</div>
      </SidebarLayout>
    );

    const gridContainer = container.firstChild;
    // Sidebar should come before main content when position is left
    expect(gridContainer?.firstChild?.textContent).toBe('Sidebar');
  });

  it('forwards ref correctly', () => {
    const ref = { current: null } as React.RefObject<HTMLDivElement>;
    renderWithTheme(
      <SidebarLayout ref={ref} sidebar={<div>Sidebar</div>}>
        <div>Main</div>
      </SidebarLayout>
    );

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('applies className to the container', () => {
    const { container } = renderWithTheme(
      <SidebarLayout sidebar={<div>Sidebar</div>} className="custom-class">
        <div>Main</div>
      </SidebarLayout>
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders complex content in sidebar', () => {
    renderWithTheme(
      <SidebarLayout
        sidebar={
          <div>
            <h2>Navigation</h2>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </div>
        }
      >
        <div>Main Content</div>
      </SidebarLayout>
    );

    expect(screen.getByText('Navigation')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });
});
