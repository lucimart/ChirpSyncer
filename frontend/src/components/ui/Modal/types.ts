'use client';

import { ReactNode } from 'react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal title - also used for aria-labelledby */
  title?: string;
  /** Optional description for aria-describedby */
  description?: string;
  /** Modal content */
  children: ReactNode;
  /** Footer content (actions) */
  footer?: ReactNode;
  /** Modal size preset */
  size?: ModalSize;
  /** Close when clicking overlay */
  closeOnOverlayClick?: boolean;
  /** Close when pressing Escape */
  closeOnEscape?: boolean;
  /** Whether to trap focus inside modal */
  trapFocus?: boolean;
  /** Return focus to trigger element on close */
  returnFocusOnClose?: boolean;
  /** Initial element to focus when modal opens */
  initialFocusRef?: React.RefObject<HTMLElement>;
  /** Element to focus when modal closes */
  finalFocusRef?: React.RefObject<HTMLElement>;
  /** Disable scroll lock on body */
  preserveScrollBarGap?: boolean;
  /** Test ID for testing */
  'data-testid'?: string;
  /** Custom className */
  className?: string;
}

export const MODAL_SIZE_MAP: Record<ModalSize, string> = {
  sm: '400px',
  md: '500px',
  lg: '700px',
  xl: '900px',
  full: 'calc(100vw - 2rem)',
};

export const MODAL_ANIMATION = {
  overlay: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.15 },
  },
  content: {
    initial: { opacity: 0, y: -20, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 10, scale: 0.98 },
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 30,
    },
  },
  reducedMotion: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.1 },
  },
};

export const FOCUSABLE_SELECTORS = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');
