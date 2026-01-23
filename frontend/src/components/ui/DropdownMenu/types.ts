/**
 * DropdownMenu Types
 */

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface DropdownMenuItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export interface DropdownMenuProps {
  /** The trigger element (usually a button) */
  trigger: ReactNode;
  /** Menu items to display */
  items: DropdownMenuItem[];
  /** Alignment of the dropdown relative to trigger */
  align?: 'left' | 'right';
  /** Optional className for the container */
  className?: string;
}

export const DROPDOWN_CONSTANTS = {
  ANIMATION_DURATION: 150,
  MIN_WIDTH: 180,
} as const;
