// Mock d3 for Jest
export const select = jest.fn(() => ({
  append: jest.fn().mockReturnThis(),
  attr: jest.fn().mockReturnThis(),
  style: jest.fn().mockReturnThis(),
  text: jest.fn().mockReturnThis(),
  selectAll: jest.fn().mockReturnThis(),
  data: jest.fn().mockReturnThis(),
  join: jest.fn().mockReturnThis(),
  enter: jest.fn().mockReturnThis(),
  exit: jest.fn().mockReturnThis(),
  remove: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  call: jest.fn().mockReturnThis(),
  transition: jest.fn().mockReturnThis(),
  duration: jest.fn().mockReturnThis(),
  node: jest.fn().mockReturnValue(null),
  empty: jest.fn().mockReturnValue(true),
}));

export const selectAll = jest.fn(() => ({
  data: jest.fn().mockReturnThis(),
  join: jest.fn().mockReturnThis(),
  attr: jest.fn().mockReturnThis(),
  style: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  remove: jest.fn().mockReturnThis(),
}));

export const scaleLinear = jest.fn(() => {
  const scale = (x: number) => x;
  scale.domain = jest.fn().mockReturnValue(scale);
  scale.range = jest.fn().mockReturnValue(scale);
  scale.nice = jest.fn().mockReturnValue(scale);
  scale.ticks = jest.fn().mockReturnValue([0, 25, 50, 75, 100]);
  return scale;
});

export const scaleBand = jest.fn(() => {
  const scale = (x: string) => 0;
  scale.domain = jest.fn().mockReturnValue(scale);
  scale.range = jest.fn().mockReturnValue(scale);
  scale.padding = jest.fn().mockReturnValue(scale);
  scale.bandwidth = jest.fn().mockReturnValue(20);
  return scale;
});

export const scaleSequential = jest.fn(() => {
  const scale = (x: number) => `rgb(${x}, ${x}, ${x})`;
  scale.domain = jest.fn().mockReturnValue(scale);
  scale.interpolator = jest.fn().mockReturnValue(scale);
  return scale;
});

export const scaleOrdinal = jest.fn(() => {
  const scale = (x: string) => '#ccc';
  scale.domain = jest.fn().mockReturnValue(scale);
  scale.range = jest.fn().mockReturnValue(scale);
  return scale;
});

export const scaleTime = jest.fn(() => {
  const scale = (x: Date) => 0;
  scale.domain = jest.fn().mockReturnValue(scale);
  scale.range = jest.fn().mockReturnValue(scale);
  scale.nice = jest.fn().mockReturnValue(scale);
  scale.ticks = jest.fn().mockReturnValue([]);
  return scale;
});

export const axisBottom = jest.fn(() => jest.fn());
export const axisLeft = jest.fn(() => jest.fn());
export const axisRight = jest.fn(() => jest.fn());
export const axisTop = jest.fn(() => jest.fn());

export const interpolateBlues = jest.fn((t: number) => `rgba(0, 0, 255, ${t})`);
export const interpolateGreens = jest.fn((t: number) => `rgba(0, 255, 0, ${t})`);
export const interpolateReds = jest.fn((t: number) => `rgba(255, 0, 0, ${t})`);
export const interpolateYlGnBu = jest.fn((t: number) => `rgba(0, 100, 200, ${t})`);

export const max = jest.fn((arr: number[], accessor?: (d: any) => number) => {
  if (!arr || arr.length === 0) return undefined;
  if (accessor) return Math.max(...arr.map(accessor));
  return Math.max(...arr);
});

export const min = jest.fn((arr: number[], accessor?: (d: any) => number) => {
  if (!arr || arr.length === 0) return undefined;
  if (accessor) return Math.min(...arr.map(accessor));
  return Math.min(...arr);
});

export const extent = jest.fn((arr: number[], accessor?: (d: any) => number) => {
  if (!arr || arr.length === 0) return [undefined, undefined];
  const values = accessor ? arr.map(accessor) : arr;
  return [Math.min(...values), Math.max(...values)];
});

export const sum = jest.fn((arr: number[], accessor?: (d: any) => number) => {
  if (!arr || arr.length === 0) return 0;
  if (accessor) return arr.reduce((sum, d) => sum + accessor(d), 0);
  return arr.reduce((sum, n) => sum + n, 0);
});

export const mean = jest.fn((arr: number[]) => {
  if (!arr || arr.length === 0) return undefined;
  return arr.reduce((sum, n) => sum + n, 0) / arr.length;
});

export const line = jest.fn(() => {
  const gen = (data: any[]) => 'M0,0';
  gen.x = jest.fn().mockReturnValue(gen);
  gen.y = jest.fn().mockReturnValue(gen);
  gen.curve = jest.fn().mockReturnValue(gen);
  gen.defined = jest.fn().mockReturnValue(gen);
  return gen;
});

export const area = jest.fn(() => {
  const gen = (data: any[]) => 'M0,0';
  gen.x = jest.fn().mockReturnValue(gen);
  gen.y0 = jest.fn().mockReturnValue(gen);
  gen.y1 = jest.fn().mockReturnValue(gen);
  gen.curve = jest.fn().mockReturnValue(gen);
  gen.defined = jest.fn().mockReturnValue(gen);
  return gen;
});

export const arc = jest.fn(() => {
  const gen = (data: any) => 'M0,0';
  gen.innerRadius = jest.fn().mockReturnValue(gen);
  gen.outerRadius = jest.fn().mockReturnValue(gen);
  gen.startAngle = jest.fn().mockReturnValue(gen);
  gen.endAngle = jest.fn().mockReturnValue(gen);
  gen.cornerRadius = jest.fn().mockReturnValue(gen);
  return gen;
});

export const pie = jest.fn(() => {
  const gen = (data: any[]) => data.map((d, i) => ({
    data: d,
    index: i,
    value: typeof d === 'number' ? d : d.value,
    startAngle: 0,
    endAngle: Math.PI * 2,
    padAngle: 0,
  }));
  gen.value = jest.fn().mockReturnValue(gen);
  gen.sort = jest.fn().mockReturnValue(gen);
  gen.sortValues = jest.fn().mockReturnValue(gen);
  return gen;
});

export const curveBasis = {};
export const curveLinear = {};
export const curveMonotoneX = {};
export const curveStep = {};

export const format = jest.fn((specifier: string) => (n: number) => String(n));
export const timeFormat = jest.fn((specifier: string) => (d: Date) => d.toISOString());

// Force simulation exports - re-export from d3ForceMock
export { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from './d3ForceMock';

// Transition
export const transition = jest.fn(() => ({
  duration: jest.fn().mockReturnThis(),
  ease: jest.fn().mockReturnThis(),
}));

// Easing
export const easeLinear = (t: number) => t;
export const easeQuadIn = (t: number) => t * t;
export const easeQuadOut = (t: number) => t * (2 - t);
export const easeCubicInOut = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Color
export const color = jest.fn((c: string) => ({
  r: 0,
  g: 0,
  b: 0,
  opacity: 1,
  toString: () => c,
  brighter: jest.fn().mockReturnThis(),
  darker: jest.fn().mockReturnThis(),
}));

export const rgb = jest.fn((r: number, g: number, b: number) => ({
  r,
  g,
  b,
  opacity: 1,
  toString: () => `rgb(${r},${g},${b})`,
}));

// Brush
export const brush = jest.fn(() => ({
  extent: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
}));

export const brushX = jest.fn(() => ({
  extent: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
}));

export const brushY = jest.fn(() => ({
  extent: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
}));

// Zoom
export const zoom = jest.fn(() => ({
  scaleExtent: jest.fn().mockReturnThis(),
  translateExtent: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
}));

export const zoomIdentity = {
  x: 0,
  y: 0,
  k: 1,
  translate: jest.fn().mockReturnThis(),
  scale: jest.fn().mockReturnThis(),
};

// Drag
export const drag = jest.fn(() => ({
  on: jest.fn().mockReturnThis(),
  subject: jest.fn().mockReturnThis(),
}));

// Event
export const pointer = jest.fn(() => [0, 0]);
