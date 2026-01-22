/**
 * Spacing Tokens - ChirpSyncer Design System
 * 
 * Consistent spacing scale based on 4px base unit.
 * Use these tokens for margins, paddings, and gaps.
 */

// Base spacing scale (4px increments)
export const spacing = {
  0: '0',
  px: '1px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '12px',
  3.5: '14px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  11: '44px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
  28: '112px',
  32: '128px',
} as const;

// Semantic spacing for common use cases
export const layout = {
  // Sidebar
  sidebarWidth: '260px',
  sidebarCollapsedWidth: '72px',
  sidebarPadding: spacing[4],
  sidebarItemPadding: `${spacing[2]} ${spacing[3]}`,
  sidebarItemGap: spacing[1],
  sidebarSectionGap: spacing[6],
  
  // Header
  headerHeight: '64px',
  headerPadding: `${spacing[4]} ${spacing[6]}`,
  
  // Page layout
  pageGutter: spacing[6],
  pagePaddingX: spacing[6],
  pagePaddingY: spacing[6],
  pageMaxWidth: '1400px',
  
  // Cards
  cardPadding: spacing[5],
  cardPaddingCompact: spacing[4],
  cardGap: spacing[4],
  
  // Sections
  sectionGap: spacing[8],
  sectionTitleGap: spacing[4],
  
  // Components
  componentGap: spacing[4],
  inlineGap: spacing[2],
  stackGap: spacing[3],
  
  // Form elements
  inputPaddingX: spacing[3],
  inputPaddingY: spacing[2],
  inputGap: spacing[4],
  labelGap: spacing[1.5],
  
  // Buttons
  buttonPaddingX: spacing[4],
  buttonPaddingY: spacing[2],
  buttonGap: spacing[2],
  buttonIconGap: spacing[2],
  
  // Modal
  modalPadding: spacing[6],
  modalGap: spacing[4],
  
  // Table
  tableCellPaddingX: spacing[4],
  tableCellPaddingY: spacing[3],
  tableHeaderPaddingY: spacing[3],
} as const;

// Grid system
export const grid = {
  columns: 12,
  gutter: spacing[6],
  margin: spacing[6],
} as const;

// Breakpoints for responsive design
export const breakpoints = {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Media query helpers
export const media = {
  xs: `@media (min-width: ${breakpoints.xs})`,
  sm: `@media (min-width: ${breakpoints.sm})`,
  md: `@media (min-width: ${breakpoints.md})`,
  lg: `@media (min-width: ${breakpoints.lg})`,
  xl: `@media (min-width: ${breakpoints.xl})`,
  '2xl': `@media (min-width: ${breakpoints['2xl']})`,
  
  // Max-width variants (for mobile-first overrides)
  maxXs: `@media (max-width: ${breakpoints.xs})`,
  maxSm: `@media (max-width: ${breakpoints.sm})`,
  maxMd: `@media (max-width: ${breakpoints.md})`,
  maxLg: `@media (max-width: ${breakpoints.lg})`,
  maxXl: `@media (max-width: ${breakpoints.xl})`,
} as const;
