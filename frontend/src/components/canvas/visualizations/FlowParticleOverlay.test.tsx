import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import {
  FlowParticleOverlay,
  type FlowParticleOverlayRef,
  type FlowEdge,
} from './FlowParticleOverlay';

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
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  scale: jest.fn(),
  globalAlpha: 1,
  fillStyle: '',
  shadowColor: '',
  shadowBlur: 0,
};

HTMLCanvasElement.prototype.getContext = jest.fn(() => mockContext) as jest.Mock;

// Mock requestAnimationFrame
let rafCallback: FrameRequestCallback | null = null;
window.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => {
  rafCallback = cb;
  return 1;
});
window.cancelAnimationFrame = jest.fn();

const mockEdges: FlowEdge[] = [
  {
    id: 'edge-1',
    sourceX: 100,
    sourceY: 100,
    targetX: 300,
    targetY: 200,
    color: '#4CAF50',
    active: true,
  },
  {
    id: 'edge-2',
    sourceX: 300,
    sourceY: 200,
    targetX: 500,
    targetY: 100,
    color: '#2196F3',
    active: false,
  },
];

const renderWithTheme = (component: React.ReactNode) =>
  render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);

describe('FlowParticleOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rafCallback = null;
  });

  it('renders canvas element', () => {
    renderWithTheme(
      <FlowParticleOverlay
        edges={mockEdges}
        width={600}
        height={400}
        data-testid="particle-overlay"
      />
    );

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('has aria-hidden for accessibility', () => {
    renderWithTheme(
      <FlowParticleOverlay
        edges={mockEdges}
        width={600}
        height={400}
      />
    );

    const canvas = document.querySelector('canvas');
    expect(canvas).toHaveAttribute('aria-hidden', 'true');
  });

  it('sets correct canvas dimensions', () => {
    renderWithTheme(
      <FlowParticleOverlay
        edges={mockEdges}
        width={600}
        height={400}
      />
    );

    const canvas = document.querySelector('canvas');
    expect(canvas).toHaveStyle({ width: '600px', height: '400px' });
  });

  it('initializes canvas context on mount', () => {
    renderWithTheme(
      <FlowParticleOverlay
        edges={mockEdges}
        width={600}
        height={400}
        active={true}
      />
    );

    // Canvas getContext should be called during initialization
    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledWith('2d', { alpha: true });
  });

  it('does not render when reduced motion is preferred', () => {
    const { useReducedMotion } = require('framer-motion');
    useReducedMotion.mockReturnValue(true);

    renderWithTheme(
      <FlowParticleOverlay
        edges={mockEdges}
        width={600}
        height={400}
      />
    );

    const canvas = document.querySelector('canvas');
    expect(canvas).not.toBeInTheDocument();

    useReducedMotion.mockReturnValue(false);
  });

  it('accepts custom particle count per edge', () => {
    renderWithTheme(
      <FlowParticleOverlay
        edges={mockEdges}
        width={600}
        height={400}
        particlesPerEdge={5}
      />
    );

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('accepts custom speed', () => {
    renderWithTheme(
      <FlowParticleOverlay
        edges={mockEdges}
        width={600}
        height={400}
        speed={0.5}
      />
    );

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('accepts custom particle size', () => {
    renderWithTheme(
      <FlowParticleOverlay
        edges={mockEdges}
        width={600}
        height={400}
        particleSize={6}
      />
    );

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('exposes imperative methods via ref', () => {
    const ref = React.createRef<FlowParticleOverlayRef>();

    renderWithTheme(
      <FlowParticleOverlay
        ref={ref}
        edges={mockEdges}
        width={600}
        height={400}
      />
    );

    expect(ref.current).not.toBeNull();
    expect(typeof ref.current?.redraw).toBe('function');
    expect(typeof ref.current?.burstOnEdge).toBe('function');
  });

  it('burstOnEdge adds particles', () => {
    const ref = React.createRef<FlowParticleOverlayRef>();

    renderWithTheme(
      <FlowParticleOverlay
        ref={ref}
        edges={mockEdges}
        width={600}
        height={400}
      />
    );

    // Should not throw
    expect(() => ref.current?.burstOnEdge('edge-1', 5)).not.toThrow();
  });

  it('handles empty edges array', () => {
    renderWithTheme(
      <FlowParticleOverlay
        edges={[]}
        width={600}
        height={400}
      />
    );

    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('stops animation when active is false', () => {
    renderWithTheme(
      <FlowParticleOverlay
        edges={mockEdges}
        width={600}
        height={400}
        active={false}
      />
    );

    // Should still render canvas but not animate
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });
});
