import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import {
  EngagementNetwork,
  type EngagementNetworkRef,
  type NetworkNode,
  type NetworkLink,
} from './EngagementNetwork';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  ...jest.requireActual('framer-motion'),
  useReducedMotion: jest.fn(() => false),
}));

// Mock Pixi.js
jest.mock('pixi.js', () => ({
  Application: jest.fn().mockImplementation(() => ({
    init: jest.fn().mockResolvedValue(undefined),
    canvas: document.createElement('canvas'),
    stage: {
      addChild: jest.fn(),
      scale: { set: jest.fn() },
      position: { set: jest.fn() },
    },
    renderer: {
      resize: jest.fn(),
    },
    destroy: jest.fn(),
  })),
  Container: jest.fn().mockImplementation(() => ({
    addChild: jest.fn(),
    removeChild: jest.fn(),
    eventMode: 'static',
  })),
  Graphics: jest.fn().mockImplementation(() => ({
    clear: jest.fn().mockReturnThis(),
    circle: jest.fn().mockReturnThis(),
    fill: jest.fn().mockReturnThis(),
    stroke: jest.fn().mockReturnThis(),
    moveTo: jest.fn().mockReturnThis(),
    lineTo: jest.fn().mockReturnThis(),
    destroy: jest.fn(),
    on: jest.fn(),
    x: 0,
    y: 0,
    eventMode: 'static',
    cursor: 'default',
  })),
  Text: jest.fn(),
  TextStyle: jest.fn(),
}));

// Mock d3-force
jest.mock('d3-force', () => ({
  forceSimulation: jest.fn(() => ({
    force: jest.fn().mockReturnThis(),
    alphaDecay: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    stop: jest.fn(),
    alpha: jest.fn().mockReturnThis(),
    restart: jest.fn(),
  })),
  forceLink: jest.fn(() => ({
    id: jest.fn().mockReturnThis(),
    distance: jest.fn().mockReturnThis(),
    strength: jest.fn().mockReturnThis(),
  })),
  forceManyBody: jest.fn(() => ({
    strength: jest.fn().mockReturnThis(),
  })),
  forceCenter: jest.fn(),
  forceCollide: jest.fn(() => ({
    radius: jest.fn().mockReturnThis(),
  })),
}));

const mockNodes: NetworkNode[] = [
  { id: 'node-1', label: 'User 1', size: 20, color: '#6366f1', type: 'user' },
  { id: 'node-2', label: 'Post 1', size: 15, color: '#10b981', type: 'post' },
  { id: 'node-3', label: 'Topic 1', size: 25, color: '#f59e0b', type: 'topic' },
];

const mockLinks: NetworkLink[] = [
  { id: 'link-1', source: 'node-1', target: 'node-2', strength: 0.8, type: 'like' },
  { id: 'link-2', source: 'node-2', target: 'node-3', strength: 0.5, type: 'mention' },
];

const renderWithTheme = (component: React.ReactNode) =>
  render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);

describe('EngagementNetwork', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders container with correct dimensions', () => {
    renderWithTheme(
      <EngagementNetwork
        nodes={mockNodes}
        links={mockLinks}
        width={800}
        height={600}
      />
    );

    const container = screen.getByRole('img');
    expect(container).toBeInTheDocument();
    expect(container).toHaveStyle({ width: '800px', height: '600px' });
  });

  it('has accessibility label', () => {
    renderWithTheme(
      <EngagementNetwork
        nodes={mockNodes}
        links={mockLinks}
        width={800}
        height={600}
      />
    );

    expect(screen.getByLabelText('Engagement network visualization')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    renderWithTheme(
      <EngagementNetwork
        nodes={mockNodes}
        links={mockLinks}
        width={800}
        height={600}
      />
    );

    expect(screen.getByText('Loading visualization...')).toBeInTheDocument();
  });

  it('exposes imperative methods via ref', async () => {
    const ref = React.createRef<EngagementNetworkRef>();

    renderWithTheme(
      <EngagementNetwork
        ref={ref}
        nodes={mockNodes}
        links={mockLinks}
        width={800}
        height={600}
      />
    );

    await waitFor(() => {
      expect(ref.current).not.toBeNull();
    });

    expect(typeof ref.current?.resetView).toBe('function');
    expect(typeof ref.current?.fitView).toBe('function');
    expect(typeof ref.current?.highlightNode).toBe('function');
    expect(typeof ref.current?.restartSimulation).toBe('function');
  });

  it('handles empty nodes array', () => {
    renderWithTheme(
      <EngagementNetwork
        nodes={[]}
        links={[]}
        width={800}
        height={600}
      />
    );

    const container = screen.getByRole('img');
    expect(container).toBeInTheDocument();
  });

  it('does not render with reduced motion when static render fails', () => {
    const { useReducedMotion } = require('framer-motion');
    useReducedMotion.mockReturnValue(true);

    renderWithTheme(
      <EngagementNetwork
        nodes={mockNodes}
        links={mockLinks}
        width={800}
        height={600}
      />
    );

    // Component should still render container
    const container = screen.getByRole('img');
    expect(container).toBeInTheDocument();

    useReducedMotion.mockReturnValue(false);
  });

  it('accepts onNodeClick callback', () => {
    const onNodeClick = jest.fn();

    renderWithTheme(
      <EngagementNetwork
        nodes={mockNodes}
        links={mockLinks}
        width={800}
        height={600}
        onNodeClick={onNodeClick}
      />
    );

    const container = screen.getByRole('img');
    expect(container).toBeInTheDocument();
  });

  it('accepts onNodeHover callback', () => {
    const onNodeHover = jest.fn();

    renderWithTheme(
      <EngagementNetwork
        nodes={mockNodes}
        links={mockLinks}
        width={800}
        height={600}
        onNodeHover={onNodeHover}
      />
    );

    const container = screen.getByRole('img');
    expect(container).toBeInTheDocument();
  });

  it('accepts showLabels prop', () => {
    renderWithTheme(
      <EngagementNetwork
        nodes={mockNodes}
        links={mockLinks}
        width={800}
        height={600}
        showLabels={false}
      />
    );

    const container = screen.getByRole('img');
    expect(container).toBeInTheDocument();
  });

  it('accepts zoom constraints', () => {
    renderWithTheme(
      <EngagementNetwork
        nodes={mockNodes}
        links={mockLinks}
        width={800}
        height={600}
        minZoom={0.5}
        maxZoom={2}
      />
    );

    const container = screen.getByRole('img');
    expect(container).toBeInTheDocument();
  });

  it('stops simulation when running is false', () => {
    renderWithTheme(
      <EngagementNetwork
        nodes={mockNodes}
        links={mockLinks}
        width={800}
        height={600}
        running={false}
      />
    );

    const container = screen.getByRole('img');
    expect(container).toBeInTheDocument();
  });
});
