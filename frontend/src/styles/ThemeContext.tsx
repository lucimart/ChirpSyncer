'use client';

/**
 * Theme Context - ChirpSyncer Design System
 * 
 * Provides theme state management with:
 * - Light/Dark mode toggle
 * - System preference detection
 * - LocalStorage persistence
 * - No flash on initial load
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { lightTheme, darkTheme, colors } from './tokens/colors';
import { ShadowTokens, shadows, shadowsDark } from './tokens/shadows';
import { spacing, breakpoints } from './tokens/spacing';
import { fontSize, fontWeight } from './tokens/typography';
import { radii } from './tokens/radii';
import { transition } from './tokens/transitions';

// Theme mode type
export type ThemeMode = 'light' | 'dark' | 'system';

// Legacy theme structure that components expect
export interface LegacyTheme {
  mode: 'light' | 'dark';
  colors: {
    primary: typeof colors.blue;
    neutral: typeof colors.slate;
    success: {
      50: string;
      100: string;
      200: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
    };
    warning: {
      50: string;
      100: string;
      200: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
    };
    danger: {
      50: string;
      100: string;
      200: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
    };
    background: {
      primary: string;
      secondary: string;
      tertiary: string;
    };
    text: {
      primary: string;
      secondary: string;
      tertiary: string;
      inverse: string;
    };
    border: {
      light: string;
      default: string;
      dark: string;
    };
    // Semantic surface colors that adapt to light/dark mode
    surface: {
      primary: { bg: string; text: string; border: string };
      success: { bg: string; text: string; border: string };
      warning: { bg: string; text: string; border: string };
      danger: { bg: string; text: string; border: string };
      info: { bg: string; text: string; border: string };
      neutral: { bg: string; text: string; border: string };
      // Subtle variants (less prominent)
      primarySubtle: { bg: string; text: string; border: string };
      successSubtle: { bg: string; text: string; border: string };
      warningSubtle: { bg: string; text: string; border: string };
      dangerSubtle: { bg: string; text: string; border: string };
    };
  };
  spacing: typeof spacing;
  borderRadius: {
    none: string;
    sm: string;
    default: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  fontSizes: typeof fontSize;
  fontWeights: typeof fontWeight;
  shadows: ShadowTokens;
  transitions: {
    fast: string;
    default: string;
    slow: string;
  };
  breakpoints: typeof breakpoints;
}

// Context value type
interface ThemeContextValue {
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  theme: LegacyTheme;
}

// Storage key
const THEME_STORAGE_KEY = 'chirpsyncer-theme-mode';

// Create context
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Get initial mode from localStorage or system preference
function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

// Resolve system preference
function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Build legacy theme structure with dynamic colors based on mode
function buildTheme(resolvedMode: 'light' | 'dark'): LegacyTheme {
  const semanticTheme = resolvedMode === 'dark' ? darkTheme : lightTheme;
  const themeShadows = resolvedMode === 'dark' ? shadowsDark : shadows;
  
  return {
    mode: resolvedMode,
    colors: {
      primary: colors.blue,
      neutral: colors.slate,
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
      background: {
        primary: semanticTheme.bg.secondary,
        secondary: semanticTheme.bg.primary,
        tertiary: semanticTheme.bg.tertiary,
      },
      text: {
        primary: semanticTheme.text.primary,
        secondary: semanticTheme.text.secondary,
        tertiary: semanticTheme.text.tertiary,
        inverse: semanticTheme.text.inverse,
      },
      border: {
        light: semanticTheme.border.light,
        default: semanticTheme.border.medium,
        dark: semanticTheme.border.heavy,
      },
      // Semantic surface colors - adapt to light/dark mode automatically
      surface: resolvedMode === 'dark' ? {
        // Dark mode: darker backgrounds with light text
        primary: { bg: colors.blue[900], text: colors.blue[100], border: colors.blue[700] },
        success: { bg: colors.green[900], text: colors.green[100], border: colors.green[700] },
        warning: { bg: colors.yellow[900], text: colors.yellow[100], border: colors.yellow[700] },
        danger: { bg: colors.red[900], text: colors.red[100], border: colors.red[700] },
        info: { bg: colors.blue[900], text: colors.blue[100], border: colors.blue[700] },
        neutral: { bg: colors.slate[700], text: colors.slate[100], border: colors.slate[600] },
        // Subtle variants
        primarySubtle: { bg: colors.blue[800], text: colors.blue[200], border: colors.blue[700] },
        successSubtle: { bg: colors.green[800], text: colors.green[200], border: colors.green[700] },
        warningSubtle: { bg: colors.yellow[800], text: colors.yellow[200], border: colors.yellow[700] },
        dangerSubtle: { bg: colors.red[800], text: colors.red[200], border: colors.red[700] },
      } : {
        // Light mode: light backgrounds with dark text
        primary: { bg: colors.blue[50], text: colors.blue[800], border: colors.blue[200] },
        success: { bg: colors.green[50], text: colors.green[800], border: colors.green[200] },
        warning: { bg: colors.yellow[50], text: colors.yellow[800], border: colors.yellow[200] },
        danger: { bg: colors.red[50], text: colors.red[800], border: colors.red[200] },
        info: { bg: colors.blue[50], text: colors.blue[800], border: colors.blue[200] },
        neutral: { bg: colors.slate[100], text: colors.slate[800], border: colors.slate[200] },
        // Subtle variants
        primarySubtle: { bg: colors.blue[100], text: colors.blue[700], border: colors.blue[200] },
        successSubtle: { bg: colors.green[100], text: colors.green[700], border: colors.green[200] },
        warningSubtle: { bg: colors.yellow[100], text: colors.yellow[700], border: colors.yellow[200] },
        dangerSubtle: { bg: colors.red[100], text: colors.red[700], border: colors.red[200] },
      },
    },
    spacing,
    borderRadius: {
      none: radii.none,
      sm: radii.sm,
      default: radii.md,
      md: radii.md,
      lg: radii.lg,
      xl: radii.xl,
      full: radii.full,
    },
    fontSizes: fontSize,
    fontWeights: fontWeight,
    shadows: themeShadows,
    transitions: {
      fast: transition.allFast,
      default: transition.all,
      slow: transition.allSlow,
    },
    breakpoints,
  };
}

// Provider component
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState(false);

  // Initialize on mount
  useEffect(() => {
    const initialMode = getInitialMode();
    setModeState(initialMode);
    
    const resolved = initialMode === 'system' ? getSystemPreference() : initialMode;
    setResolvedMode(resolved);
    setMounted(true);
  }, []);

  // Listen for system preference changes
  useEffect(() => {
    if (mode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setResolvedMode(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [mode]);

  // Set mode and persist
  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(THEME_STORAGE_KEY, newMode);
    
    const resolved = newMode === 'system' ? getSystemPreference() : newMode;
    setResolvedMode(resolved);
    
    // Update document attribute for CSS
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.style.colorScheme = resolved;
  }, []);

  // Toggle between light and dark (skips system)
  const toggleMode = useCallback(() => {
    const newMode = resolvedMode === 'dark' ? 'light' : 'dark';
    setMode(newMode);
  }, [resolvedMode, setMode]);

  // Build theme object
  const theme = buildTheme(resolvedMode);

  // Prevent flash by rendering with default theme until mounted
  if (!mounted) {
    return (
      <StyledThemeProvider theme={buildTheme('dark')}>
        {children}
      </StyledThemeProvider>
    );
  }

  return (
    <ThemeContext.Provider value={{ mode, resolvedMode, setMode, toggleMode, theme }}>
      <StyledThemeProvider theme={theme}>
        {children}
      </StyledThemeProvider>
    </ThemeContext.Provider>
  );
}

// Hook to use theme
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Hook for just the theme object (for styled-components)
export function useThemeMode(): 'light' | 'dark' {
  const { resolvedMode } = useTheme();
  return resolvedMode;
}

// Script to inject in head to prevent flash
// This should be added to _document.tsx or layout.tsx
export const themeInitScript = `
(function() {
  try {
    var mode = localStorage.getItem('${THEME_STORAGE_KEY}');
    var resolved = mode;
    
    if (!mode || mode === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.style.colorScheme = resolved;
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.style.colorScheme = 'dark';
  }
})();
`;
