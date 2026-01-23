'use client';

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { Button, EmptyState } from '../ui';
import { PlatformNode, Platform } from './PlatformNode';
import { SyncEdge, SyncConnection } from './SyncEdge';

// Re-export types
export type { Platform, SyncConnection };

export interface FlowDiagramData {
  platforms: Platform[];
  connections: SyncConnection[];
}

interface FlowDiagramProps {
  data: FlowDiagramData;
  onNodeClick: (platform: Platform) => void;
  onEdgeClick: (connection: SyncConnection) => void;
  compact?: boolean;
}

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

const FlowContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
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

const NodeWrapper = styled.div`
  position: relative;
`;

export const FlowDiagram: React.FC<FlowDiagramProps> = ({
  data,
  onNodeClick,
  onEdgeClick,
  compact = false,
}) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  const handleNodeMouseEnter = useCallback((id: string) => {
    setHoveredNodeId(id);
  }, []);

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
  }, []);

  const handleEdgeMouseEnter = useCallback((id: string) => {
    setHoveredEdgeId(id);
  }, []);

  const handleEdgeMouseLeave = useCallback(() => {
    setHoveredEdgeId(null);
  }, []);

  if (data.platforms.length === 0) {
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
        <Legend data-testid="flow-diagram-legend">
          <LegendItem>
            <LegendDot $color="#22C55E" />
            <span>Active</span>
          </LegendItem>
          <LegendItem>
            <LegendDot $color="#EAB308" />
            <span>Paused</span>
          </LegendItem>
          <LegendItem>
            <LegendDot $color="#EF4444" />
            <span>Error</span>
          </LegendItem>
        </Legend>
      </DiagramContainer>
    );
  }

  // Build flow: source platform -> edge -> target platform
  const renderFlow = () => {
    const elements: React.ReactNode[] = [];
    const renderedPlatforms = new Set<string>();

    data.connections.forEach((connection) => {
      const sourcePlatform = data.platforms.find((p) => p.id === connection.sourceId);
      const targetPlatform = data.platforms.find((p) => p.id === connection.targetId);

      if (sourcePlatform && !renderedPlatforms.has(sourcePlatform.id)) {
        elements.push(
          <NodeWrapper
            key={`node-${sourcePlatform.id}`}
            onMouseEnter={() => handleNodeMouseEnter(sourcePlatform.id)}
            onMouseLeave={handleNodeMouseLeave}
          >
            <PlatformNode
              platform={sourcePlatform}
              onClick={onNodeClick}
              isHovered={hoveredNodeId === sourcePlatform.id}
              isSelected={false}
            />
          </NodeWrapper>
        );
        renderedPlatforms.add(sourcePlatform.id);
      }

      elements.push(
        <NodeWrapper
          key={`edge-${connection.id}`}
          onMouseEnter={() => handleEdgeMouseEnter(connection.id)}
          onMouseLeave={handleEdgeMouseLeave}
        >
          <SyncEdge
            connection={connection}
            onClick={onEdgeClick}
            isHovered={hoveredEdgeId === connection.id}
          />
        </NodeWrapper>
      );

      if (targetPlatform && !renderedPlatforms.has(targetPlatform.id)) {
        elements.push(
          <NodeWrapper
            key={`node-${targetPlatform.id}`}
            onMouseEnter={() => handleNodeMouseEnter(targetPlatform.id)}
            onMouseLeave={handleNodeMouseLeave}
          >
            <PlatformNode
              platform={targetPlatform}
              onClick={onNodeClick}
              isHovered={hoveredNodeId === targetPlatform.id}
              isSelected={false}
            />
          </NodeWrapper>
        );
        renderedPlatforms.add(targetPlatform.id);
      }
    });

    // Render any platforms not connected by edges
    data.platforms.forEach((platform) => {
      if (!renderedPlatforms.has(platform.id)) {
        elements.push(
          <NodeWrapper
            key={`node-${platform.id}`}
            onMouseEnter={() => handleNodeMouseEnter(platform.id)}
            onMouseLeave={handleNodeMouseLeave}
          >
            <PlatformNode
              platform={platform}
              onClick={onNodeClick}
              isHovered={hoveredNodeId === platform.id}
              isSelected={false}
            />
          </NodeWrapper>
        );
        renderedPlatforms.add(platform.id);
      }
    });

    return elements;
  };

  return (
    <DiagramContainer
      data-testid="flow-diagram"
      data-compact={String(compact)}
      $compact={compact}
    >
      <Title>Data Flow</Title>
      <FlowContainer>{renderFlow()}</FlowContainer>
      <Legend data-testid="flow-diagram-legend">
        <LegendItem>
          <LegendDot $color="#22C55E" />
          <span>Active</span>
        </LegendItem>
        <LegendItem>
          <LegendDot $color="#EAB308" />
          <span>Paused</span>
        </LegendItem>
        <LegendItem>
          <LegendDot $color="#EF4444" />
          <span>Error</span>
        </LegendItem>
      </Legend>
    </DiagramContainer>
  );
};
