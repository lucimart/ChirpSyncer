'use client';

import { useEffect, useRef, useCallback, RefObject } from 'react';
import { FOCUSABLE_SELECTORS } from './types';

interface UseFocusTrapOptions {
  enabled?: boolean;
  containerRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  finalFocusRef?: RefObject<HTMLElement | null>;
  returnFocusOnClose?: boolean;
}

export function useFocusTrap({
  enabled = true,
  containerRef,
  initialFocusRef,
  finalFocusRef,
  returnFocusOnClose = true,
}: UseFocusTrapOptions) {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
    ).filter((el) => el.offsetParent !== null);
  }, [containerRef]);

  const focusFirst = useCallback(() => {
    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
      return;
    }
    const focusable = getFocusableElements();
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      containerRef.current?.focus();
    }
  }, [containerRef, getFocusableElements, initialFocusRef]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || event.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];
      const activeElement = document.activeElement as HTMLElement;

      if (event.shiftKey) {
        // Shift + Tab: going backwards
        if (activeElement === firstElement || !containerRef.current?.contains(activeElement)) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: going forwards
        if (activeElement === lastElement || !containerRef.current?.contains(activeElement)) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [enabled, containerRef, getFocusableElements]
  );

  useEffect(() => {
    if (!enabled) return;

    // Store the currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus the first focusable element
    const rafId = requestAnimationFrame(focusFirst);

    // Add keydown listener for tab trapping
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('keydown', handleKeyDown);

      // Return focus to the previous element
      if (returnFocusOnClose) {
        const elementToFocus = finalFocusRef?.current ?? previousActiveElement.current;
        elementToFocus?.focus();
      }
    };
  }, [enabled, focusFirst, handleKeyDown, returnFocusOnClose, finalFocusRef]);

  return { focusFirst, getFocusableElements };
}
