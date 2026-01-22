import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { SettingRow } from './SettingRow';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('SettingRow', () => {
  it('renders label', () => {
    renderWithTheme(
      <SettingRow label="Email Notifications">
        <button>Toggle</button>
      </SettingRow>
    );

    expect(screen.getByText('Email Notifications')).toBeInTheDocument();
  });

  it('renders hint when provided', () => {
    renderWithTheme(
      <SettingRow label="Notifications" hint="Get updates about your account">
        <button>Toggle</button>
      </SettingRow>
    );

    expect(screen.getByText('Get updates about your account')).toBeInTheDocument();
  });

  it('does not render hint when not provided', () => {
    renderWithTheme(
      <SettingRow label="Notifications">
        <button>Toggle</button>
      </SettingRow>
    );

    expect(screen.queryByText(/updates/i)).not.toBeInTheDocument();
  });

  it('renders children', () => {
    renderWithTheme(
      <SettingRow label="Test">
        <button>Click me</button>
      </SettingRow>
    );

    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('renders complex children', () => {
    renderWithTheme(
      <SettingRow label="Test">
        <div>
          <span>Status:</span>
          <strong>Active</strong>
        </div>
      </SettingRow>
    );

    expect(screen.getByText('Status:')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('has correct test id', () => {
    renderWithTheme(
      <SettingRow label="Test">
        <button>Action</button>
      </SettingRow>
    );

    expect(screen.getByTestId('setting-row')).toBeInTheDocument();
  });

  it('applies noBorder prop', () => {
    const { container } = renderWithTheme(
      <SettingRow label="Test" noBorder>
        <button>Action</button>
      </SettingRow>
    );

    const row = container.firstChild;
    expect(row).toHaveStyle({ borderBottom: 'none' });
  });

  it('has border by default', () => {
    const { container } = renderWithTheme(
      <SettingRow label="Test">
        <button>Action</button>
      </SettingRow>
    );

    const row = container.firstChild;
    expect(row).not.toHaveStyle({ borderBottom: 'none' });
  });
});
