import type { ReactElement } from 'react';
import { render, screen, within } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { RolePermissions } from './RolePermissions';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('RolePermissions', () => {
  it('renders role permissions container', () => {
    renderWithTheme(<RolePermissions />);
    expect(screen.getByTestId('role-permissions')).toBeInTheDocument();
  });

  it('displays all three role columns', () => {
    renderWithTheme(<RolePermissions />);
    expect(screen.getByTestId('permissions-admin')).toBeInTheDocument();
    expect(screen.getByTestId('permissions-editor')).toBeInTheDocument();
    expect(screen.getByTestId('permissions-viewer')).toBeInTheDocument();
  });

  it('displays role headers', () => {
    renderWithTheme(<RolePermissions />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Editor')).toBeInTheDocument();
    expect(screen.getByText('Viewer')).toBeInTheDocument();
  });

  it('displays Permission column header', () => {
    renderWithTheme(<RolePermissions />);
    expect(screen.getByText('Permission')).toBeInTheDocument();
  });

  it('displays all permission labels', () => {
    renderWithTheme(<RolePermissions />);
    expect(screen.getByText('View Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Manage Credentials')).toBeInTheDocument();
    expect(screen.getByText('Trigger Sync')).toBeInTheDocument();
    expect(screen.getByText('View Cleanup Rules')).toBeInTheDocument();
    expect(screen.getByText('Edit Cleanup Rules')).toBeInTheDocument();
    expect(screen.getByText('Execute Cleanup')).toBeInTheDocument();
    expect(screen.getByText('View Analytics')).toBeInTheDocument();
    expect(screen.getByText('Export Data')).toBeInTheDocument();
    expect(screen.getByText('View Audit Log')).toBeInTheDocument();
    expect(screen.getByText('Manage Users')).toBeInTheDocument();
  });

  it('shows all permissions granted for admin', () => {
    renderWithTheme(<RolePermissions />);
    const adminColumn = screen.getByTestId('permissions-admin');
    const grantedIcons = within(adminColumn).getAllByTestId('permission-granted');
    expect(grantedIcons).toHaveLength(10);
  });

  it('shows some permissions denied for editor', () => {
    renderWithTheme(<RolePermissions />);
    const editorColumn = screen.getByTestId('permissions-editor');
    const deniedIcons = within(editorColumn).getAllByTestId('permission-denied');
    expect(deniedIcons.length).toBeGreaterThan(0);
  });

  it('shows most permissions denied for viewer', () => {
    renderWithTheme(<RolePermissions />);
    const viewerColumn = screen.getByTestId('permissions-viewer');
    const deniedIcons = within(viewerColumn).getAllByTestId('permission-denied');
    expect(deniedIcons.length).toBeGreaterThan(5);
  });

  it('grants View Dashboard to all roles', () => {
    renderWithTheme(<RolePermissions />);

    const adminColumn = screen.getByTestId('permissions-admin');
    const editorColumn = screen.getByTestId('permissions-editor');
    const viewerColumn = screen.getByTestId('permissions-viewer');

    expect(within(adminColumn).getAllByTestId('permission-granted').length).toBeGreaterThan(0);
    expect(within(editorColumn).getAllByTestId('permission-granted').length).toBeGreaterThan(0);
    expect(within(viewerColumn).getAllByTestId('permission-granted').length).toBeGreaterThan(0);
  });

  it('denies Manage Users to editor and viewer', () => {
    renderWithTheme(<RolePermissions />);

    const editorColumn = screen.getByTestId('permissions-editor');
    const viewerColumn = screen.getByTestId('permissions-viewer');

    const editorDenied = within(editorColumn).getAllByTestId('permission-denied');
    const viewerDenied = within(viewerColumn).getAllByTestId('permission-denied');

    expect(editorDenied.length).toBeGreaterThan(0);
    expect(viewerDenied.length).toBeGreaterThan(0);
  });

  it('has accessible permission indicators with aria-labels', () => {
    renderWithTheme(<RolePermissions />);

    const grantedIndicators = screen.getAllByTestId('permission-granted');
    const deniedIndicators = screen.getAllByTestId('permission-denied');

    grantedIndicators.forEach(indicator => {
      expect(indicator).toHaveAttribute('aria-label');
      expect(indicator.getAttribute('aria-label')).toContain('granted');
    });

    deniedIndicators.forEach(indicator => {
      expect(indicator).toHaveAttribute('aria-label');
      expect(indicator.getAttribute('aria-label')).toContain('denied');
    });
  });
});
