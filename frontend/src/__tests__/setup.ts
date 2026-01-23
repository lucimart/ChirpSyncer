import '@testing-library/jest-dom';
import React from 'react';

// Mock HTMLCanvasElement.prototype.getContext for canvas-based components
const createMockCanvasContext = (): Partial<CanvasRenderingContext2D> => ({
  // State
  save: jest.fn(),
  restore: jest.fn(),

  // Transformations
  scale: jest.fn(),
  rotate: jest.fn(),
  translate: jest.fn(),
  transform: jest.fn(),
  setTransform: jest.fn(),
  resetTransform: jest.fn(),
  getTransform: jest.fn(() => new DOMMatrix()),

  // Compositing
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',

  // Image smoothing
  imageSmoothingEnabled: true,
  imageSmoothingQuality: 'low' as ImageSmoothingQuality,

  // Fill and stroke styles
  fillStyle: '#000000',
  strokeStyle: '#000000',

  // Shadows
  shadowBlur: 0,
  shadowColor: 'rgba(0, 0, 0, 0)',
  shadowOffsetX: 0,
  shadowOffsetY: 0,

  // Filters
  filter: 'none',

  // Rectangles
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  strokeRect: jest.fn(),

  // Paths
  beginPath: jest.fn(),
  closePath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  bezierCurveTo: jest.fn(),
  quadraticCurveTo: jest.fn(),
  arc: jest.fn(),
  arcTo: jest.fn(),
  ellipse: jest.fn(),
  rect: jest.fn(),
  roundRect: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  clip: jest.fn(),
  isPointInPath: jest.fn(() => false),
  isPointInStroke: jest.fn(() => false),

  // Drawing images
  drawImage: jest.fn(),

  // Pixel manipulation
  createImageData: jest.fn(() => ({
    width: 1,
    height: 1,
    data: new Uint8ClampedArray(4),
    colorSpace: 'srgb' as PredefinedColorSpace,
  })),
  getImageData: jest.fn(() => ({
    width: 1,
    height: 1,
    data: new Uint8ClampedArray(4),
    colorSpace: 'srgb' as PredefinedColorSpace,
  })),
  putImageData: jest.fn(),

  // Gradients and patterns
  createLinearGradient: jest.fn(() => ({
    addColorStop: jest.fn(),
  })),
  createRadialGradient: jest.fn(() => ({
    addColorStop: jest.fn(),
  })),
  createConicGradient: jest.fn(() => ({
    addColorStop: jest.fn(),
  })),
  createPattern: jest.fn(() => null),

  // Line styles
  lineWidth: 1,
  lineCap: 'butt' as CanvasLineCap,
  lineJoin: 'miter' as CanvasLineJoin,
  miterLimit: 10,
  lineDashOffset: 0,
  getLineDash: jest.fn(() => []),
  setLineDash: jest.fn(),

  // Text
  font: '10px sans-serif',
  textAlign: 'start' as CanvasTextAlign,
  textBaseline: 'alphabetic' as CanvasTextBaseline,
  direction: 'ltr' as CanvasDirection,
  fontKerning: 'auto' as CanvasFontKerning,
  fontStretch: 'normal' as CanvasFontStretch,
  fontVariantCaps: 'normal' as CanvasFontVariantCaps,
  textRendering: 'auto' as CanvasTextRendering,
  wordSpacing: '0px',
  letterSpacing: '0px',
  fillText: jest.fn(),
  strokeText: jest.fn(),
  measureText: jest.fn(() => ({
    width: 0,
    actualBoundingBoxAscent: 0,
    actualBoundingBoxDescent: 0,
    actualBoundingBoxLeft: 0,
    actualBoundingBoxRight: 0,
    fontBoundingBoxAscent: 0,
    fontBoundingBoxDescent: 0,
    emHeightAscent: 0,
    emHeightDescent: 0,
    hangingBaseline: 0,
    alphabeticBaseline: 0,
    ideographicBaseline: 0,
  })),

  // Path2D
  drawFocusIfNeeded: jest.fn(),

  // Canvas reference (will be set when getContext is called)
  canvas: null as unknown as HTMLCanvasElement,
});

// Store mock context for tests that need to access it
const mockCanvasContexts = new WeakMap<HTMLCanvasElement, ReturnType<typeof createMockCanvasContext>>();

HTMLCanvasElement.prototype.getContext = jest.fn(function(
  this: HTMLCanvasElement,
  contextId: string,
  _options?: unknown
) {
  if (contextId === '2d') {
    let ctx = mockCanvasContexts.get(this);
    if (!ctx) {
      ctx = createMockCanvasContext();
      // Set the canvas reference
      (ctx as { canvas: HTMLCanvasElement }).canvas = this;
      mockCanvasContexts.set(this, ctx);
    }
    return ctx;
  }
  // Return null for WebGL and other contexts (not supported in jsdom)
  return null;
}) as jest.Mock;

// Mock toDataURL and toBlob for canvas
HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,mock');
HTMLCanvasElement.prototype.toBlob = jest.fn((callback) => {
  callback(new Blob(['mock'], { type: 'image/png' }));
});

// Mock Nivo chart components globally
jest.mock('@nivo/bar', () => ({
  ResponsiveBar: function MockResponsiveBar({ data }: { data: unknown[] }) {
    return React.createElement('div', {
      'data-testid': 'nivo-bar-mock',
      'data-count': data?.length || 0,
    }, 'Bar Chart Mock');
  },
}));

jest.mock('@nivo/line', () => ({
  ResponsiveLine: function MockResponsiveLine({ data }: { data: unknown[] }) {
    return React.createElement('div', {
      'data-testid': 'nivo-line-mock',
      'data-count': data?.length || 0,
    }, 'Line Chart Mock');
  },
}));

jest.mock('@nivo/pie', () => ({
  ResponsivePie: function MockResponsivePie({ data }: { data: unknown[] }) {
    return React.createElement('div', {
      'data-testid': 'nivo-pie-mock',
      'data-count': data?.length || 0,
    }, 'Pie Chart Mock');
  },
}));

jest.mock('@nivo/heatmap', () => ({
  ResponsiveHeatMap: function MockResponsiveHeatMap({ data }: { data: unknown[] }) {
    return React.createElement('div', {
      'data-testid': 'nivo-heatmap-mock',
      'data-count': data?.length || 0,
    }, 'HeatMap Mock');
  },
}));

// Polyfill TextEncoder and TextDecoder for Jest environment
// Using require to ensure it's available before any module imports
const util = require('util');
global.TextEncoder = util.TextEncoder;
global.TextDecoder = util.TextDecoder;


// Mock WebSocket
const mockWebSocketInstances: any[] = [];

// Flag to disable auto-connect for specific tests
let disableAutoConnect = false;

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    mockWebSocketInstances.push(this);
    if (!disableAutoConnect) {
      setTimeout(() => {
        this.readyState = MockWebSocket.OPEN;
        this.onopen?.(new Event('open'));
      }, 0);
    }
  }

  send(data: string) {
    // Mock implementation
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  // Helper to simulate receiving messages
  simulateMessage(data: unknown) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
  }

  // Helper to manually trigger connection success
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }
}

// Store instances in a property accessible from tests
(MockWebSocket as any).__instances__ = mockWebSocketInstances;

// Export helpers to control auto-connect behavior
(MockWebSocket as any).__setAutoConnect__ = (enabled: boolean) => {
  disableAutoConnect = !enabled;
};

global.WebSocket = MockWebSocket as unknown as typeof WebSocket;
// Explicitly set on window for libraries checking window.WebSocket
Object.defineProperty(window, 'WebSocket', {
  value: MockWebSocket,
  writable: true
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver for components that use it (canvas, etc.)
class MockResizeObserver {
  private callback: ResizeObserverCallback;
  private observedElements: Set<Element> = new Set();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(element: Element) {
    this.observedElements.add(element);
    // Trigger initial resize callback with default dimensions
    const entry: ResizeObserverEntry = {
      target: element,
      contentRect: {
        x: 0,
        y: 0,
        width: 800,
        height: 600,
        top: 0,
        right: 800,
        bottom: 600,
        left: 0,
        toJSON: () => ({}),
      } as DOMRectReadOnly,
      borderBoxSize: [{ inlineSize: 800, blockSize: 600 }],
      contentBoxSize: [{ inlineSize: 800, blockSize: 600 }],
      devicePixelContentBoxSize: [{ inlineSize: 800, blockSize: 600 }],
    };
    // Use setTimeout to simulate async behavior
    setTimeout(() => this.callback([entry], this), 0);
  }

  unobserve(element: Element) {
    this.observedElements.delete(element);
  }

  disconnect() {
    this.observedElements.clear();
  }
}

global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Mock requestAnimationFrame and cancelAnimationFrame
let rafId = 0;
const rafCallbacks = new Map<number, FrameRequestCallback>();

global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback): number => {
  const id = ++rafId;
  rafCallbacks.set(id, callback);
  // Auto-trigger after a microtask to simulate animation frame
  Promise.resolve().then(() => {
    const cb = rafCallbacks.get(id);
    if (cb) {
      rafCallbacks.delete(id);
      cb(performance.now());
    }
  });
  return id;
});

global.cancelAnimationFrame = jest.fn((id: number): void => {
  rafCallbacks.delete(id);
});

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
  mockWebSocketInstances.length = 0; // Clear WebSocket instances
});
