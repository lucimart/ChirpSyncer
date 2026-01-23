/**
 * Color Tokens - Swoop Design System
 *
 * Base color palette and semantic theme colors for light/dark modes.
 * All colors should be referenced through theme objects, never directly.
 */

// Base color palette
export const colors = {
  // Slate - Primary neutral
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },

  // Purple - Primary brand color
  purple: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
  },

  // Mint - Secondary accent
  mint: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
  },

  // Orange - Tertiary accent
  orange: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316',
    600: '#EA580C',
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
  },

  // Blue - Legacy (kept for compatibility)
  blue: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  
  // Green - Success
  green: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
  },
  
  // Yellow - Warning
  yellow: {
    50: '#FEFCE8',
    100: '#FEF9C3',
    200: '#FEF08A',
    300: '#FDE047',
    400: '#FACC15',
    500: '#EAB308',
    600: '#CA8A04',
    700: '#A16207',
    800: '#854D0E',
    900: '#713F12',
  },
  
  // Red - Error/Danger
  red: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },
  
  // Platform colors
  platforms: {
    twitter: '#1DA1F2',
    bluesky: '#0085FF',
    mastodon: '#6364FF',
    instagram: '#E4405F',
  },
  
  // Pure values
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

// Light theme semantic tokens
export const lightTheme = {
  // Backgrounds
  bg: {
    primary: colors.slate[50],
    secondary: colors.white,
    tertiary: colors.slate[100],
    hover: colors.slate[100],
    active: colors.purple[50],
    disabled: colors.slate[100],
    overlay: 'rgba(15, 23, 42, 0.5)',
  },

  // Sidebar specific
  sidebar: {
    bg: colors.white,
    border: colors.slate[200],
    itemHover: colors.slate[100],
    itemActive: colors.purple[50],
    itemActiveText: colors.purple[600],
    sectionLabel: colors.slate[400],
  },

  // Text
  text: {
    primary: colors.slate[900],
    secondary: colors.slate[600],
    tertiary: colors.slate[600],
    disabled: colors.slate[400],
    inverse: colors.white,
    link: colors.purple[600],
    linkHover: colors.purple[700],
  },

  // Borders
  border: {
    light: colors.slate[200],
    medium: colors.slate[300],
    heavy: colors.slate[400],
    focus: colors.purple[500],
  },

  // Accent/Brand
  accent: {
    primary: colors.purple[600],
    primaryHover: colors.purple[700],
    primaryActive: colors.purple[800],
    light: colors.purple[100],
    lighter: colors.purple[50],
    secondary: colors.mint[400],
    secondaryHover: colors.mint[500],
    tertiary: colors.orange[400],
  },

  // Status colors
  status: {
    success: colors.mint[600],
    successBg: colors.mint[50],
    successBorder: colors.mint[200],

    warning: colors.orange[500],
    warningBg: colors.orange[50],
    warningBorder: colors.orange[200],

    error: colors.red[600],
    errorBg: colors.red[50],
    errorBorder: colors.red[200],

    info: colors.purple[600],
    infoBg: colors.purple[50],
    infoBorder: colors.purple[200],
  },

  // Input specific
  input: {
    bg: colors.white,
    bgDisabled: colors.slate[100],
    border: colors.slate[300],
    borderHover: colors.slate[400],
    borderFocus: colors.purple[500],
    placeholder: colors.slate[400],
  },

  // Card specific
  card: {
    bg: colors.white,
    border: colors.slate[200],
    shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  },

  // Button variants
  button: {
    primary: {
      bg: colors.purple[600],
      bgHover: colors.purple[700],
      bgActive: colors.purple[800],
      text: colors.white,
      border: 'transparent',
    },
    secondary: {
      bg: colors.white,
      bgHover: colors.slate[50],
      bgActive: colors.slate[100],
      text: colors.slate[700],
      border: colors.slate[300],
    },
    ghost: {
      bg: 'transparent',
      bgHover: colors.slate[100],
      bgActive: colors.slate[200],
      text: colors.slate[700],
      border: 'transparent',
    },
    danger: {
      bg: colors.red[600],
      bgHover: colors.red[700],
      bgActive: colors.red[800],
      text: colors.white,
      border: 'transparent',
    },
  },

  // Platforms
  platforms: colors.platforms,
} as const;

// Dark theme semantic tokens
export const darkTheme = {
  // Backgrounds
  bg: {
    primary: colors.slate[900],
    secondary: colors.slate[800],
    tertiary: colors.slate[700],
    hover: colors.slate[700],
    active: colors.slate[700],
    disabled: colors.slate[800],
    overlay: 'rgba(0, 0, 0, 0.7)',
  },

  // Sidebar specific
  sidebar: {
    bg: colors.slate[800],
    border: colors.slate[700],
    itemHover: colors.slate[700],
    itemActive: colors.slate[700],
    itemActiveText: colors.purple[400],
    sectionLabel: colors.slate[500],
  },

  // Text
  text: {
    primary: colors.slate[100],
    secondary: colors.slate[300],
    tertiary: colors.slate[400],
    disabled: colors.slate[500],
    inverse: colors.slate[900],
    link: colors.purple[400],
    linkHover: colors.purple[300],
  },

  // Borders
  border: {
    light: colors.slate[700],
    medium: colors.slate[600],
    heavy: colors.slate[500],
    focus: colors.purple[500],
  },

  // Accent/Brand
  accent: {
    primary: colors.purple[500],
    primaryHover: colors.purple[400],
    primaryActive: colors.purple[300],
    light: colors.slate[700],
    lighter: colors.slate[800],
    secondary: colors.mint[400],
    secondaryHover: colors.mint[300],
    tertiary: colors.orange[400],
  },

  // Status colors
  status: {
    success: colors.mint[400],
    successBg: 'rgba(52, 211, 153, 0.1)',
    successBorder: colors.mint[800],

    warning: colors.orange[400],
    warningBg: 'rgba(251, 146, 60, 0.1)',
    warningBorder: colors.orange[800],

    error: colors.red[400],
    errorBg: 'rgba(239, 68, 68, 0.1)',
    errorBorder: colors.red[800],

    info: colors.purple[400],
    infoBg: 'rgba(139, 92, 246, 0.1)',
    infoBorder: colors.purple[800],
  },

  // Input specific
  input: {
    bg: colors.slate[800],
    bgDisabled: colors.slate[700],
    border: colors.slate[600],
    borderHover: colors.slate[500],
    borderFocus: colors.purple[500],
    placeholder: colors.slate[500],
  },

  // Card specific
  card: {
    bg: colors.slate[800],
    border: colors.slate[700],
    shadow: '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
  },

  // Button variants
  button: {
    primary: {
      bg: colors.purple[600],
      bgHover: colors.purple[500],
      bgActive: colors.purple[400],
      text: colors.white,
      border: 'transparent',
    },
    secondary: {
      bg: colors.slate[700],
      bgHover: colors.slate[600],
      bgActive: colors.slate[500],
      text: colors.slate[100],
      border: colors.slate[600],
    },
    ghost: {
      bg: 'transparent',
      bgHover: colors.slate[700],
      bgActive: colors.slate[600],
      text: colors.slate[300],
      border: 'transparent',
    },
    danger: {
      bg: colors.red[600],
      bgHover: colors.red[500],
      bgActive: colors.red[400],
      text: colors.white,
      border: 'transparent',
    },
  },

  // Platforms
  platforms: colors.platforms,
} as const;

// Theme type for TypeScript
export type Theme = typeof lightTheme;
