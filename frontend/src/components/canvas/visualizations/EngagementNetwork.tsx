'use client';

import React, {
  memo,
  useRef,
  useEffect,
  useCallback,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import styled from 'styled-components';
import { useReducedMotion } from 'framer-motion';
import {
  Application,
  Container,
  Graphics,
  Text,
  TextStyle,
  FederatedPointerEvent,
} from 'pixi.js';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force';

export interface NetworkNode extends SimulationNodeDatum {
  id: string;
  label: string;
  size: number;
  color: string;
  type: 'user' | 'post' | 'topic' | 'platform';
  metadata?: Record<string, unknown>;
}

export interface NetworkLink extends SimulationLinkDatum<NetworkNode> {
  id: string;
  strength: number;
  type: 'follow' | 'like' | 'repost' | 'mention' | 'reply';
}

export interface EngagementNetworkProps {
  /** Network nodes */
  nodes: NetworkNode[];
  /** Network links/edges */
  links: NetworkLink[];
  /** Container width */
  width: number;
  /** Container height */
  height: number;
  /** Whether simulation is running */
  running?: boolean;
  /** Called when a node is clicked */
  onNodeClick?: (node: NetworkNode) => void;
  /** Called when a node is hovered */
  onNodeHover?: (node: NetworkNode | null) => void;
  /** Show labels on nodes */
  showLabels?: boolean;
  /** Minimum zoom level */
  minZoom?: number;
  /** Maximum zoom level */
  maxZoom?: number;
  /** CSS class name */
  className?: string;
}

export interface EngagementNetworkRef {
  /** Reset zoom and pan */
  resetView: () => void;
  /** Zoom to fit all nodes */
  fitView: () => void;
  /** Highlight a specific node */
  highlightNode: (nodeId: string | null) => void;
  /** Restart the simulation */
  restartSimulation: () => void;
}

const CanvasContainer = styled.div`
  position: relative;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.background.primary};
  border-radius: ${({ theme }) => theme.borderRadius.md};

  canvas {
    display: block;
  }
`;

const LoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

// Node type colors
const NODE_TYPE_COLORS: Record<NetworkNode['type'], number> = {
  user: 0x6366f1,    // Indigo
  post: 0x10b981,    // Emerald
  topic: 0xf59e0b,   // Amber
  platform: 0xec4899, // Pink
};

// Link type colors
const LINK_TYPE_COLORS: Record<NetworkLink['type'], number> = {
  follow: 0x94a3b8,
  like: 0xef4444,
  repost: 0x22c55e,
  mention: 0x3b82f6,
  reply: 0x8b5cf6,
};

/**
 * High-performance network visualization using Pixi.js (WebGL) and d3-force
 * Optimized for 1000+ nodes
 */
export const EngagementNetwork = memo(
  forwardRef<EngagementNetworkRef, EngagementNetworkProps>(
    function EngagementNetwork(
      {
        nodes,
        links,
        width,
        height,
        running = true,
        onNodeClick,
        onNodeHover,
        showLabels = true,
        minZoom = 0.1,
        maxZoom = 4,
        className,
      },
      ref
    ) {
      const containerRef = useRef<HTMLDivElement>(null);
      const appRef = useRef<Application | null>(null);
      const simulationRef = useRef<Simulation<NetworkNode, NetworkLink> | null>(null);
      const nodesContainerRef = useRef<Container | null>(null);
      const linksContainerRef = useRef<Container | null>(null);
      const nodeGraphicsRef = useRef<Map<string, Graphics>>(new Map());
      const linkGraphicsRef = useRef<Graphics | null>(null);

      const [isLoading, setIsLoading] = useState(true);
      const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);

      const prefersReducedMotion = useReducedMotion();

      // Initialize Pixi application
      useEffect(() => {
        if (!containerRef.current || appRef.current) return;

        const initApp = async () => {
          const app = new Application();
          await app.init({
            width,
            height,
            backgroundColor: 0xffffff,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
          });

          containerRef.current?.appendChild(app.canvas);
          appRef.current = app;

          // Create containers for links (below) and nodes (above)
          const linksContainer = new Container();
          const nodesContainer = new Container();
          nodesContainer.eventMode = 'static';

          app.stage.addChild(linksContainer);
          app.stage.addChild(nodesContainer);

          linksContainerRef.current = linksContainer;
          nodesContainerRef.current = nodesContainer;

          // Create single graphics for all links
          const linkGraphics = new Graphics();
          linksContainer.addChild(linkGraphics);
          linkGraphicsRef.current = linkGraphics;

          setIsLoading(false);
        };

        initApp();

        return () => {
          if (appRef.current) {
            appRef.current.destroy(true, { children: true });
            appRef.current = null;
          }
        };
      }, [width, height]);

      // Resize handler
      useEffect(() => {
        if (!appRef.current) return;
        appRef.current.renderer.resize(width, height);
      }, [width, height]);

      // Create/update node graphics
      const updateNodes = useCallback(() => {
        if (!nodesContainerRef.current) return;

        const container = nodesContainerRef.current;
        const existingGraphics = nodeGraphicsRef.current;
        const nodeIds = new Set(nodes.map((n) => n.id));

        // Remove old nodes
        existingGraphics.forEach((graphics, id) => {
          if (!nodeIds.has(id)) {
            container.removeChild(graphics);
            graphics.destroy();
            existingGraphics.delete(id);
          }
        });

        // Create/update nodes
        nodes.forEach((node) => {
          let graphics = existingGraphics.get(node.id);

          if (!graphics) {
            graphics = new Graphics();
            graphics.eventMode = 'static';
            graphics.cursor = 'pointer';

            // Store node reference
            (graphics as Graphics & { nodeData: NetworkNode }).nodeData = node;

            // Event handlers
            graphics.on('pointerover', () => {
              onNodeHover?.(node);
              setHighlightedNodeId(node.id);
            });

            graphics.on('pointerout', () => {
              onNodeHover?.(null);
              setHighlightedNodeId(null);
            });

            graphics.on('pointertap', () => {
              onNodeClick?.(node);
            });

            container.addChild(graphics);
            existingGraphics.set(node.id, graphics);
          }

          // Update position
          graphics.x = node.x ?? 0;
          graphics.y = node.y ?? 0;

          // Redraw node
          graphics.clear();

          const color = parseInt(node.color.replace('#', ''), 16) || NODE_TYPE_COLORS[node.type];
          const isHighlighted = highlightedNodeId === node.id;
          const radius = node.size * (isHighlighted ? 1.3 : 1);

          // Glow effect for highlighted
          if (isHighlighted) {
            graphics.circle(0, 0, radius + 4);
            graphics.fill({ color, alpha: 0.3 });
          }

          // Main circle
          graphics.circle(0, 0, radius);
          graphics.fill({ color });

          // Border
          graphics.circle(0, 0, radius);
          graphics.stroke({ color: 0xffffff, width: 2 });
        });
      }, [nodes, highlightedNodeId, onNodeClick, onNodeHover]);

      // Draw links
      const updateLinks = useCallback(() => {
        const graphics = linkGraphicsRef.current;
        if (!graphics) return;

        graphics.clear();

        links.forEach((link) => {
          const source = link.source as NetworkNode;
          const target = link.target as NetworkNode;

          if (!source.x || !source.y || !target.x || !target.y) return;

          const color = LINK_TYPE_COLORS[link.type] || 0x94a3b8;
          const alpha = link.strength * 0.5 + 0.2;
          const width = Math.max(1, link.strength * 3);

          // Check if either end is highlighted
          const isHighlighted =
            highlightedNodeId === (source as NetworkNode).id ||
            highlightedNodeId === (target as NetworkNode).id;

          graphics.moveTo(source.x, source.y);
          graphics.lineTo(target.x, target.y);
          graphics.stroke({
            color,
            width: isHighlighted ? width * 2 : width,
            alpha: isHighlighted ? 1 : alpha,
          });
        });
      }, [links, highlightedNodeId]);

      // Initialize and run simulation
      useEffect(() => {
        if (nodes.length === 0) return;

        // Initialize node positions if not set
        nodes.forEach((node, i) => {
          if (node.x === undefined) {
            node.x = width / 2 + Math.cos((i * 2 * Math.PI) / nodes.length) * 100;
          }
          if (node.y === undefined) {
            node.y = height / 2 + Math.sin((i * 2 * Math.PI) / nodes.length) * 100;
          }
        });

        const simulation = forceSimulation<NetworkNode>(nodes)
          .force(
            'link',
            forceLink<NetworkNode, NetworkLink>(links)
              .id((d) => d.id)
              .distance(100)
              .strength((d) => d.strength * 0.5)
          )
          .force('charge', forceManyBody().strength(-300))
          .force('center', forceCenter(width / 2, height / 2))
          .force('collision', forceCollide<NetworkNode>().radius((d) => d.size + 5))
          .alphaDecay(prefersReducedMotion ? 1 : 0.02)
          .on('tick', () => {
            updateNodes();
            updateLinks();
          });

        simulationRef.current = simulation;

        if (!running) {
          simulation.stop();
        }

        return () => {
          simulation.stop();
        };
      }, [nodes, links, width, height, running, prefersReducedMotion, updateNodes, updateLinks]);

      // Restart simulation when running changes
      useEffect(() => {
        const simulation = simulationRef.current;
        if (!simulation) return;

        if (running) {
          simulation.alpha(0.3).restart();
        } else {
          simulation.stop();
        }
      }, [running]);

      // Expose imperative methods
      useImperativeHandle(
        ref,
        () => ({
          resetView: () => {
            if (!appRef.current) return;
            appRef.current.stage.scale.set(1);
            appRef.current.stage.position.set(0, 0);
          },
          fitView: () => {
            if (!appRef.current || nodes.length === 0) return;

            // Calculate bounds
            let minX = Infinity, minY = Infinity;
            let maxX = -Infinity, maxY = -Infinity;

            nodes.forEach((node) => {
              if (node.x !== undefined && node.y !== undefined) {
                minX = Math.min(minX, node.x - node.size);
                minY = Math.min(minY, node.y - node.size);
                maxX = Math.max(maxX, node.x + node.size);
                maxY = Math.max(maxY, node.y + node.size);
              }
            });

            const boundsWidth = maxX - minX;
            const boundsHeight = maxY - minY;
            const scale = Math.min(
              (width - 40) / boundsWidth,
              (height - 40) / boundsHeight,
              maxZoom
            );

            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;

            appRef.current.stage.scale.set(Math.max(scale, minZoom));
            appRef.current.stage.position.set(
              width / 2 - centerX * scale,
              height / 2 - centerY * scale
            );
          },
          highlightNode: (nodeId: string | null) => {
            setHighlightedNodeId(nodeId);
          },
          restartSimulation: () => {
            simulationRef.current?.alpha(1).restart();
          },
        }),
        [nodes, width, height, minZoom, maxZoom]
      );

      // Static render for reduced motion
      if (prefersReducedMotion && !isLoading) {
        updateNodes();
        updateLinks();
      }

      return (
        <CanvasContainer
          ref={containerRef}
          className={className}
          style={{ width, height }}
          aria-label="Engagement network visualization"
          role="img"
        >
          {isLoading && <LoadingOverlay>Loading visualization...</LoadingOverlay>}
        </CanvasContainer>
      );
    }
  )
);

export default EngagementNetwork;
