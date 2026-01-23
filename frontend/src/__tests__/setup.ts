import '@testing-library/jest-dom';
import React from 'react';

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

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
  mockWebSocketInstances.length = 0; // Clear WebSocket instances
});
