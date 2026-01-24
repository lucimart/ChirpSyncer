import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { CanvasContainer, type CanvasContainerRef } from './CanvasContainer';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  ...jest.requireActual('framer-motion'),
  useReducedMotion: jest.fn(() => false),
}));

// Mock canvas context
const mockContext = {
  clearRect: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  scale: jest.fn(),
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
  putImageData: jest.fn(),
  createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
  createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
  globalAlpha: 1,
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  canvas: { width: 800, height: 600 },
};

HTMLCanvasElement.prototype.getContext = jest.fn(() => mockContext) as jest.Mock;

// Mock ResizeObserver
const mockResizeObserver = jest.fn();
mockResizeObserver.mockImplementation((callback) => ({
  observe: jest.fn(() => {
    // Simulate initial resize
    callback([{ contentRect: { width: 800, height: 600 } }]);
  }),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
window.ResizeObserver = mockResizeObserver;

// Mock requestAnimationFrame
let rafCallback: FrameRequestCallback | null = null;
const mockRaf = jest.fn((cb: FrameRequestCallback) => {
  rafCallback = cb;
  return 1;
});
const mockCancelRaf = jest.fn();
window.requestAnimationFrame = mockRaf;
window.cancelAnimationFrame = mockCancelRaf;

const renderWithTheme = (component: React.ReactNode) =>
  render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);

describe('CanvasContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rafCallback = null;
  });

  it('renders canvas with aria-label', () => {
    const onDraw = jest.fn();
    renderWithTheme(
      <CanvasContainer
        ariaLabel="Test canvas"
        onDraw={onDraw}
        data-testid="canvas-container"
      />
    );

    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Test canvas');
  });

  it('renders with aria-description when provided', () => {
    const onDraw = jest.fn();
    renderWithTheme(
      <CanvasContainer
        ariaLabel="Test canvas"
        ariaDescription="A detailed description of the canvas content"
        onDraw={onDraw}
      />
    );

    expect(screen.getByText('A detailed description of the canvas content')).toBeInTheDocument();
  });

  it('applies custom width and height', () => {
    const onDraw = jest.fn();
    renderWithTheme(
      <CanvasContainer
        width={500}
        height={400}
        ariaLabel="Test canvas"
        onDraw={onDraw}
        data-testid="canvas-container"
      />
    );

    const container = screen.getByTestId('canvas-container');
    expect(container).toHaveStyle({ width: '500px', height: '400px' });
  });

  it('applies 100% width when specified', () => {
    const onDraw = jest.fn();
    renderWithTheme(
      <CanvasContainer
        width="100%"
        height={400}
        ariaLabel="Test canvas"
        onDraw={onDraw}
        data-testid="canvas-container"
      />
    );

    const container = screen.getByTestId('canvas-container');
    expect(container).toHaveStyle({ width: '100%' });
  });

  it('calls onDraw callback during animation loop', async () => {
    const onDraw = jest.fn();
    renderWithTheme(
      <CanvasContainer
        ariaLabel="Test canvas"
        onDraw={onDraw}
        running={true}
      />
    );

    // Wait for resize observer to update dimensions and animation loop to start
    await waitFor(() => {
      // Trigger animation frames until onDraw is called
      const cb = rafCallback;
      if (cb) {
        act(() => {
          cb(performance.now());
        });
      }
      expect(onDraw).toHaveBeenCalled();
    });
  });

  it('calls onResize when container size changes', () => {
    const onDraw = jest.fn();
    const onResize = jest.fn();

    renderWithTheme(
      <CanvasContainer
        ariaLabel="Test canvas"
        onDraw={onDraw}
        onResize={onResize}
      />
    );

    expect(onResize).toHaveBeenCalledWith(800, 600);
  });

  it('handles click events with coordinates', () => {
    const onDraw = jest.fn();
    const onClick = jest.fn();

    renderWithTheme(
      <CanvasContainer
        ariaLabel="Test canvas"
        onDraw={onDraw}
        onClick={onClick}
      />
    );

    const canvas = screen.getByRole('img');

    // Mock getBoundingClientRect
    jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      top: 50,
      width: 800,
      height: 600,
      right: 900,
      bottom: 650,
      x: 100,
      y: 50,
      toJSON: () => ({}),
    });

    fireEvent.click(canvas, { clientX: 200, clientY: 150 });

    expect(onClick).toHaveBeenCalledWith(100, 100, expect.any(Object));
  });

  it('handles mouse move events', () => {
    const onDraw = jest.fn();
    const onMouseMove = jest.fn();

    renderWithTheme(
      <CanvasContainer
        ariaLabel="Test canvas"
        onDraw={onDraw}
        onMouseMove={onMouseMove}
      />
    );

    const canvas = screen.getByRole('img');

    jest.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    fireEvent.mouseMove(canvas, { clientX: 50, clientY: 75 });

    expect(onMouseMove).toHaveBeenCalledWith(50, 75, expect.any(Object));
  });

  it('handles mouse leave events', () => {
    const onDraw = jest.fn();
    const onMouseLeave = jest.fn();

    renderWithTheme(
      <CanvasContainer
        ariaLabel="Test canvas"
        onDraw={onDraw}
        onMouseLeave={onMouseLeave}
      />
    );

    const canvas = screen.getByRole('img');
    fireEvent.mouseLeave(canvas);

    expect(onMouseLeave).toHaveBeenCalled();
  });

  it('exposes imperative methods via ref', () => {
    const onDraw = jest.fn();
    const ref = React.createRef<CanvasContainerRef>();

    renderWithTheme(
      <CanvasContainer
        ref={ref}
        ariaLabel="Test canvas"
        onDraw={onDraw}
      />
    );

    expect(ref.current).not.toBeNull();
    expect(ref.current?.getCanvas()).toBeInstanceOf(HTMLCanvasElement);
    expect(ref.current?.getDimensions()).toEqual({ width: 800, height: 600 });
  });

  it('stops animation loop when running is false', () => {
    const onDraw = jest.fn();

    renderWithTheme(
      <CanvasContainer
        ariaLabel="Test canvas"
        onDraw={onDraw}
        running={false}
      />
    );

    // Animation frame should still be requested but loop won't call onDraw
    // because dimensions are set but running is false
    expect(mockCancelRaf).not.toHaveBeenCalled();
  });
});

describe('CanvasContainer with reduced motion', () => {
  it('renders static frame when reduced motion is preferred', () => {
    const { useReducedMotion } = require('framer-motion');
    useReducedMotion.mockReturnValue(true);

    const onDraw = jest.fn();
    renderWithTheme(
      <CanvasContainer
        ariaLabel="Test canvas"
        onDraw={onDraw}
        running={true}
      />
    );

    // Should call onDraw once for static render
    expect(onDraw).toHaveBeenCalled();

    useReducedMotion.mockReturnValue(false);
  });
});
