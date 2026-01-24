/**
 * Shared Focus & State Styles
 *
 * Reusable CSS mixins for focus rings, disabled states, and interactive states.
 */

import { css } from 'styled-components';

/**
 * Focus ring for keyboard navigation (focus-visible)
 * Uses outline for better accessibility
 */
export const focusRing = css`
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary[500]};
    outline-offset: 2px;
  }
`;

/**
 * Focus ring with box-shadow (for inputs)
 * More subtle, stays within the element bounds
 */
export const focusRingInset = css`
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary[100]};
  }
`;

/**
 * Focus ring for error state
 */
export const focusRingError = css`
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.danger[500]};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.danger[100]};
  }
`;

/**
 * Disabled state styling
 */
export const disabledStyles = css`
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }
`;

/**
 * Disabled state for inputs (slightly different opacity)
 */
export const disabledInputStyles = css`
  &:disabled {
    background-color: ${({ theme }) => theme.colors.background.secondary};
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

/**
 * Loading state (cursor + pointer events)
 */
export const loadingStyles = css`
  cursor: wait;
  pointer-events: none;
`;

/**
 * Interactive hover state for buttons/cards
 */
export const interactiveHover = css`
  transition: background-color ${({ theme }) => theme.transitions.fast},
    color ${({ theme }) => theme.transitions.fast},
    border-color ${({ theme }) => theme.transitions.fast},
    transform ${({ theme }) => theme.transitions.fast};

  &:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }
`;

/**
 * Subtle hover for list items
 */
export const subtleHover = css`
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &:hover:not(:disabled) {
    background-color: ${({ theme }) => theme.colors.background.secondary};
  }
`;
