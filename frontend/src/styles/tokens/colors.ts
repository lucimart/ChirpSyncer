/**
 * Color Tokens - ChirpSyncer Design System
 * 
 * Base color palette and semantic theme colors for light/dark modes.
 * All colors should be referenced through theme objects, never directly.
 */

// Base color palette (Tailwind-inspired)
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
  
  // Blue - Primary accent
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
    active: colors.blue[50],
    disabled: colors.slate[100],
    overlay: 'rgba(15, 23, 42, 0.5)',
  },
  
  // Sidebar specific
  sidebar: {
    bg: colors.white,
    border: colors.slate[200],
    itemHover: colors.slate[100],
    itemActive: colors.blue[50],
    itemActiveText: colors.blue[600],
    sectionLabel: colors.slate[400],
  },
  
  // Text
  text: {
    primary: colors.slate[900],
    secondary: colors.slate[600],
    tertiary: colors.slate[600], // Changed from 500 to 600 for WCAG AA contrast on off-white backgrounds
    disabled: colors.slate[400],
    inverse: colors.white,
    link: colors.blue[600],
    linkHover: colors.blue[700],
  },
  
  // Borders
  border: {
    light: colors.slate[200],
    medium: colors.slate[300],
    heavy: colors.slate[400],
    focus: colors.blue[500],
  },
  
  // Accent/Brand
  accent: {
    primary: colors.blue[600],
    primaryHover: colors.blue[700],
    primaryActive: colors.blue[800],
    light: colors.blue[100],
    lighter: colors.blue[50],
  },
  
  // Status colors
  status: {
    success: colors.green[600],
    successBg: colors.green[50],
    successBorder: colors.green[200],
    
    warning: colors.yellow[600],
    warningBg: colors.yellow[50],
    warningBorder: colors.yellow[200],
    
    error: colors.red[600],
    errorBg: colors.red[50],
    errorBorder: colors.red[200],
    
    info: colors.blue[600],
    infoBg: colors.blue[50],
    infoBorder: colors.blue[200],
  },
  
  // Input specific
  input: {
    bg: colors.white,
    bgDisabled: colors.slate[100],
    border: colors.slate[300],
    borderHover: colors.slate[400],
    borderFocus: colors.blue[500],
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
      bg: colors.blue[600],
      bgHover: colors.blue[700],
      bgActive: colors.blue[800],
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
    itemActiveText: colors.blue[400],
    sectionLabel: colors.slate[500],
  },
  
  // Text
  text: {
    primary: colors.slate[100],
    secondary: colors.slate[300], // Changed from 400 to 300 for better contrast on dark bg
    tertiary: colors.slate[400], // Changed from 500 to 400 for better contrast on dark bg
    disabled: colors.slate[500],
    inverse: colors.slate[900],
    link: colors.blue[400],
    linkHover: colors.blue[300],
  },
  
  // Borders
  border: {
    light: colors.slate[700],
    medium: colors.slate[600],
    heavy: colors.slate[500],
    focus: colors.blue[500],
  },
  
  // Accent/Brand
  accent: {
    primary: colors.blue[500],
    primaryHover: colors.blue[400],
    primaryActive: colors.blue[300],
    light: colors.slate[700],
    lighter: colors.slate[800],
  },
  
  // Status colors
  status: {
    success: colors.green[400],
    successBg: 'rgba(34, 197, 94, 0.1)',
    successBorder: colors.green[800],
    
    warning: colors.yellow[400],
    warningBg: 'rgba(234, 179, 8, 0.1)',
    warningBorder: colors.yellow[800],
    
    error: colors.red[400],
    errorBg: 'rgba(239, 68, 68, 0.1)',
    errorBorder: colors.red[800],
    
    info: colors.blue[400],
    infoBg: 'rgba(59, 130, 246, 0.1)',
    infoBorder: colors.blue[800],
  },
  
  // Input specific
  input: {
    bg: colors.slate[800],
    bgDisabled: colors.slate[700],
    border: colors.slate[600],
    borderHover: colors.slate[500],
    borderFocus: colors.blue[500],
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
      bg: colors.blue[600],
      bgHover: colors.blue[500],
      bgActive: colors.blue[400],
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
