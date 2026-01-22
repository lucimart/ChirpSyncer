/**
 * Border Radius Tokens - ChirpSyncer Design System
 * 
 * Consistent border-radius values for rounded corners.
 */

export const radii = {
  none: '0',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  '3xl': '24px',
  full: '9999px',
} as const;

// Semantic radius mapping
export const borderRadius = {
  // Buttons
  button: radii.lg,
  buttonSmall: radii.md,
  buttonLarge: radii.lg,
  buttonPill: radii.full,
  
  // Inputs
  input: radii.lg,
  
  // Cards
  card: radii.xl,
  cardSmall: radii.lg,
  
  // Badges
  badge: radii.md,
  badgePill: radii.full,
  
  // Avatars
  avatar: radii.full,
  avatarSquare: radii.lg,
  
  // Modals
  modal: radii['2xl'],
  
  // Dropdowns
  dropdown: radii.lg,
  
  // Tooltips
  tooltip: radii.md,
  
  // Tags/Chips
  tag: radii.md,
  
  // Images
  image: radii.lg,
  imageLarge: radii.xl,
} as const;
