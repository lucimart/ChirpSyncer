/**
 * Theme Configuration - Swoop Design System
 *
 * This file re-exports the new token-based theme system
 * while maintaining backward compatibility with existing components.
 *
 * MIGRATION: Components should gradually migrate to using
 * tokens directly from './tokens' or theme from ThemeContext.
 */

import { lightTheme, darkTheme, colors, type Theme } from './tokens/colors';
import { spacing, layout, breakpoints } from './tokens/spacing';
import { fontSize, fontWeight } from './tokens/typography';
import { shadows, shadowsDark } from './tokens/shadows';
import { radii } from './tokens/radii';
import { transition } from './tokens/transitions';

// Legacy theme structure for backward compatibility
// This maps the old theme structure to new tokens
export const theme = {
  mode: 'light' as const,
  colors: {
    // Primary - Swoop Purple (mapped from new tokens)
    primary: colors.purple,
    // Secondary - Swoop Mint
    secondary: colors.mint,
    // Accent - Swoop Orange
    accent: colors.orange,
    // Neutral - Gray scale (mapped from new tokens)
    neutral: colors.slate,
    // Success - Green
    success: {
      50: colors.green[50],
      100: colors.green[100],
      200: colors.green[200],
      500: colors.green[500],
      600: colors.green[600],
      700: colors.green[700],
      800: colors.green[800],
      900: colors.green[900],
    },
    // Warning - Amber
    warning: {
      50: colors.yellow[50],
      100: colors.yellow[100],
      200: colors.yellow[200],
      500: colors.yellow[500],
      600: colors.yellow[600],
      700: colors.yellow[700],
      800: colors.yellow[800],
      900: colors.yellow[900],
    },
    // Danger - Red
    danger: {
      50: colors.red[50],
      100: colors.red[100],
      200: colors.red[200],
      500: colors.red[500],
      600: colors.red[600],
      700: colors.red[700],
      800: colors.red[800],
      900: colors.red[900],
    },
    // Background (light theme defaults for legacy)
    background: {
      primary: lightTheme.bg.secondary,
      secondary: lightTheme.bg.primary,
      tertiary: lightTheme.bg.tertiary,
    },
    // Text
    text: {
      primary: lightTheme.text.primary,
      secondary: lightTheme.text.secondary,
      tertiary: lightTheme.text.tertiary,
      inverse: lightTheme.text.inverse,
    },
    // Borders
    border: {
      light: lightTheme.border.light,
      default: lightTheme.border.medium,
      dark: lightTheme.border.heavy,
    },
    // Semantic surface colors for badges, alerts, etc. (light mode defaults)
    surface: {
      primary: { bg: colors.purple[50], text: colors.purple[800], border: colors.purple[200] },
      success: { bg: colors.mint[50], text: colors.mint[800], border: colors.mint[200] },
      warning: { bg: colors.orange[50], text: colors.orange[800], border: colors.orange[200] },
      danger: { bg: colors.red[50], text: colors.red[800], border: colors.red[200] },
      info: { bg: colors.purple[50], text: colors.purple[800], border: colors.purple[200] },
      neutral: { bg: colors.slate[100], text: colors.slate[800], border: colors.slate[200] },
      primarySubtle: { bg: colors.purple[100], text: colors.purple[800], border: colors.purple[200] },
      successSubtle: { bg: colors.mint[100], text: colors.mint[800], border: colors.mint[200] },
      warningSubtle: { bg: colors.orange[100], text: colors.orange[800], border: colors.orange[200] },
      dangerSubtle: { bg: colors.red[100], text: colors.red[800], border: colors.red[200] },
    },
  },
  spacing: {
    0: spacing[0],
    1: spacing[1],
    2: spacing[2],
    3: spacing[3],
    4: spacing[4],
    5: spacing[5],
    6: spacing[6],
    8: spacing[8],
    10: spacing[10],
    12: spacing[12],
    16: spacing[16],
    20: spacing[20],
    24: spacing[24],
  },
  borderRadius: {
    none: radii.none,
    sm: radii.sm,
    default: radii.md,
    md: radii.md,
    lg: radii.lg,
    xl: radii.xl,
    full: radii.full,
  },
  fontSizes: {
    xs: fontSize.xs,
    sm: fontSize.sm,
    base: fontSize.base,
    lg: fontSize.lg,
    xl: fontSize.xl,
    '2xl': fontSize['2xl'],
    '3xl': fontSize['3xl'],
    '4xl': fontSize['4xl'],
  },
  fontWeights: {
    normal: fontWeight.normal,
    medium: fontWeight.medium,
    semibold: fontWeight.semibold,
    bold: fontWeight.bold,
  },
  shadows: {
    sm: shadows.sm,
    default: shadows.sm,
    md: shadows.md,
    lg: shadows.lg,
    xl: shadows.xl,
  },
  transitions: {
    fast: transition.allFast,
    default: transition.all,
    slow: transition.allSlow,
  },
  breakpoints: {
    sm: breakpoints.sm,
    md: breakpoints.md,
    lg: breakpoints.lg,
    xl: breakpoints.xl,
    '2xl': breakpoints['2xl'],
  },
} as const;

// Export legacy theme type
export type LegacyTheme = typeof theme;

// Re-export new theme types for gradual migration
export { lightTheme, darkTheme, type Theme };
export { spacing, layout, breakpoints };
export { fontSize, fontWeight };
export { shadows, shadowsDark };
export { radii };
export { transition };
