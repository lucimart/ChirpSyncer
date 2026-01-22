import { createGlobalStyle } from 'styled-components';
import { fontFamily, fontSize, fontWeight, lineHeight } from './tokens/typography';
import { transition } from './tokens/transitions';
import type { LegacyTheme } from './ThemeContext';

/**
 * Global Styles - ChirpSyncer Design System
 * 
 * Base styles that apply to the entire application.
 * Uses legacy theme structure for backward compatibility with existing components.
 */
export const GlobalStyle = createGlobalStyle<{ theme: LegacyTheme }>`
  /* CSS Reset */
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  /* Root element */
  html {
    font-size: 16px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    scroll-behavior: smooth;
  }

  /* Body - uses theme colors */
  body {
    font-family: ${fontFamily.sans};
    font-size: ${fontSize.base};
    font-weight: ${fontWeight.normal};
    line-height: ${lineHeight.normal};
    background-color: ${({ theme }) => theme.colors.background.secondary};
    color: ${({ theme }) => theme.colors.text.primary};
    transition: ${transition.theme};
  }

  /* Links */
  a {
    color: ${({ theme }) => theme.colors.primary[600]};
    text-decoration: none;
    transition: ${transition.colors};

    &:hover {
      color: ${({ theme }) => theme.colors.primary[700]};
      text-decoration: underline;
    }
  }

  /* Buttons */
  button {
    font-family: inherit;
    cursor: pointer;
    border: none;
    background: none;
  }

  /* Form elements */
  input, textarea, select {
    font-family: inherit;
    font-size: inherit;
  }

  /* Headings */
  h1, h2, h3, h4, h5, h6 {
    font-weight: ${fontWeight.semibold};
    line-height: ${lineHeight.tight};
    color: ${({ theme }) => theme.colors.text.primary};
  }

  h1 { font-size: ${fontSize['3xl']}; }
  h2 { font-size: ${fontSize['2xl']}; }
  h3 { font-size: ${fontSize.xl}; }
  h4 { font-size: ${fontSize.lg}; }
  h5 { font-size: ${fontSize.base}; }
  h6 { font-size: ${fontSize.sm}; }

  /* Paragraphs */
  p {
    color: ${({ theme }) => theme.colors.text.secondary};
  }

  /* Code */
  code, pre {
    font-family: ${fontFamily.mono};
    font-size: ${fontSize.sm};
  }

  code {
    background-color: ${({ theme }) => theme.colors.background.tertiary};
    padding: 2px 6px;
    border-radius: 4px;
  }

  pre {
    background-color: ${({ theme }) => theme.colors.background.tertiary};
    padding: 16px;
    border-radius: 8px;
    overflow-x: auto;
  }

  /* Selection */
  ::selection {
    background-color: ${({ theme }) => theme.colors.primary[100]};
    color: ${({ theme }) => theme.colors.primary[700]};
  }

  /* Focus styles */
  :focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary[500]};
    outline-offset: 2px;
  }

  /* Remove focus outline for mouse users */
  :focus:not(:focus-visible) {
    outline: none;
  }

  /* Scrollbar styling */
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.background.tertiary};
  }

  ::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.border.default};
    border-radius: 4px;

    &:hover {
      background: ${({ theme }) => theme.colors.border.dark};
    }
  }

  /* Firefox scrollbar */
  * {
    scrollbar-width: thin;
    scrollbar-color: ${({ theme }) => theme.colors.border.default} ${({ theme }) => theme.colors.background.tertiary};
  }

  /* Images */
  img {
    max-width: 100%;
    height: auto;
    display: block;
  }

  /* Tables */
  table {
    border-collapse: collapse;
    width: 100%;
  }

  /* Lists */
  ul, ol {
    list-style: none;
  }

  /* Horizontal rule */
  hr {
    border: none;
    border-top: 1px solid ${({ theme }) => theme.colors.border.light};
    margin: 24px 0;
  }

  /* Disabled state */
  [disabled] {
    cursor: not-allowed;
    opacity: 0.6;
  }

  /* Screen reader only */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  /* Utility classes for theme */
  .text-primary { color: ${({ theme }) => theme.colors.text.primary}; }
  .text-secondary { color: ${({ theme }) => theme.colors.text.secondary}; }
  .text-tertiary { color: ${({ theme }) => theme.colors.text.tertiary}; }
  .text-accent { color: ${({ theme }) => theme.colors.primary[600]}; }
  .text-success { color: ${({ theme }) => theme.colors.success[600]}; }
  .text-warning { color: ${({ theme }) => theme.colors.warning[600]}; }
  .text-error { color: ${({ theme }) => theme.colors.danger[600]}; }

  .bg-primary { background-color: ${({ theme }) => theme.colors.background.primary}; }
  .bg-secondary { background-color: ${({ theme }) => theme.colors.background.secondary}; }
  .bg-tertiary { background-color: ${({ theme }) => theme.colors.background.tertiary}; }
`;
