/**
 * Shadow Tokens - ChirpSyncer Design System
 * 
 * Elevation system using box-shadows.
 * Separate values for light and dark themes.
 */

// Light theme shadows
export const shadows = {
  none: 'none',
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  
  // Focus rings
  focusRing: '0 0 0 2px rgb(59 130 246 / 0.5)',
  focusRingError: '0 0 0 2px rgb(239 68 68 / 0.5)',
  focusRingSuccess: '0 0 0 2px rgb(34 197 94 / 0.5)',
} as const;

// Dark theme shadows (more subtle, darker)
export const shadowsDark = {
  none: 'none',
  xs: '0 1px 2px 0 rgb(0 0 0 / 0.2)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.4)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.6), 0 8px 10px -6px rgb(0 0 0 / 0.5)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.7)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.2)',
  
  // Focus rings (same as light, good contrast on dark)
  focusRing: '0 0 0 2px rgb(96 165 250 / 0.5)',
  focusRingError: '0 0 0 2px rgb(248 113 113 / 0.5)',
  focusRingSuccess: '0 0 0 2px rgb(74 222 128 / 0.5)',
} as const;

// Semantic shadow mapping
export const elevation = {
  // Cards and surfaces
  card: shadows.sm,
  cardHover: shadows.md,
  cardDark: shadowsDark.sm,
  cardHoverDark: shadowsDark.md,
  
  // Dropdowns and popovers
  dropdown: shadows.lg,
  dropdownDark: shadowsDark.lg,
  
  // Modals
  modal: shadows.xl,
  modalDark: shadowsDark.xl,
  
  // Tooltips
  tooltip: shadows.md,
  tooltipDark: shadowsDark.md,
  
  // Sticky elements (headers, sidebars)
  sticky: shadows.sm,
  stickyDark: shadowsDark.sm,
} as const;
