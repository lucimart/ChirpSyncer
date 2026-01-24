/**
 * Transition Tokens - ChirpSyncer Design System
 * 
 * Animation durations, timing functions, and transition presets.
 */

// Durations
export const duration = {
  instant: '0ms',
  fast: '100ms',
  normal: '200ms',
  slow: '300ms',
  slower: '400ms',
  slowest: '500ms',
} as const;

// Timing functions (easing)
export const easing = {
  linear: 'linear',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  
  // Custom easings for specific animations
  bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  smooth: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
} as const;

// Transition presets (ready to use in CSS)
export const transition = {
  // Common transitions
  all: `all ${duration.normal} ${easing.easeInOut}`,
  allFast: `all ${duration.fast} ${easing.easeInOut}`,
  allSlow: `all ${duration.slow} ${easing.easeInOut}`,
  
  // Specific property transitions
  colors: `color ${duration.normal} ${easing.easeInOut}, background-color ${duration.normal} ${easing.easeInOut}, border-color ${duration.normal} ${easing.easeInOut}`,
  opacity: `opacity ${duration.normal} ${easing.easeInOut}`,
  transform: `transform ${duration.normal} ${easing.easeInOut}`,
  shadow: `box-shadow ${duration.normal} ${easing.easeInOut}`,
  
  // Component-specific
  button: `background-color ${duration.fast} ${easing.easeInOut}, border-color ${duration.fast} ${easing.easeInOut}, color ${duration.fast} ${easing.easeInOut}, box-shadow ${duration.fast} ${easing.easeInOut}`,
  input: `border-color ${duration.fast} ${easing.easeInOut}, box-shadow ${duration.fast} ${easing.easeInOut}`,
  card: `box-shadow ${duration.normal} ${easing.easeInOut}, transform ${duration.normal} ${easing.easeInOut}`,
  sidebar: `width ${duration.slow} ${easing.easeInOut}, transform ${duration.slow} ${easing.easeInOut}`,
  collapse: `height ${duration.normal} ${easing.easeInOut}, opacity ${duration.normal} ${easing.easeInOut}`,
  fade: `opacity ${duration.normal} ${easing.easeInOut}`,
  scale: `transform ${duration.fast} ${easing.easeOut}`,
  
  // Theme transition (for smooth dark/light switch)
  theme: `background-color ${duration.slow} ${easing.easeInOut}, color ${duration.slow} ${easing.easeInOut}, border-color ${duration.slow} ${easing.easeInOut}`,
} as const;

// Animation keyframes (for use with styled-components keyframes helper)
export const keyframeDefinitions = {
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  fadeOut: {
    from: { opacity: 1 },
    to: { opacity: 0 },
  },
  slideInFromRight: {
    from: { transform: 'translateX(100%)' },
    to: { transform: 'translateX(0)' },
  },
  slideInFromLeft: {
    from: { transform: 'translateX(-100%)' },
    to: { transform: 'translateX(0)' },
  },
  slideInFromTop: {
    from: { transform: 'translateY(-100%)' },
    to: { transform: 'translateY(0)' },
  },
  slideInFromBottom: {
    from: { transform: 'translateY(100%)' },
    to: { transform: 'translateY(0)' },
  },
  scaleIn: {
    from: { transform: 'scale(0.95)', opacity: 0 },
    to: { transform: 'scale(1)', opacity: 1 },
  },
  spin: {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },
  pulse: {
    '0%, 100%': { opacity: 1 },
    '50%': { opacity: 0.5 },
  },
} as const;
