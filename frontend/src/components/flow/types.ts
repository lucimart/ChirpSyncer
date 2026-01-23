/**
 * Shared types for flow diagram components
 */

export interface Platform {
  id: string;
  name: string;
  connected: boolean;
  icon?: string;
  color?: string;
  status?: 'active' | 'paused';
  handle?: string;
  lastSync?: string;
  postsCount?: number;
}

export interface SyncConnection {
  id: string;
  sourceId: string;
  targetId: string;
  status: 'active' | 'paused' | 'error';
  lastSync?: string;
  syncCount?: number;
  direction: 'unidirectional' | 'bidirectional';
}

export interface FlowDiagramData {
  platforms: Platform[];
  connections: SyncConnection[];
}

// Union type for flow element rendering
export type FlowNodeElement = { type: 'node'; platform: Platform };
export type FlowEdgeElement = { type: 'edge'; connection: SyncConnection };
export type FlowElement = FlowNodeElement | FlowEdgeElement;
