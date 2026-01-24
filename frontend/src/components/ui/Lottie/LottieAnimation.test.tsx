import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { LottieAnimation } from './LottieAnimation';
import { SuccessAnimation } from './SuccessAnimation';
import { SyncCompleteAnimation } from './SyncCompleteAnimation';
import { EmptyStateAnimation } from './EmptyStateAnimation';

// Mock lottie-react
jest.mock('lottie-react', () => {
  return function MockLottie({ animationData, loop, autoplay, onComplete }: {
    animationData: object;
    loop: boolean;
    autoplay: boolean;
    onComplete?: () => void;
  }) {
    return (
      <div
        data-testid="lottie-player"
        data-loop={loop}
        data-autoplay={autoplay}
        onClick={onComplete}
      >
        Lottie Animation
      </div>
    );
  };
});

// Mock framer-motion's useReducedMotion
jest.mock('framer-motion', () => ({
  ...jest.requireActual('framer-motion'),
  useReducedMotion: jest.fn(() => false),
}));

const renderWithTheme = (component: React.ReactNode) =>
  render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);

describe('LottieAnimation', () => {
  it('renders with default props', () => {
    renderWithTheme(<LottieAnimation animation="success" />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('applies custom size', () => {
    renderWithTheme(<LottieAnimation animation="success" size={200} />);
    const container = screen.getByRole('img');
    expect(container).toHaveStyle({ width: '200px', height: '200px' });
  });

  it('renders with aria-label for accessibility', () => {
    renderWithTheme(<LottieAnimation animation="success" ariaLabel="Success animation" />);
    expect(screen.getByLabelText('Success animation')).toBeInTheDocument();
  });

  it('accepts custom animation data object', () => {
    const customAnimation = { v: '5.7.4', fr: 60, ip: 0, op: 60, w: 100, h: 100, layers: [] };
    renderWithTheme(<LottieAnimation animation={customAnimation} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  describe('animation types', () => {
    const animationTypes = [
      'success',
      'error',
      'warning',
      'loading',
      'empty',
      'sync-complete',
      'confetti',
      'search-empty',
      'no-data',
      'upload',
      'notification',
    ] as const;

    animationTypes.forEach((type) => {
      it(`renders ${type} animation type`, () => {
        renderWithTheme(<LottieAnimation animation={type} />);
        expect(screen.getByRole('img')).toBeInTheDocument();
      });
    });
  });
});

describe('SuccessAnimation', () => {
  it('renders success checkmark animation', () => {
    renderWithTheme(<SuccessAnimation />);
    expect(screen.getByLabelText('Success')).toBeInTheDocument();
  });

  it('applies custom size', () => {
    renderWithTheme(<SuccessAnimation size={80} />);
    const container = screen.getByRole('img');
    expect(container).toHaveStyle({ width: '80px', height: '80px' });
  });

  it('triggers onComplete callback', async () => {
    const onComplete = jest.fn();
    renderWithTheme(<SuccessAnimation onComplete={onComplete} />);

    // Click the mock to trigger onComplete
    const lottie = screen.getByTestId('lottie-player');
    lottie.click();

    expect(onComplete).toHaveBeenCalled();
  });
});

describe('SyncCompleteAnimation', () => {
  it('renders sync complete animation', () => {
    renderWithTheme(<SyncCompleteAnimation />);
    expect(screen.getByLabelText('Sync complete')).toBeInTheDocument();
  });

  it('has default size of 80px', () => {
    renderWithTheme(<SyncCompleteAnimation />);
    const container = screen.getByRole('img');
    expect(container).toHaveStyle({ width: '80px', height: '80px' });
  });
});

describe('EmptyStateAnimation', () => {
  it('renders default empty state animation', () => {
    renderWithTheme(<EmptyStateAnimation />);
    expect(screen.getByLabelText('Empty default state')).toBeInTheDocument();
  });

  it('has default size of 120px', () => {
    renderWithTheme(<EmptyStateAnimation />);
    const container = screen.getByRole('img');
    expect(container).toHaveStyle({ width: '120px', height: '120px' });
  });

  describe('variants', () => {
    const variants = ['default', 'search', 'inbox', 'data', 'notifications', 'folder'] as const;

    variants.forEach((variant) => {
      it(`renders ${variant} variant`, () => {
        renderWithTheme(<EmptyStateAnimation variant={variant} />);
        expect(screen.getByLabelText(`Empty ${variant} state`)).toBeInTheDocument();
      });
    });
  });

  it('loops by default', () => {
    renderWithTheme(<EmptyStateAnimation />);
    const lottie = screen.getByTestId('lottie-player');
    expect(lottie).toHaveAttribute('data-loop', 'true');
  });
});

describe('Accessibility', () => {
  it('shows fallback for reduced motion preference', async () => {
    const { useReducedMotion } = require('framer-motion');
    useReducedMotion.mockReturnValue(true);

    renderWithTheme(<LottieAnimation animation="success" />);

    // Should show static fallback icon
    expect(screen.getByText('✓')).toBeInTheDocument();

    useReducedMotion.mockReturnValue(false);
  });
});
