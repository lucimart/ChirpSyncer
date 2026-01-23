import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import {
  PostDensityMap,
  type PostDensityMapRef,
  type PostDataPoint,
} from './PostDensityMap';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  ...jest.requireActual('framer-motion'),
  useReducedMotion: jest.fn(() => false),
}));

// Mock canvas context
const mockContext = {
  clearRect: jest.fn(),
  createImageData: jest.fn(() => ({
    data: new Uint8ClampedArray(100 * 75 * 4),
    width: 100,
    height: 75,
  })),
  putImageData: jest.fn(),
  drawImage: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  arc: jest.fn(),
  stroke: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  setTransform: jest.fn(),
  imageSmoothingEnabled: true,
  imageSmoothingQuality: 'high',
  strokeStyle: '',
  lineWidth: 1,
  setLineDash: jest.fn(),
  canvas: { width: 400, height: 300 },
};

HTMLCanvasElement.prototype.getContext = jest.fn(() => mockContext) as jest.Mock;

// Mock ResizeObserver
const mockResizeObserver = jest.fn();
mockResizeObserver.mockImplementation((callback) => ({
  observe: jest.fn(() => {
    callback([{ contentRect: { width: 400, height: 300 } }]);
  }),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
window.ResizeObserver = mockResizeObserver;

// Mock requestAnimationFrame
window.requestAnimationFrame = jest.fn((cb) => {
  cb(0);
  return 1;
});
window.cancelAnimationFrame = jest.fn();

const mockData: PostDataPoint[] = [
  { x: 0.2, y: 0.3, weight: 1 },
  { x: 0.5, y: 0.5, weight: 2 },
  { x: 0.8, y: 0.7, weight: 1.5 },
  { x: 0.3, y: 0.6, weight: 1 },
  { x: 0.6, y: 0.4, weight: 1 },
];

const renderWithTheme = (component: React.ReactNode) =>
  render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);

describe('PostDensityMap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with correct dimensions', () => {
    renderWithTheme(
      <PostDensityMap
        data={mockData}
        width={400}
        height={300}
      />
    );

    // Container should have correct dimensions
    const container = document.querySelector('[style*="width: 400px"]');
    expect(container).toBeInTheDocument();
  });

  it('has accessibility label', () => {
    renderWithTheme(
      <PostDensityMap
        data={mockData}
        width={400}
        height={300}
        ariaLabel="Custom heatmap label"
      />
    );

    expect(screen.getByLabelText('Custom heatmap label')).toBeInTheDocument();
  });

  it('renders axis labels when provided', () => {
    renderWithTheme(
      <PostDensityMap
        data={mockData}
        width={400}
        height={300}
        xLabel="Time"
        yLabel="Engagement"
      />
    );

    expect(screen.getByText('Time')).toBeInTheDocument();
    expect(screen.getByText('Engagement')).toBeInTheDocument();
  });

  it('handles empty data array', () => {
    renderWithTheme(
      <PostDensityMap
        data={[]}
        width={400}
        height={300}
      />
    );

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('accepts custom radius', () => {
    renderWithTheme(
      <PostDensityMap
        data={mockData}
        width={400}
        height={300}
        radius={30}
      />
    );

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('accepts custom color stops', () => {
    const customStops = [
      { offset: 0, color: 'rgba(0, 0, 0, 0)' },
      { offset: 1, color: 'rgba(255, 0, 0, 1)' },
    ];

    renderWithTheme(
      <PostDensityMap
        data={mockData}
        width={400}
        height={300}
        colorStops={customStops}
      />
    );

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('shows grid when showGrid is true', () => {
    renderWithTheme(
      <PostDensityMap
        data={mockData}
        width={400}
        height={300}
        showGrid={true}
        gridSize={50}
      />
    );

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('exposes imperative methods via ref', () => {
    const ref = React.createRef<PostDensityMapRef>();

    renderWithTheme(
      <PostDensityMap
        ref={ref}
        data={mockData}
        width={400}
        height={300}
      />
    );

    expect(ref.current).not.toBeNull();
    expect(typeof ref.current?.redraw).toBe('function');
    expect(typeof ref.current?.getPointsInRegion).toBe('function');
    expect(typeof ref.current?.highlightRegion).toBe('function');
    expect(typeof ref.current?.clearHighlight).toBe('function');
  });

  it('getPointsInRegion returns matching points', () => {
    const ref = React.createRef<PostDensityMapRef>();

    renderWithTheme(
      <PostDensityMap
        ref={ref}
        data={mockData}
        width={400}
        height={300}
      />
    );

    // Get points near center (0.5, 0.5)
    const points = ref.current?.getPointsInRegion(200, 150, 100);
    expect(points).toBeDefined();
    expect(Array.isArray(points)).toBe(true);
  });

  it('calls onRegionClick when clicked', () => {
    const onRegionClick = jest.fn();

    renderWithTheme(
      <PostDensityMap
        data={mockData}
        width={400}
        height={300}
        onRegionClick={onRegionClick}
      />
    );

    const canvas = screen.getByRole('img');

    // Mock getBoundingClientRect
    jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 400,
      height: 300,
      right: 400,
      bottom: 300,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.click(canvas, { clientX: 200, clientY: 150 });

    expect(onRegionClick).toHaveBeenCalled();
  });

  it('calls onRegionHover when mouse moves', () => {
    const onRegionHover = jest.fn();

    renderWithTheme(
      <PostDensityMap
        data={mockData}
        width={400}
        height={300}
        onRegionHover={onRegionHover}
      />
    );

    const canvas = screen.getByRole('img');

    jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 400,
      height: 300,
      right: 400,
      bottom: 300,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.mouseMove(canvas, { clientX: 200, clientY: 150 });

    expect(onRegionHover).toHaveBeenCalled();
  });

  it('handles large datasets efficiently', () => {
    // Generate 10k points
    const largeData: PostDataPoint[] = Array.from({ length: 10000 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      weight: Math.random(),
      id: `point-${i}`,
    }));

    const startTime = performance.now();

    renderWithTheme(
      <PostDensityMap
        data={largeData}
        width={800}
        height={600}
      />
    );

    const endTime = performance.now();

    // Should render within reasonable time (< 1 second)
    expect(endTime - startTime).toBeLessThan(1000);
  });

  it('accepts maxIntensity prop', () => {
    renderWithTheme(
      <PostDensityMap
        data={mockData}
        width={400}
        height={300}
        maxIntensity={10}
      />
    );

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });
});
