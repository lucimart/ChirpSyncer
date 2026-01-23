import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { ConfettiCelebration } from './ConfettiCelebration';

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
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  fillRect: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  setTransform: jest.fn(),
  globalAlpha: 1,
  fillStyle: '',
  canvas: { width: 1024, height: 768 },
};

HTMLCanvasElement.prototype.getContext = jest.fn(() => mockContext) as jest.Mock;

// Mock ResizeObserver
const mockResizeObserver = jest.fn();
mockResizeObserver.mockImplementation((callback) => ({
  observe: jest.fn(() => {
    callback([{ contentRect: { width: 1024, height: 768 } }]);
  }),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
window.ResizeObserver = mockResizeObserver;

// Mock requestAnimationFrame
let animationFrameId = 0;
const rafCallbacks: Map<number, FrameRequestCallback> = new Map();

window.requestAnimationFrame = jest.fn((cb: FrameRequestCallback) => {
  const id = ++animationFrameId;
  rafCallbacks.set(id, cb);
  return id;
});

window.cancelAnimationFrame = jest.fn((id: number) => {
  rafCallbacks.delete(id);
});

// Helper to advance animation frames
const advanceFrames = (count: number, deltaMs: number = 16.67) => {
  let currentTime = 0;
  for (let i = 0; i < count; i++) {
    currentTime += deltaMs;
    rafCallbacks.forEach((cb) => cb(currentTime));
  }
};

const renderWithTheme = (component: React.ReactNode) =>
  render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);

describe('ConfettiCelebration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    animationFrameId = 0;
    rafCallbacks.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not render when not active', () => {
    renderWithTheme(
      <ConfettiCelebration active={false} data-testid="confetti" />
    );

    expect(screen.queryByTestId('confetti')).not.toBeInTheDocument();
  });

  it('renders when active', () => {
    renderWithTheme(
      <ConfettiCelebration active={true} data-testid="confetti" />
    );

    expect(screen.getByTestId('confetti')).toBeInTheDocument();
  });

  it('has aria-hidden for accessibility', () => {
    renderWithTheme(
      <ConfettiCelebration active={true} data-testid="confetti" />
    );

    expect(screen.getByTestId('confetti')).toHaveAttribute('aria-hidden', 'true');
  });

  it('calls onComplete after duration', async () => {
    const onComplete = jest.fn();

    renderWithTheme(
      <ConfettiCelebration
        active={true}
        duration={1000}
        onComplete={onComplete}
      />
    );

    // Advance timers past duration
    act(() => {
      jest.advanceTimersByTime(1100);
    });

    expect(onComplete).toHaveBeenCalled();
  });

  it('uses default duration of 3000ms', async () => {
    const onComplete = jest.fn();

    renderWithTheme(
      <ConfettiCelebration
        active={true}
        onComplete={onComplete}
      />
    );

    // Should not complete before 3000ms
    act(() => {
      jest.advanceTimersByTime(2500);
    });
    expect(onComplete).not.toHaveBeenCalled();

    // Should complete after 3000ms
    act(() => {
      jest.advanceTimersByTime(600);
    });
    expect(onComplete).toHaveBeenCalled();
  });

  it('accepts custom colors', () => {
    const customColors = ['#FF0000', '#00FF00', '#0000FF'];

    renderWithTheme(
      <ConfettiCelebration
        active={true}
        colors={customColors}
        data-testid="confetti"
      />
    );

    // Component should render without error
    expect(screen.getByTestId('confetti')).toBeInTheDocument();
  });

  it('accepts custom z-index', () => {
    renderWithTheme(
      <ConfettiCelebration
        active={true}
        zIndex={9999}
        data-testid="confetti"
      />
    );

    const overlay = screen.getByTestId('confetti');
    expect(overlay).toHaveStyle({ zIndex: 9999 });
  });

  describe('origin positions', () => {
    it('accepts center origin', () => {
      renderWithTheme(
        <ConfettiCelebration active={true} origin="center" data-testid="confetti" />
      );
      expect(screen.getByTestId('confetti')).toBeInTheDocument();
    });

    it('accepts center-top origin', () => {
      renderWithTheme(
        <ConfettiCelebration active={true} origin="center-top" data-testid="confetti" />
      );
      expect(screen.getByTestId('confetti')).toBeInTheDocument();
    });

    it('accepts left origin', () => {
      renderWithTheme(
        <ConfettiCelebration active={true} origin="left" data-testid="confetti" />
      );
      expect(screen.getByTestId('confetti')).toBeInTheDocument();
    });

    it('accepts right origin', () => {
      renderWithTheme(
        <ConfettiCelebration active={true} origin="right" data-testid="confetti" />
      );
      expect(screen.getByTestId('confetti')).toBeInTheDocument();
    });

    it('accepts custom origin coordinates', () => {
      renderWithTheme(
        <ConfettiCelebration
          active={true}
          origin={{ x: 100, y: 200 }}
          data-testid="confetti"
        />
      );
      expect(screen.getByTestId('confetti')).toBeInTheDocument();
    });
  });

  describe('spread patterns', () => {
    it('accepts burst spread', () => {
      renderWithTheme(
        <ConfettiCelebration active={true} spread="burst" data-testid="confetti" />
      );
      expect(screen.getByTestId('confetti')).toBeInTheDocument();
    });

    it('accepts fountain spread', () => {
      renderWithTheme(
        <ConfettiCelebration active={true} spread="fountain" data-testid="confetti" />
      );
      expect(screen.getByTestId('confetti')).toBeInTheDocument();
    });

    it('accepts cannon spread', () => {
      renderWithTheme(
        <ConfettiCelebration active={true} spread="cannon" data-testid="confetti" />
      );
      expect(screen.getByTestId('confetti')).toBeInTheDocument();
    });
  });
});

describe('ConfettiCelebration with reduced motion', () => {
  it('does not render when reduced motion is preferred', () => {
    const { useReducedMotion } = require('framer-motion');
    useReducedMotion.mockReturnValue(true);

    renderWithTheme(
      <ConfettiCelebration active={true} data-testid="confetti" />
    );

    expect(screen.queryByTestId('confetti')).not.toBeInTheDocument();

    useReducedMotion.mockReturnValue(false);
  });
});
