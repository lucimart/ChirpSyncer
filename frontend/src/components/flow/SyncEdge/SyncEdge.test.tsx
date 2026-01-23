import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/styles/ThemeContext';
import { SyncEdge } from './SyncEdge';
import type { SyncConnection } from '../types';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const mockActiveConnection: SyncConnection = {
  id: 'conn-1',
  sourceId: 'twitter-1',
  targetId: 'bluesky-1',
  status: 'active',
  direction: 'bidirectional',
  syncCount: 42,
  lastSync: new Date().toISOString(),
};

const mockPausedConnection: SyncConnection = {
  id: 'conn-2',
  sourceId: 'twitter-1',
  targetId: 'bluesky-1',
  status: 'paused',
  direction: 'unidirectional',
  syncCount: 25,
  lastSync: new Date().toISOString(),
};

const mockErrorConnection: SyncConnection = {
  id: 'conn-3',
  sourceId: 'twitter-1',
  targetId: 'bluesky-1',
  status: 'error',
  direction: 'bidirectional',
  syncCount: 10,
};

describe('SyncEdge', () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the edge container', () => {
    renderWithTheme(
      <SyncEdge
        connection={mockActiveConnection}
        onClick={mockOnClick}
        isHovered={false}
      />
    );
    expect(screen.getByTestId('sync-edge-conn-1')).toBeInTheDocument();
  });

  it('displays the status badge', () => {
    renderWithTheme(
      <SyncEdge
        connection={mockActiveConnection}
        onClick={mockOnClick}
        isHovered={false}
      />
    );
    expect(screen.getByText('active')).toBeInTheDocument();
  });

  it('displays sync count when available', () => {
    renderWithTheme(
      <SyncEdge
        connection={mockActiveConnection}
        onClick={mockOnClick}
        isHovered={false}
      />
    );
    expect(screen.getByText('42 synced')).toBeInTheDocument();
  });

  it('displays last sync time when available', () => {
    renderWithTheme(
      <SyncEdge
        connection={mockActiveConnection}
        onClick={mockOnClick}
        isHovered={false}
      />
    );
    expect(screen.getByTestId('edge-last-sync')).toBeInTheDocument();
  });

  it('hides last sync time when not available', () => {
    renderWithTheme(
      <SyncEdge
        connection={mockErrorConnection}
        onClick={mockOnClick}
        isHovered={false}
      />
    );
    expect(screen.queryByTestId('edge-last-sync')).not.toBeInTheDocument();
  });

  it('renders direction indicator', () => {
    renderWithTheme(
      <SyncEdge
        connection={mockActiveConnection}
        onClick={mockOnClick}
        isHovered={false}
      />
    );
    expect(screen.getByTestId('direction-indicator')).toBeInTheDocument();
  });

  it('shows bidirectional direction', () => {
    renderWithTheme(
      <SyncEdge
        connection={mockActiveConnection}
        onClick={mockOnClick}
        isHovered={false}
      />
    );
    expect(screen.getByTestId('direction-indicator')).toHaveAttribute('data-direction', 'bidirectional');
  });

  it('shows unidirectional direction', () => {
    renderWithTheme(
      <SyncEdge
        connection={mockPausedConnection}
        onClick={mockOnClick}
        isHovered={false}
      />
    );
    expect(screen.getByTestId('direction-indicator')).toHaveAttribute('data-direction', 'unidirectional');
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <SyncEdge
        connection={mockActiveConnection}
        onClick={mockOnClick}
        isHovered={false}
      />
    );

    await user.click(screen.getByTestId('sync-edge-conn-1'));
    expect(mockOnClick).toHaveBeenCalledWith(mockActiveConnection);
  });

  it('applies hovered state', () => {
    renderWithTheme(
      <SyncEdge
        connection={mockActiveConnection}
        onClick={mockOnClick}
        isHovered={true}
      />
    );
    expect(screen.getByTestId('sync-edge-conn-1')).toHaveAttribute('data-hovered', 'true');
  });

  it('indicates active status with animation', () => {
    renderWithTheme(
      <SyncEdge
        connection={mockActiveConnection}
        onClick={mockOnClick}
        isHovered={false}
      />
    );
    expect(screen.getByTestId('sync-edge-conn-1')).toHaveAttribute('data-animated', 'true');
  });

  it('does not animate paused status', () => {
    renderWithTheme(
      <SyncEdge
        connection={mockPausedConnection}
        onClick={mockOnClick}
        isHovered={false}
      />
    );
    expect(screen.getByTestId('sync-edge-conn-2')).toHaveAttribute('data-animated', 'false');
  });

  it('indicates status via data attribute', () => {
    renderWithTheme(
      <SyncEdge
        connection={mockErrorConnection}
        onClick={mockOnClick}
        isHovered={false}
      />
    );
    expect(screen.getByTestId('sync-edge-conn-3')).toHaveAttribute('data-status', 'error');
  });

  it('renders paused status correctly', () => {
    renderWithTheme(
      <SyncEdge
        connection={mockPausedConnection}
        onClick={mockOnClick}
        isHovered={false}
      />
    );
    expect(screen.getByText('paused')).toBeInTheDocument();
    expect(screen.getByText('25 synced')).toBeInTheDocument();
  });

  it('renders error status correctly', () => {
    renderWithTheme(
      <SyncEdge
        connection={mockErrorConnection}
        onClick={mockOnClick}
        isHovered={false}
      />
    );
    expect(screen.getByText('error')).toBeInTheDocument();
    expect(screen.getByText('10 synced')).toBeInTheDocument();
  });
});
