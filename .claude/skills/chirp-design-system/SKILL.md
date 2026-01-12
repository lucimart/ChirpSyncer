---
name: ChirpSyncer Design System
description: Modern design system with light/dark mode, animations, and sleek UI patterns
---

# Skill: ChirpSyncer Design System v2

Modern, sleek design system with full light/dark mode support, smooth animations, and polished UI patterns.

## Quick Reference

| Aspect | Value |
|--------|-------|
| Styling | styled-components + CSS variables |
| Theme | Token-based with CSS custom properties |
| Components | 15+ primitives |
| Dark Mode | Full support with system preference |
| Animations | GPU-accelerated transitions |
| Design | Sleek, minimal, modern |

## Theme Toggle System

### CSS Variables Approach

```typescript
// lib/theme/theme-provider.tsx
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

    const resolve = () => {
      const resolved = theme === 'system'
        ? (systemDark.matches ? 'dark' : 'light')
        : theme;
      setResolvedTheme(resolved);
      root.setAttribute('data-theme', resolved);
    };

    resolve();
    systemDark.addEventListener('change', resolve);
    return () => systemDark.removeEventListener('change', resolve);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be within ThemeProvider');
  return context;
};
```

### CSS Variables Definition

```css
/* styles/variables.css */
:root {
  /* Light mode (default) */
  --color-bg: #ffffff;
  --color-bg-alt: #f8fafc;
  --color-surface: #ffffff;
  --color-surface-hover: #f1f5f9;
  --color-border: #e2e8f0;
  --color-border-focus: #1da1f2;

  --color-text: #0f172a;
  --color-text-secondary: #64748b;
  --color-text-muted: #94a3b8;

  --color-primary: #1da1f2;
  --color-primary-hover: #0c8de4;
  --color-secondary: #0085ff;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 12px 24px rgba(0, 0, 0, 0.12);

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 350ms ease;
  --transition-spring: 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

[data-theme="dark"] {
  --color-bg: #0f172a;
  --color-bg-alt: #1e293b;
  --color-surface: #1e293b;
  --color-surface-hover: #334155;
  --color-border: #334155;

  --color-text: #f8fafc;
  --color-text-secondary: #94a3b8;
  --color-text-muted: #64748b;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 12px 24px rgba(0, 0, 0, 0.4);
}
```

### Theme Toggle Component

```typescript
// components/ui/ThemeToggle.tsx
import styled from 'styled-components';
import { useTheme } from '@/lib/theme/theme-provider';
import { Sun, Moon, Monitor } from 'lucide-react';

const ToggleGroup = styled.div`
  display: inline-flex;
  background: var(--color-bg-alt);
  border-radius: 9999px;
  padding: 4px;
  gap: 2px;
`;

const ToggleButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  background: ${({ $active }) => $active ? 'var(--color-surface)' : 'transparent'};
  color: ${({ $active }) => $active ? 'var(--color-primary)' : 'var(--color-text-muted)'};
  box-shadow: ${({ $active }) => $active ? 'var(--shadow-sm)' : 'none'};

  &:hover {
    color: var(--color-text);
  }
`;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <ToggleGroup role="radiogroup" aria-label="Theme">
      <ToggleButton
        $active={theme === 'light'}
        onClick={() => setTheme('light')}
        aria-checked={theme === 'light'}
      >
        <Sun size={16} />
      </ToggleButton>
      <ToggleButton
        $active={theme === 'system'}
        onClick={() => setTheme('system')}
        aria-checked={theme === 'system'}
      >
        <Monitor size={16} />
      </ToggleButton>
      <ToggleButton
        $active={theme === 'dark'}
        onClick={() => setTheme('dark')}
        aria-checked={theme === 'dark'}
      >
        <Moon size={16} />
      </ToggleButton>
    </ToggleGroup>
  );
}
```

## Design Tokens

```typescript
// lib/theme/tokens.ts
export const tokens = {
  colors: {
    // Brand
    primary: '#1DA1F2',      // Twitter blue
    primaryHover: '#1A91DA',
    secondary: '#0085FF',    // Bluesky blue
    secondaryHover: '#0077E6',

    // Semantic
    success: '#17BF63',
    warning: '#FFAD1F',
    danger: '#E0245E',
    info: '#1DA1F2',

    // Neutral
    background: '#FFFFFF',
    backgroundAlt: '#F7F9FA',
    surface: '#FFFFFF',
    surfaceHover: '#F7F9FA',
    border: '#E1E8ED',
    borderFocus: '#1DA1F2',

    // Text
    textPrimary: '#14171A',
    textSecondary: '#657786',
    textMuted: '#AAB8C2',
    textInverse: '#FFFFFF',

    // Dark mode
    dark: {
      background: '#15202B',
      backgroundAlt: '#192734',
      surface: '#1C2938',
      border: '#38444D',
      textPrimary: '#FFFFFF',
      textSecondary: '#8899A6',
    }
  },

  typography: {
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: '"SF Mono", "Fira Code", monospace',
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      md: '1rem',       // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '2rem',    // 32px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },

  spacing: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
  },

  radii: {
    none: '0',
    sm: '0.25rem',    // 4px
    md: '0.5rem',     // 8px
    lg: '0.75rem',    // 12px
    xl: '1rem',       // 16px
    full: '9999px',   // Pill
  },

  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.15)',
  },

  zIndex: {
    dropdown: 1000,
    sticky: 1100,
    modal: 1200,
    popover: 1300,
    tooltip: 1400,
    toast: 1500,
  },

  transitions: {
    fast: '150ms ease',
    normal: '250ms ease',
    slow: '350ms ease',
    spring: '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    bounce: '500ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
};
```

## Animations System

### Keyframe Definitions

```typescript
// lib/theme/animations.ts
import { keyframes } from 'styled-components';

export const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

export const slideInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const slideInDown = keyframes`
  from {
    opacity: 0;
    transform: translateY(-16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const slideInRight = keyframes`
  from {
    opacity: 0;
    transform: translateX(16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

export const scaleIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`;

export const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

export const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

export const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export const bounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
`;
```

### Animation Utilities

```typescript
// lib/theme/animation-utils.ts
import { css } from 'styled-components';
import * as animations from './animations';

export const animate = {
  fadeIn: css`
    animation: ${animations.fadeIn} 200ms ease forwards;
  `,
  slideUp: css`
    animation: ${animations.slideInUp} 250ms ease forwards;
  `,
  slideDown: css`
    animation: ${animations.slideInDown} 250ms ease forwards;
  `,
  scaleIn: css`
    animation: ${animations.scaleIn} 200ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  `,
  pulse: css`
    animation: ${animations.pulse} 2s ease-in-out infinite;
  `,
  shimmer: css`
    background: linear-gradient(
      90deg,
      var(--color-bg-alt) 25%,
      var(--color-surface-hover) 50%,
      var(--color-bg-alt) 75%
    );
    background-size: 200% 100%;
    animation: ${animations.shimmer} 1.5s infinite;
  `,
};
```

### Transition Presets

```typescript
// Smooth hover transitions
const hoverTransition = css`
  transition: all var(--transition-fast);
  will-change: transform, opacity, background-color;
`;

// GPU-accelerated transforms
const smoothTransform = css`
  transform: translateZ(0);
  backface-visibility: hidden;
`;

// Staggered list animation
export const staggerChildren = (delayMs = 50) => css`
  & > * {
    opacity: 0;
    animation: ${animations.slideInUp} 250ms ease forwards;
  }
  ${Array.from({ length: 10 }, (_, i) => css`
    & > *:nth-child(${i + 1}) {
      animation-delay: ${i * delayMs}ms;
    }
  `)}
`;
```

## Modern Component Patterns

### Glassmorphism Card

```typescript
const GlassCard = styled.div`
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);

  [data-theme="dark"] & {
    background: rgba(30, 41, 59, 0.7);
    border-color: rgba(255, 255, 255, 0.1);
  }
`;
```

### Interactive Button with Ripple

```typescript
const RippleButton = styled.button`
  position: relative;
  overflow: hidden;
  background: var(--color-primary);
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(29, 161, 242, 0.4);
  }

  &:active {
    transform: translateY(0);
  }

  /* Ripple effect */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
    transform: scale(0);
    opacity: 0;
    transition: transform 0.5s, opacity 0.3s;
  }

  &:active::after {
    transform: scale(2);
    opacity: 1;
    transition: 0s;
  }
`;
```

### Animated Input with Floating Label

```typescript
const FloatingInput = styled.div`
  position: relative;

  input {
    width: 100%;
    padding: 20px 16px 8px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 16px;
    transition: border-color var(--transition-fast);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    &:focus + label,
    &:not(:placeholder-shown) + label {
      top: 8px;
      font-size: 12px;
      color: var(--color-primary);
    }
  }

  label {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-text-muted);
    font-size: 16px;
    pointer-events: none;
    transition: all var(--transition-fast);
  }
`;
```

### Smooth Modal with Backdrop

```typescript
const ModalBackdrop = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  visibility: ${({ $open }) => ($open ? 'visible' : 'hidden')};
  transition: opacity var(--transition-normal), visibility var(--transition-normal);
`;

const ModalContent = styled.div<{ $open: boolean }>`
  background: var(--color-surface);
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  max-width: 500px;
  width: 90%;
  max-height: 85vh;
  overflow: auto;
  transform: ${({ $open }) => ($open ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(16px)')};
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transition: transform var(--transition-spring), opacity var(--transition-normal);
`;
```

### Skeleton Loading

```typescript
const Skeleton = styled.div<{ $width?: string; $height?: string }>`
  width: ${({ $width }) => $width || '100%'};
  height: ${({ $height }) => $height || '20px'};
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    var(--color-bg-alt) 25%,
    var(--color-surface-hover) 50%,
    var(--color-bg-alt) 75%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
`;
```

## SCSS Mixins (if using SASS)

```scss
// styles/mixins.scss

// Responsive breakpoints
@mixin mobile { @media (max-width: 639px) { @content; } }
@mixin tablet { @media (min-width: 640px) and (max-width: 1023px) { @content; } }
@mixin desktop { @media (min-width: 1024px) { @content; } }

// Smooth transitions
@mixin transition($properties: all) {
  transition: $properties var(--transition-fast);
  will-change: $properties;
}

// Glassmorphism
@mixin glass($opacity: 0.7) {
  background: rgba(255, 255, 255, $opacity);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.3);

  [data-theme="dark"] & {
    background: rgba(30, 41, 59, $opacity);
    border-color: rgba(255, 255, 255, 0.1);
  }
}

// Hover lift effect
@mixin hover-lift($y: -2px, $shadow: true) {
  @include transition(transform, box-shadow);

  &:hover {
    transform: translateY($y);
    @if $shadow {
      box-shadow: var(--shadow-md);
    }
  }
}

// Focus ring
@mixin focus-ring {
  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
}

// Truncate text
@mixin truncate($lines: 1) {
  @if $lines == 1 {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  } @else {
    display: -webkit-box;
    -webkit-line-clamp: $lines;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

// Scrollbar styling
@mixin custom-scrollbar {
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  &::-webkit-scrollbar-track {
    background: var(--color-bg-alt);
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 4px;
    &:hover {
      background: var(--color-text-muted);
    }
  }
}
```

## Micro-interactions

### Button Press

```css
.btn {
  transition: transform 100ms ease;
}
.btn:active {
  transform: scale(0.97);
}
```

### Card Hover

```css
.card {
  transition: transform 200ms ease, box-shadow 200ms ease;
}
.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}
```

### Link Underline Animation

```css
.link {
  position: relative;
}
.link::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--color-primary);
  transform: scaleX(0);
  transform-origin: right;
  transition: transform 200ms ease;
}
.link:hover::after {
  transform: scaleX(1);
  transform-origin: left;
}
```

### Checkbox Animation

```css
.checkbox-mark {
  stroke-dasharray: 24;
  stroke-dashoffset: 24;
  transition: stroke-dashoffset 200ms ease;
}
.checkbox:checked + .checkbox-mark {
  stroke-dashoffset: 0;
}
```

## Component Library

### Button

```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}

// Usage
<Button variant="primary" size="md" loading={isLoading}>
  Save Changes
</Button>

<Button variant="danger" size="sm" leftIcon={<TrashIcon />}>
  Delete
</Button>
```

### IconButton

```typescript
interface IconButtonProps {
  icon: React.ReactNode;
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  label: string;  // Required for accessibility
  disabled?: boolean;
  onClick?: () => void;
}
```

### Select

```typescript
interface SelectProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}
```

### Checkbox & Switch

```typescript
interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  indeterminate?: boolean;
}

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}
```

### Input

```typescript
interface InputProps {
  type: 'text' | 'password' | 'email' | 'number' | 'search';
  label?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
}
```

### Card

```typescript
interface CardProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outlined' | 'elevated';
  children: React.ReactNode;
}
```

### Modal

```typescript
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
}
```

### Drawer

```typescript
interface DrawerProps {
  open: boolean;
  onClose: () => void;
  position: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  title?: string;
  children: React.ReactNode;
}
```

### Tag

```typescript
interface TagProps {
  label: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  removable?: boolean;
  onRemove?: () => void;
  icon?: React.ReactNode;
}
```

### Tooltip

```typescript
interface TooltipProps {
  content: string | React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  children: React.ReactNode;
}
```

### DataTable

```typescript
interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  onRowClick?: (row: T) => void;
  selectable?: boolean;
}
```

### Alert / Toast

```typescript
interface AlertProps {
  type: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  dismissible?: boolean;
  action?: { label: string; onClick: () => void };
}

// Toast via hook
const { toast } = useToast();
toast.success('Saved successfully');
toast.error('Failed to save');
```

### DangerConfirm (Step-Up Auth)

```typescript
interface DangerConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: { reason: string; correlationId: string }) => void;
  title: string;
  description: string;
  confirmPhrase: string;  // User must type this exactly
  reasonRequired?: boolean;
  loading?: boolean;
}

// Visual structure:
// ┌─────────────────────────────────────────────┐
// │  ⚠️ Confirm Deletion                        │
// ├─────────────────────────────────────────────┤
// │  This will permanently delete 47 tweets.    │
// │                                             │
// │  Type "DELETE 47 TWEETS" to confirm:        │
// │  ┌─────────────────────────────────────┐   │
// │  │                                     │   │
// │  └─────────────────────────────────────┘   │
// │                                             │
// │  Reason (required):                         │
// │  ┌─────────────────────────────────────┐   │
// │  │                                     │   │
// │  └─────────────────────────────────────┘   │
// │                                             │
// │  [Cancel]              [Confirm Deletion]   │
// └─────────────────────────────────────────────┘
```

### StatusBadge

```typescript
interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'error' | 'pending' | 'testing';
  label?: string;
  size?: 'sm' | 'md';
}

// Color mapping
const statusColors = {
  active: 'success',
  inactive: 'muted',
  error: 'danger',
  pending: 'warning',
  testing: 'info',
};
```

### Skeleton / Spinner

```typescript
interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
}

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'muted';
}
```

### EmptyState

```typescript
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}
```

## Component Checklist

| Component | Sprint | States |
|-----------|--------|--------|
| Button | 1 | default, hover, active, disabled, loading |
| IconButton | 1 | default, hover, active, disabled |
| Input | 1 | default, focus, error, disabled |
| Select | 1 | default, open, focus, error, disabled |
| Checkbox | 1 | unchecked, checked, indeterminate, disabled |
| Switch | 1 | off, on, disabled |
| Card | 1 | default, hover (if clickable) |
| Modal | 1 | open, closing |
| Drawer | 2 | open, closing |
| Alert | 1 | visible, dismissed |
| Toast | 1 | enter, visible, exit |
| Tag | 2 | default, removable |
| Tooltip | 2 | hidden, visible |
| Skeleton | 1 | animating |
| Spinner | 1 | spinning |
| DataTable | 3 | loading, empty, populated |
| StatusBadge | 2 | N/A |
| EmptyState | 2 | N/A |
| DangerConfirm | 4 | input, validating, confirmed |

## Styling Pattern

```typescript
// components/ui/Button.tsx
import styled, { css } from 'styled-components';
import { tokens } from '@/lib/theme/tokens';

const variants = {
  primary: css`
    background: ${tokens.colors.primary};
    color: ${tokens.colors.textInverse};
    &:hover:not(:disabled) {
      background: ${tokens.colors.primaryHover};
    }
  `,
  danger: css`
    background: ${tokens.colors.danger};
    color: ${tokens.colors.textInverse};
  `,
  ghost: css`
    background: transparent;
    color: ${tokens.colors.textPrimary};
    &:hover:not(:disabled) {
      background: ${tokens.colors.surfaceHover};
    }
  `,
};

const StyledButton = styled.button<{ $variant: keyof typeof variants }>`
  padding: ${tokens.spacing[2]} ${tokens.spacing[4]};
  border-radius: ${tokens.radii.md};
  font-weight: ${tokens.typography.fontWeight.medium};
  transition: all ${tokens.transitions.fast};
  cursor: pointer;
  border: none;

  ${({ $variant }) => variants[$variant]}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
```

## Design Principles

1. **Minimalism** - Remove unnecessary elements, let content breathe
2. **Consistency** - Use tokens everywhere, no magic numbers
3. **Feedback** - Every action has visual response
4. **Performance** - GPU-accelerated animations, no jank
5. **Accessibility** - Reduced motion support, focus indicators

### Reduced Motion Support

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Checklist

### Before Creating Component
- [ ] Check if component exists in library
- [ ] Use design tokens (no hardcoded colors/spacing)
- [ ] Plan all states (default, hover, active, focus, disabled)
- [ ] Consider dark mode styling
- [ ] Add loading/skeleton state if async

### After Creating Component
- [ ] Test light and dark mode
- [ ] Test keyboard navigation
- [ ] Test with screen reader
- [ ] Verify animations are smooth (60fps)
- [ ] Test reduced motion preference
- [ ] Document props and usage

### Theme Changes
- [ ] Update CSS variables in both modes
- [ ] Test all affected components
- [ ] Check contrast ratios (WCAG AA)
- [ ] Verify shadows work in dark mode

## Related Skills

- `chirp-nextjs-migration.md` - Migration context
- `chirp-api-contracts.md` - API integration
- `security.md` - XSS prevention in UI
