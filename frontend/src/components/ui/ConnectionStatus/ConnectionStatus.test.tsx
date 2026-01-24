import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { ConnectionStatus } from './ConnectionStatus';

// Mock the RealtimeProvider hook
const mockUseRealtime = jest.fn();
jest.mock('@/providers/RealtimeProvider', () => ({
  useRealtime: () => mockUseRealtime(),
  ConnectionStatus: 'connected' as const,
}));

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('ConnectionStatus', () => {
  beforeEach(() => {
    mockUseRealtime.mockReturnValue({ status: 'connected' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders with connected status', () => {
    mockUseRealtime.mockReturnValue({ status: 'connected' });
    renderWithTheme(<ConnectionStatus />);

    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('renders with connecting status', () => {
    mockUseRealtime.mockReturnValue({ status: 'connecting' });
    renderWithTheme(<ConnectionStatus />);

    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('renders with error status', () => {
    mockUseRealtime.mockReturnValue({ status: 'error' });
    renderWithTheme(<ConnectionStatus />);

    expect(screen.getByText('Connection error')).toBeInTheDocument();
  });

  it('renders with disconnected status', () => {
    mockUseRealtime.mockReturnValue({ status: 'disconnected' });
    renderWithTheme(<ConnectionStatus />);

    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('hides text when showText is false', () => {
    mockUseRealtime.mockReturnValue({ status: 'connected' });
    renderWithTheme(<ConnectionStatus showText={false} />);

    expect(screen.queryByText('Connected')).not.toBeInTheDocument();
  });

  it('shows icon when showIcon is true', () => {
    mockUseRealtime.mockReturnValue({ status: 'connected' });
    const { container } = renderWithTheme(<ConnectionStatus showIcon />);

    // Wifi icon should be present for connected state
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('shows dot by default instead of icon', () => {
    mockUseRealtime.mockReturnValue({ status: 'connected' });
    const { container } = renderWithTheme(<ConnectionStatus showIcon={false} />);

    // No SVG icon when showIcon is false
    expect(container.querySelector('svg')).not.toBeInTheDocument();
  });

  it('shows WifiOff icon when not connected', () => {
    mockUseRealtime.mockReturnValue({ status: 'disconnected' });
    const { container } = renderWithTheme(<ConnectionStatus showIcon />);

    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders dot only mode', () => {
    mockUseRealtime.mockReturnValue({ status: 'connected' });
    const { container } = renderWithTheme(
      <ConnectionStatus showText={false} showIcon={false} />
    );

    // Should have container but no text
    expect(container.firstChild).toBeInTheDocument();
    expect(screen.queryByText('Connected')).not.toBeInTheDocument();
  });

  it('renders icon only mode', () => {
    mockUseRealtime.mockReturnValue({ status: 'connected' });
    const { container } = renderWithTheme(
      <ConnectionStatus showText={false} showIcon />
    );

    // Should have icon but no text
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(screen.queryByText('Connected')).not.toBeInTheDocument();
  });
});
