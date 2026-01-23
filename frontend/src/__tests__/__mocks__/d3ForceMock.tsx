// Mock d3-force for Jest
const mockSimulation = {
  nodes: jest.fn().mockReturnThis(),
  force: jest.fn().mockReturnThis(),
  alpha: jest.fn().mockReturnThis(),
  alphaTarget: jest.fn().mockReturnThis(),
  alphaDecay: jest.fn().mockReturnThis(),
  restart: jest.fn().mockReturnThis(),
  stop: jest.fn().mockReturnThis(),
  tick: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
};

export const forceSimulation = jest.fn().mockReturnValue(mockSimulation);
export const forceLink = jest.fn().mockReturnValue({
  id: jest.fn().mockReturnThis(),
  distance: jest.fn().mockReturnThis(),
  strength: jest.fn().mockReturnThis(),
  links: jest.fn().mockReturnValue([]),
});
export const forceManyBody = jest.fn().mockReturnValue({
  strength: jest.fn().mockReturnThis(),
  distanceMax: jest.fn().mockReturnThis(),
});
export const forceCenter = jest.fn().mockReturnValue({});
export const forceCollide = jest.fn().mockReturnValue({
  radius: jest.fn().mockReturnThis(),
});

// Type exports (no-op for Jest)
export type Simulation<T, L> = typeof mockSimulation;
export type SimulationNodeDatum = { x?: number; y?: number; fx?: number | null; fy?: number | null };
export type SimulationLinkDatum<T> = { source: T; target: T };
