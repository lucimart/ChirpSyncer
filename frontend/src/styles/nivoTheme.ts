/**
 * Nivo Theme Configuration
 *
 * Integrates Nivo charts with the ChirpSyncer design system.
 * Provides consistent styling across all chart components.
 */

import { colors, lightTheme, darkTheme } from './tokens/colors';
import { fontSize } from './tokens/typography';

/**
 * Nivo theme type - locally defined as the export name varies across Nivo versions.
 * Represents the full chart theming configuration.
 */
type NivoTheme = Record<string, unknown>;

// Chart color palette - consistent across all charts
export const chartColors = {
  primary: [
    colors.blue[500],
    colors.blue[400],
    colors.blue[600],
    colors.blue[300],
    colors.blue[700],
  ],
  categorical: [
    colors.blue[500],
    colors.green[500],
    colors.yellow[500],
    colors.red[500],
    colors.blue[700],
    colors.green[700],
    colors.yellow[700],
    colors.red[700],
  ],
  sequential: {
    blue: [
      colors.blue[100],
      colors.blue[200],
      colors.blue[300],
      colors.blue[400],
      colors.blue[500],
      colors.blue[600],
      colors.blue[700],
    ],
    green: [
      colors.green[100],
      colors.green[200],
      colors.green[300],
      colors.green[400],
      colors.green[500],
      colors.green[600],
      colors.green[700],
    ],
  },
  diverging: {
    redGreen: [
      colors.red[600],
      colors.red[400],
      colors.red[200],
      colors.slate[100],
      colors.green[200],
      colors.green[400],
      colors.green[600],
    ],
  },
  heatmap: [
    colors.blue[50],
    colors.blue[100],
    colors.blue[200],
    colors.blue[300],
    colors.blue[400],
    colors.blue[500],
    colors.blue[600],
    colors.blue[700],
    colors.blue[800],
  ],
  success: colors.green[500],
  warning: colors.yellow[500],
  danger: colors.red[500],
};

// Platform-specific colors for sync visualizations
export const platformColors: Record<string, string> = {
  twitter: '#1DA1F2',
  bluesky: '#0085FF',
  hub: colors.blue[600],
};

// Light theme for Nivo
export const nivoLightTheme: NivoTheme = {
  background: 'transparent',
  text: {
    fontSize: parseInt(fontSize.sm),
    fill: lightTheme.text.primary,
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  axis: {
    domain: {
      line: {
        stroke: lightTheme.border.medium,
        strokeWidth: 1,
      },
    },
    legend: {
      text: {
        fontSize: parseInt(fontSize.sm),
        fill: lightTheme.text.secondary,
        outlineWidth: 0,
        outlineColor: 'transparent',
      },
    },
    ticks: {
      line: {
        stroke: lightTheme.border.light,
        strokeWidth: 1,
      },
      text: {
        fontSize: parseInt(fontSize.xs),
        fill: lightTheme.text.tertiary,
        outlineWidth: 0,
        outlineColor: 'transparent',
      },
    },
  },
  grid: {
    line: {
      stroke: lightTheme.border.light,
      strokeWidth: 1,
    },
  },
  legends: {
    title: {
      text: {
        fontSize: parseInt(fontSize.sm),
        fill: lightTheme.text.primary,
        outlineWidth: 0,
        outlineColor: 'transparent',
      },
    },
    text: {
      fontSize: parseInt(fontSize.xs),
      fill: lightTheme.text.secondary,
      outlineWidth: 0,
      outlineColor: 'transparent',
    },
    ticks: {
      line: {},
      text: {
        fontSize: parseInt(fontSize.xs),
        fill: lightTheme.text.tertiary,
        outlineWidth: 0,
        outlineColor: 'transparent',
      },
    },
  },
  annotations: {
    text: {
      fontSize: parseInt(fontSize.sm),
      fill: lightTheme.text.primary,
      outlineWidth: 2,
      outlineColor: '#ffffff',
      outlineOpacity: 1,
    },
    link: {
      stroke: lightTheme.border.medium,
      strokeWidth: 1,
      outlineWidth: 2,
      outlineColor: '#ffffff',
      outlineOpacity: 1,
    },
    outline: {
      stroke: lightTheme.border.medium,
      strokeWidth: 2,
      outlineWidth: 2,
      outlineColor: '#ffffff',
      outlineOpacity: 1,
    },
    symbol: {
      fill: colors.blue[500],
      outlineWidth: 2,
      outlineColor: '#ffffff',
      outlineOpacity: 1,
    },
  },
  tooltip: {
    wrapper: {},
    container: {
      background: lightTheme.bg.primary,
      color: lightTheme.text.primary,
      fontSize: parseInt(fontSize.sm),
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      padding: '8px 12px',
    },
    basic: {},
    chip: {},
    table: {},
    tableCell: {},
    tableCellValue: {},
  },
};

// Dark theme for Nivo
export const nivoDarkTheme: NivoTheme = {
  background: 'transparent',
  text: {
    fontSize: parseInt(fontSize.sm),
    fill: darkTheme.text.primary,
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  axis: {
    domain: {
      line: {
        stroke: darkTheme.border.medium,
        strokeWidth: 1,
      },
    },
    legend: {
      text: {
        fontSize: parseInt(fontSize.sm),
        fill: darkTheme.text.secondary,
        outlineWidth: 0,
        outlineColor: 'transparent',
      },
    },
    ticks: {
      line: {
        stroke: darkTheme.border.light,
        strokeWidth: 1,
      },
      text: {
        fontSize: parseInt(fontSize.xs),
        fill: darkTheme.text.tertiary,
        outlineWidth: 0,
        outlineColor: 'transparent',
      },
    },
  },
  grid: {
    line: {
      stroke: darkTheme.border.light,
      strokeWidth: 1,
    },
  },
  legends: {
    title: {
      text: {
        fontSize: parseInt(fontSize.sm),
        fill: darkTheme.text.primary,
        outlineWidth: 0,
        outlineColor: 'transparent',
      },
    },
    text: {
      fontSize: parseInt(fontSize.xs),
      fill: darkTheme.text.secondary,
      outlineWidth: 0,
      outlineColor: 'transparent',
    },
    ticks: {
      line: {},
      text: {
        fontSize: parseInt(fontSize.xs),
        fill: darkTheme.text.tertiary,
        outlineWidth: 0,
        outlineColor: 'transparent',
      },
    },
  },
  annotations: {
    text: {
      fontSize: parseInt(fontSize.sm),
      fill: darkTheme.text.primary,
      outlineWidth: 2,
      outlineColor: darkTheme.bg.primary,
      outlineOpacity: 1,
    },
    link: {
      stroke: darkTheme.border.medium,
      strokeWidth: 1,
      outlineWidth: 2,
      outlineColor: darkTheme.bg.primary,
      outlineOpacity: 1,
    },
    outline: {
      stroke: darkTheme.border.medium,
      strokeWidth: 2,
      outlineWidth: 2,
      outlineColor: darkTheme.bg.primary,
      outlineOpacity: 1,
    },
    symbol: {
      fill: colors.blue[400],
      outlineWidth: 2,
      outlineColor: darkTheme.bg.primary,
      outlineOpacity: 1,
    },
  },
  tooltip: {
    wrapper: {},
    container: {
      background: darkTheme.bg.secondary,
      color: darkTheme.text.primary,
      fontSize: parseInt(fontSize.sm),
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.2)',
      padding: '8px 12px',
    },
    basic: {},
    chip: {},
    table: {},
    tableCell: {},
    tableCellValue: {},
  },
};

// Hook to get current theme based on mode
export const getNivoTheme = (mode: 'light' | 'dark' = 'light'): NivoTheme => {
  return mode === 'dark' ? nivoDarkTheme : nivoLightTheme;
};

// Common chart props for consistent sizing and margins
export const chartMargins = {
  compact: { top: 10, right: 10, bottom: 30, left: 40 },
  default: { top: 20, right: 20, bottom: 40, left: 50 },
  withLegend: { top: 20, right: 120, bottom: 40, left: 50 },
};

// Animation config
export const chartAnimation = {
  default: {
    motionConfig: 'gentle' as const,
  },
  fast: {
    motionConfig: 'fast' as const,
  },
  none: {
    animate: false,
  },
};
