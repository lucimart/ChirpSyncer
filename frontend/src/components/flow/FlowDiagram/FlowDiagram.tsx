'use client';

import { memo, useCallback, useMemo, useState, useEffect, type FC, type CSSProperties } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeProps,
  BaseEdge,
  getBezierPath,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import styled, { useTheme } from 'styled-components';
import { Button, EmptyState } from '../../ui';
import { FlowParticleOverlay, type FlowEdge } from '../../canvas/visualizations/FlowParticleOverlay';
import type { Platform, SyncConnection, FlowDiagramData } from '../types';
import { LEGEND_ITEMS, STATUS_COLORS, PLATFORM_COLORS, DEFAULT_COLOR } from '../constants';

// Re-export types for backwards compatibility
export type { Platform, SyncConnection, FlowDiagramData };

interface FlowDiagramProps {
  data: FlowDiagramData;
  onNodeClick: (platform: Platform) => void;
  onEdgeClick: (connection: SyncConnection) => void;
  compact?: boolean;
  /** Show animated particles flowing along edges */
  showParticles?: boolean;
}

// Styled containers
const DiagramContainer = styled.div<{ $compact: boolean }>`
  display: flex;
  flex-direction: column;
  padding: ${({ theme, $compact }) => ($compact ? theme.spacing[3] : theme.spacing[6])};
  background: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
`;

const Title = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const FlowWrapper = styled.div<{ $compact: boolean }>`
  position: relative;
  height: ${({ $compact }) => ($compact ? '280px' : '400px')};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  overflow: hidden;
  background: ${({ theme }) => theme.colors.background.primary};

  .react-flow__node {
    cursor: pointer;
  }

  .react-flow__edge {
    cursor: pointer;
  }

  .react-flow__controls {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    border-radius: ${({ theme }) => theme.borderRadius.md};
    border: 1px solid ${({ theme }) => theme.colors.border.light};
  }

  .react-flow__controls-button {
    background: ${({ theme }) => theme.colors.background.primary};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

    &:hover {
      background: ${({ theme }) => theme.colors.background.secondary};
    }

    svg {
      fill: ${({ theme }) => theme.colors.text.secondary};
    }
  }

  .react-flow__minimap {
    background: ${({ theme }) => theme.colors.background.secondary};
    border-radius: ${({ theme }) => theme.borderRadius.md};
    border: 1px solid ${({ theme }) => theme.colors.border.light};
  }
`;

const Legend = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[4]};
  padding-top: ${({ theme }) => theme.spacing[4]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  justify-content: center;
  flex-wrap: wrap;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const LegendDot = styled.span<{ $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`;

// Custom Hub Node
const HubNodeContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  border: 3px solid #818cf8;
  border-radius: 16px;
  min-width: 140px;
  box-shadow: 0 8px 32px rgba(99, 102, 241, 0.3);
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 12px 40px rgba(99, 102, 241, 0.4);
  }
`;

const HubIcon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  color: white;
`;

const HubName = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: white;
  text-align: center;
`;

const HubStatus = styled.span`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 4px;
`;

// Custom Platform Node
const PlatformNodeContainer = styled.div<{ $borderColor: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  background: white;
  border: 2px solid ${({ $borderColor }) => $borderColor};
  border-radius: 12px;
  min-width: 120px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.08);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  }
`;

const PlatformIcon = styled.div<{ $bgColor: string }>`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: ${({ $bgColor }) => $bgColor};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
  color: white;
`;

const PlatformName = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
`;

const PlatformHandle = styled.span`
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
`;

// SVG Icons
const TwitterIconSVG: FC = () => (
  <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const BlueskyIconSVG: FC = () => (
  <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor">
    <path d="M12 2C8.5 5.5 5 9 5 12.5c0 2.5 1.5 4.5 4 5-.5.5-1.5 1-2.5 1.5 2.5.5 5 0 7-.5-3 1-6 1.5-7.5 2 5-1 10-1 13 0-1.5-.5-4.5-1-7.5-2 2 .5 4.5 1 7 .5-1-.5-2-1-2.5-1.5 2.5-.5 4-2.5 4-5C19 9 15.5 5.5 12 2z" />
  </svg>
);

const HubIconSVG: FC = () => (
  <svg viewBox="0 0 24 24" width={28} height={28} fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="3" fill="currentColor" />
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    <path d="M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);

const PLATFORM_ICONS: Record<string, FC> = {
  twitter: TwitterIconSVG,
  bluesky: BlueskyIconSVG,
};

// Custom Node Components for React Flow
interface HubNodeData extends Record<string, unknown> {
  label: string;
  platform: Platform;
}

const HubNodeComponent: FC<NodeProps<Node<HubNodeData>>> = ({ data }) => {
  return (
    <HubNodeContainer data-testid={`platform-node-${data.platform.id}`}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <HubIcon>
        <HubIconSVG />
      </HubIcon>
      <HubName>{data.label}</HubName>
      <HubStatus>Central Hub</HubStatus>
    </HubNodeContainer>
  );
};

interface PlatformNodeData extends Record<string, unknown> {
  label: string;
  platform: Platform;
  handle?: string;
}

const PlatformNodeComponent: FC<NodeProps<Node<PlatformNodeData>>> = ({ data }) => {
  const platformName = data.platform.name.toLowerCase();
  const color = PLATFORM_COLORS[platformName] || DEFAULT_COLOR;
  const IconComponent = PLATFORM_ICONS[platformName] ?? BlueskyIconSVG;

  return (
    <PlatformNodeContainer
      $borderColor={color}
      data-testid={`platform-node-${data.platform.id}`}
      data-hovered="false"
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Right} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Left} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
      <PlatformIcon $bgColor={color}>
        <IconComponent />
      </PlatformIcon>
      <PlatformName>{data.label}</PlatformName>
      {data.handle && <PlatformHandle>{data.handle}</PlatformHandle>}
    </PlatformNodeContainer>
  );
};

// Custom Animated Edge
interface AnimatedEdgeData extends Record<string, unknown> {
  connection: SyncConnection;
}

const AnimatedEdge: FC<EdgeProps<Edge<AnimatedEdgeData>>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const status = data?.connection?.status || 'active';
  const color = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || DEFAULT_COLOR;
  const isAnimated = status === 'active';

  return (
    <g data-testid={`sync-edge-${id}`}>
      {/* Invisible hit area */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: 'pointer' }}
      />
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: color,
          strokeWidth: 3,
          strokeDasharray: isAnimated ? '8 8' : 'none',
          animation: isAnimated ? 'flowAnimation 0.6s linear infinite' : 'none',
        }}
      />
      <style>
        {`
          @keyframes flowAnimation {
            0% { stroke-dashoffset: 16; }
            100% { stroke-dashoffset: 0; }
          }
        `}
      </style>
    </g>
  );
};

// Node types registration
const nodeTypes = {
  hub: HubNodeComponent,
  platform: PlatformNodeComponent,
};

const edgeTypes = {
  animated: AnimatedEdge,
};

// Calculate radial positions for platforms
function calculatePlatformPositions(
  count: number,
  centerX: number,
  centerY: number,
  radius: number
): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  const startAngle = -90;

  for (let i = 0; i < count; i++) {
    const angle = startAngle + (i * 360) / count;
    const radians = (angle * Math.PI) / 180;
    positions.push({
      x: centerX + radius * Math.cos(radians),
      y: centerY + radius * Math.sin(radians),
    });
  }

  return positions;
}

// FlowLegend component
const FlowLegend: FC = memo(function FlowLegend() {
  return (
    <Legend data-testid="flow-diagram-legend">
      {LEGEND_ITEMS.map((item) => (
        <LegendItem key={item.label}>
          <LegendDot $color={item.color} />
          <span>{item.label}</span>
        </LegendItem>
      ))}
    </Legend>
  );
});

// Main FlowDiagram component
export const FlowDiagram: FC<FlowDiagramProps> = memo(function FlowDiagram({
  data,
  onNodeClick,
  onEdgeClick,
  compact = false,
  showParticles = false,
}) {
  const theme = useTheme();
  const [flowDimensions, setFlowDimensions] = useState({ width: 600, height: compact ? 280 : 400 });

  // Separate hub from other platforms
  const { hub, platforms } = useMemo(() => {
    const hubPlatform = data.platforms.find(
      (p) => p.id === 'hub-chirpsyncer' || p.name.toLowerCase().includes('hub')
    );
    const otherPlatforms = data.platforms.filter(
      (p) => p.id !== 'hub-chirpsyncer' && !p.name.toLowerCase().includes('hub')
    );
    return { hub: hubPlatform, platforms: otherPlatforms };
  }, [data.platforms]);

  // Create React Flow nodes
  const initialNodes = useMemo((): Node[] => {
    if (!hub) return [];

    const centerX = 300;
    const centerY = 200;
    const radius = compact ? 150 : 180;
    const positions = calculatePlatformPositions(platforms.length, centerX, centerY, radius);

    const nodes: Node[] = [
      {
        id: hub.id,
        type: 'hub',
        position: { x: centerX - 70, y: centerY - 70 },
        data: { label: hub.name, platform: hub },
        draggable: true,
      },
    ];

    platforms.forEach((platform, index) => {
      nodes.push({
        id: platform.id,
        type: 'platform',
        position: { x: positions[index].x - 60, y: positions[index].y - 50 },
        data: {
          label: platform.name,
          platform,
          handle: platform.handle,
        },
        draggable: true,
      });
    });

    return nodes;
  }, [hub, platforms, compact]);

  // Create React Flow edges
  const initialEdges = useMemo((): Edge[] => {
    return data.connections.map((conn) => {
      const status = conn.status;
      const color = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || DEFAULT_COLOR;

      return {
        id: conn.id,
        source: conn.sourceId,
        target: conn.targetId,
        type: 'animated',
        animated: status === 'active',
        data: { connection: conn },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color,
          width: 20,
          height: 20,
        },
        style: { stroke: color, strokeWidth: 3 },
      };
    });
  }, [data.connections]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Calculate particle edges from node positions
  const particleEdges = useMemo((): FlowEdge[] => {
    if (!showParticles) return [];

    // Build a map of node positions (center of each node)
    const nodePositions = new Map<string, { x: number; y: number }>();
    nodes.forEach((node) => {
      // Approximate node center (adjust based on node dimensions)
      const nodeWidth = node.type === 'hub' ? 140 : 120;
      const nodeHeight = node.type === 'hub' ? 140 : 100;
      nodePositions.set(node.id, {
        x: node.position.x + nodeWidth / 2,
        y: node.position.y + nodeHeight / 2,
      });
    });

    // Create FlowEdge array for particle overlay
    return data.connections.map((conn) => {
      const sourcePos = nodePositions.get(conn.sourceId);
      const targetPos = nodePositions.get(conn.targetId);
      const status = conn.status;
      const color = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || DEFAULT_COLOR;

      return {
        id: conn.id,
        sourceX: sourcePos?.x ?? 0,
        sourceY: sourcePos?.y ?? 0,
        targetX: targetPos?.x ?? 0,
        targetY: targetPos?.y ?? 0,
        color,
        active: status === 'active',
      };
    });
  }, [showParticles, nodes, data.connections]);

  // Handle node click
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const platform = data.platforms.find((p) => p.id === node.id);
      if (platform) {
        onNodeClick(platform);
      }
    },
    [data.platforms, onNodeClick]
  );

  // Handle edge click
  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      const connection = data.connections.find((c) => c.id === edge.id);
      if (connection) {
        onEdgeClick(connection);
      }
    },
    [data.connections, onEdgeClick]
  );

  const isEmpty = data.platforms.length === 0 || !hub;

  if (isEmpty) {
    return (
      <DiagramContainer
        data-testid="flow-diagram"
        data-compact={String(compact)}
        $compact={compact}
      >
        <Title>Data Flow</Title>
        <EmptyState
          title="No platforms connected"
          size={compact ? 'sm' : 'md'}
          data-testid="flow-diagram-empty"
          action={
            <Button type="button" variant="primary" size="sm" aria-label="Connect Platform">
              Connect Platform
            </Button>
          }
        />
        <FlowLegend />
      </DiagramContainer>
    );
  }

  return (
    <DiagramContainer
      data-testid="flow-diagram"
      data-compact={String(compact)}
      $compact={compact}
    >
      <Title>Data Flow</Title>
      <FlowWrapper $compact={compact}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.5}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color={theme?.colors?.border?.light || '#e5e7eb'} gap={16} />
          <Controls showInteractive={false} />
          {!compact && (
            <MiniMap
              nodeColor={(node) => {
                if (node.type === 'hub') return '#6366f1';
                const platform = node.data?.platform as Platform;
                if (platform) {
                  return PLATFORM_COLORS[platform.name.toLowerCase()] || DEFAULT_COLOR;
                }
                return DEFAULT_COLOR;
              }}
              maskColor="rgba(0, 0, 0, 0.1)"
              pannable
              zoomable
            />
          )}
        </ReactFlow>
        {showParticles && particleEdges.length > 0 && (
          <FlowParticleOverlay
            edges={particleEdges}
            width={flowDimensions.width}
            height={flowDimensions.height}
            active={true}
            particlesPerEdge={2}
            speed={0.4}
            particleSize={5}
          />
        )}
      </FlowWrapper>
      <FlowLegend />
    </DiagramContainer>
  );
});
