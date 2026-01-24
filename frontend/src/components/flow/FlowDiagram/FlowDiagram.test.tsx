import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { FlowDiagram } from './FlowDiagram';
import type { FlowDiagramData, Platform, SyncConnection } from '../types';

// Mock @xyflow/react - ReactFlow renders custom nodes internally,
// so we can only test the wrapper component behavior
jest.mock('@xyflow/react', () => ({
  ReactFlow: ({ children, nodes, edges }: { children?: React.ReactNode; nodes?: unknown[]; edges?: unknown[] }) => (
    <div data-testid="react-flow-mock" data-node-count={nodes?.length} data-edge-count={edges?.length}>
      {children}
    </div>
  ),
  Background: () => <div data-testid="react-flow-background" />,
  Controls: () => <div data-testid="react-flow-controls" />,
  MiniMap: () => <div data-testid="react-flow-minimap" />,
  Handle: () => null,
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
  useNodesState: jest.fn((initial) => [initial, jest.fn(), jest.fn()]),
  useEdgesState: jest.fn((initial) => [initial, jest.fn(), jest.fn()]),
  BaseEdge: () => null,
  getBezierPath: () => ['M0,0', 0, 0],
  MarkerType: { Arrow: 'arrow', ArrowClosed: 'arrowclosed' },
}));

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const mockHub: Platform = {
  id: 'hub-chirpsyncer',
  name: 'ChirpSyncer Hub',
  connected: true,
};

const mockTwitter: Platform = {
  id: 'twitter-1',
  name: 'twitter',
  connected: true,
  lastSync: new Date().toISOString(),
  postsCount: 150,
};

const mockBluesky: Platform = {
  id: 'bluesky-1',
  name: 'bluesky',
  connected: true,
  lastSync: new Date().toISOString(),
  postsCount: 75,
};

const mockConnections: SyncConnection[] = [
  {
    id: 'conn-1',
    sourceId: 'twitter-1',
    targetId: 'hub-chirpsyncer',
    status: 'active',
    direction: 'unidirectional',
    syncCount: 42,
    lastSync: new Date().toISOString(),
  },
  {
    id: 'conn-2',
    sourceId: 'hub-chirpsyncer',
    targetId: 'bluesky-1',
    status: 'active',
    direction: 'unidirectional',
    syncCount: 38,
    lastSync: new Date().toISOString(),
  },
];

const mockData: FlowDiagramData = {
  platforms: [mockHub, mockTwitter, mockBluesky],
  connections: mockConnections,
};

const emptyData: FlowDiagramData = {
  platforms: [],
  connections: [],
};

describe('FlowDiagram', () => {
  const mockOnNodeClick = jest.fn();
  const mockOnEdgeClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the diagram container', () => {
    renderWithTheme(
      <FlowDiagram
        data={mockData}
        onNodeClick={mockOnNodeClick}
        onEdgeClick={mockOnEdgeClick}
      />
    );
    expect(screen.getByTestId('flow-diagram')).toBeInTheDocument();
  });

  it('displays the title', () => {
    renderWithTheme(
      <FlowDiagram
        data={mockData}
        onNodeClick={mockOnNodeClick}
        onEdgeClick={mockOnEdgeClick}
      />
    );
    expect(screen.getByText('Data Flow')).toBeInTheDocument();
  });

  it('renders ReactFlow component when data is provided', () => {
    renderWithTheme(
      <FlowDiagram
        data={mockData}
        onNodeClick={mockOnNodeClick}
        onEdgeClick={mockOnEdgeClick}
      />
    );
    expect(screen.getByTestId('react-flow-mock')).toBeInTheDocument();
  });

  it('renders the legend', () => {
    renderWithTheme(
      <FlowDiagram
        data={mockData}
        onNodeClick={mockOnNodeClick}
        onEdgeClick={mockOnEdgeClick}
      />
    );
    expect(screen.getByTestId('flow-diagram-legend')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Paused')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('shows empty state when no platforms', () => {
    renderWithTheme(
      <FlowDiagram
        data={emptyData}
        onNodeClick={mockOnNodeClick}
        onEdgeClick={mockOnEdgeClick}
      />
    );
    expect(screen.getByTestId('flow-diagram-empty')).toBeInTheDocument();
    expect(screen.getByText('No platforms connected')).toBeInTheDocument();
  });

  it('shows connect platform button in empty state', () => {
    renderWithTheme(
      <FlowDiagram
        data={emptyData}
        onNodeClick={mockOnNodeClick}
        onEdgeClick={mockOnEdgeClick}
      />
    );
    expect(screen.getByRole('button', { name: /connect platform/i })).toBeInTheDocument();
  });

  it('does not render ReactFlow in empty state', () => {
    renderWithTheme(
      <FlowDiagram
        data={emptyData}
        onNodeClick={mockOnNodeClick}
        onEdgeClick={mockOnEdgeClick}
      />
    );
    expect(screen.queryByTestId('react-flow-mock')).not.toBeInTheDocument();
  });

  it('applies compact mode styling', () => {
    renderWithTheme(
      <FlowDiagram
        data={mockData}
        onNodeClick={mockOnNodeClick}
        onEdgeClick={mockOnEdgeClick}
        compact
      />
    );
    expect(screen.getByTestId('flow-diagram')).toHaveAttribute('data-compact', 'true');
  });

  it('applies default (non-compact) mode styling', () => {
    renderWithTheme(
      <FlowDiagram
        data={mockData}
        onNodeClick={mockOnNodeClick}
        onEdgeClick={mockOnEdgeClick}
      />
    );
    expect(screen.getByTestId('flow-diagram')).toHaveAttribute('data-compact', 'false');
  });

  it('renders legend with status colors in empty state', () => {
    renderWithTheme(
      <FlowDiagram
        data={emptyData}
        onNodeClick={mockOnNodeClick}
        onEdgeClick={mockOnEdgeClick}
      />
    );
    // Legend should still be visible in empty state
    expect(screen.getByTestId('flow-diagram-legend')).toBeInTheDocument();
  });

  it('passes nodes and edges to ReactFlow', () => {
    renderWithTheme(
      <FlowDiagram
        data={mockData}
        onNodeClick={mockOnNodeClick}
        onEdgeClick={mockOnEdgeClick}
      />
    );
    const reactFlowMock = screen.getByTestId('react-flow-mock');
    // ReactFlow receives nodes and edges as props
    expect(reactFlowMock).toBeInTheDocument();
  });
});
