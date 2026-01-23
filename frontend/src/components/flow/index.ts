// Components
export { FlowDiagram } from './FlowDiagram';
export { PlatformNode } from './PlatformNode';
export { SyncEdge } from './SyncEdge';

// Types
export type {
  Platform,
  SyncConnection,
  FlowDiagramData,
  FlowElement,
  FlowNodeElement,
  FlowEdgeElement,
} from './types';

// Constants (for consumers who need them)
export {
  STATUS_COLORS,
  PLATFORM_COLORS,
  LEGEND_ITEMS,
  formatRelativeTime,
} from './constants';
