'use client';

/**
 * DropdownMenu Component
 *
 * A reusable, accessible dropdown menu with animations.
 * Uses framer-motion for smooth enter/exit animations.
 */

import { useState, useRef, useEffect, useCallback, memo, type FC } from 'react';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import type { DropdownMenuProps, DropdownMenuItem } from './types';
import { DROPDOWN_CONSTANTS } from './types';

const Container = styled.div`
  position: relative;
  display: inline-block;
`;

const TriggerWrapper = styled.div`
  display: inline-flex;
`;

const menuContainerStyles = css<{ $align: 'left' | 'right' }>`
  position: absolute;
  top: 100%;
  ${({ $align }) => ($align === 'right' ? 'right: 0;' : 'left: 0;')}
  min-width: ${DROPDOWN_CONSTANTS.MIN_WIDTH}px;
  margin-top: ${({ theme }) => theme.spacing[1]};
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  z-index: 50;
  overflow: hidden;
  transform-origin: top ${({ $align }) => $align};
`;

const MenuContainer = styled(motion.div).attrs<{ $align: 'left' | 'right' }>((props) => ({
  $align: props.$align,
}))<{ $align: 'left' | 'right' }>`
  ${menuContainerStyles}
`;

const menuItemStyles = css<{ $danger?: boolean; $disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  background: none;
  border: none;
  color: ${({ $danger, $disabled, theme }) =>
    $disabled
      ? theme.colors.text.tertiary
      : $danger
        ? theme.colors.danger[600]
        : theme.colors.text.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  text-align: left;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &:hover:not(:disabled) {
    background-color: ${({ $danger, $disabled, theme }) =>
      $disabled
        ? 'transparent'
        : $danger
          ? theme.colors.surface.danger.bg
          : theme.colors.background.secondary};
  }

  &:focus-visible {
    outline: none;
    background-color: ${({ theme }) => theme.colors.background.secondary};
  }

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
`;

const MenuItemButton = styled(motion.button).attrs<{ $danger?: boolean; $disabled?: boolean }>((props) => ({
  $danger: props.$danger,
  $disabled: props.$disabled,
}))<{ $danger?: boolean; $disabled?: boolean }>`
  ${menuItemStyles}
`;

const Divider = styled.div`
  height: 1px;
  background-color: ${({ theme }) => theme.colors.border.light};
  margin: ${({ theme }) => `${theme.spacing[1]} 0`};
`;

// Animation variants
const menuVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: -8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 25,
      staggerChildren: 0.03,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -8,
    transition: {
      duration: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring' as const, stiffness: 400, damping: 25 }
  },
};

export const DropdownMenu: FC<DropdownMenuProps> = memo(({
  trigger,
  items,
  align = 'right',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Close on click outside
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
      setIsOpen(false);
      setFocusedIndex(-1);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, handleClickOutside]);

  // Focus first item when menu opens
  useEffect(() => {
    if (isOpen && itemRefs.current[0]) {
      setFocusedIndex(0);
      itemRefs.current[0]?.focus();
    }
  }, [isOpen]);

  const handleItemClick = useCallback((item: DropdownMenuItem) => {
    if (item.disabled) return;
    item.onClick();
    setIsOpen(false);
    setFocusedIndex(-1);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const enabledItems = items.filter(item => !item.disabled);
    const enabledIndices = items.map((item, i) => item.disabled ? -1 : i).filter(i => i !== -1);

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          const currentEnabledIndex = enabledIndices.indexOf(focusedIndex);
          const nextIndex = enabledIndices[(currentEnabledIndex + 1) % enabledIndices.length];
          setFocusedIndex(nextIndex);
          itemRefs.current[nextIndex]?.focus();
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) {
          const currentEnabledIndex = enabledIndices.indexOf(focusedIndex);
          const prevIndex = enabledIndices[(currentEnabledIndex - 1 + enabledIndices.length) % enabledIndices.length];
          setFocusedIndex(prevIndex);
          itemRefs.current[prevIndex]?.focus();
        }
        break;
      case 'Enter':
      case ' ':
        if (isOpen && focusedIndex >= 0) {
          event.preventDefault();
          const item = items[focusedIndex];
          if (item && !item.disabled) {
            handleItemClick(item);
          }
        }
        break;
      case 'Tab':
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
      case 'Home':
        if (isOpen) {
          event.preventDefault();
          const firstEnabled = enabledIndices[0];
          setFocusedIndex(firstEnabled);
          itemRefs.current[firstEnabled]?.focus();
        }
        break;
      case 'End':
        if (isOpen) {
          event.preventDefault();
          const lastEnabled = enabledIndices[enabledIndices.length - 1];
          setFocusedIndex(lastEnabled);
          itemRefs.current[lastEnabled]?.focus();
        }
        break;
    }
  }, [isOpen, focusedIndex, items, handleItemClick]);

  const toggleMenu = useCallback(() => {
    setIsOpen(prev => !prev);
    if (isOpen) {
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  return (
    <Container
      ref={containerRef}
      className={className}
      onKeyDown={handleKeyDown}
    >
      <TriggerWrapper
        onClick={toggleMenu}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {trigger}
      </TriggerWrapper>

      <AnimatePresence>
        {isOpen && (
          <MenuContainer
            ref={menuRef}
            $align={align}
            role="menu"
            aria-orientation="vertical"
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {items.map((item, index) => (
              <MenuItemButton
                key={item.id}
                ref={(el) => { itemRefs.current[index] = el; }}
                role="menuitem"
                $danger={item.danger}
                $disabled={item.disabled}
                disabled={item.disabled}
                onClick={() => handleItemClick(item)}
                tabIndex={focusedIndex === index ? 0 : -1}
                aria-disabled={item.disabled}
                variants={itemVariants}
              >
                {item.icon && <item.icon aria-hidden="true" />}
                {item.label}
              </MenuItemButton>
            ))}
          </MenuContainer>
        )}
      </AnimatePresence>
    </Container>
  );
});

DropdownMenu.displayName = 'DropdownMenu';

export { Divider as DropdownDivider };
