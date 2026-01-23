/**
 * Layout Types and Constants
 */

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Variants, Transition } from 'framer-motion';
import {
  Home,
  Key,
  RefreshCw,
  Trash2,
  Search,
  BarChart3,
  Settings,
  Bookmark,
  Download,
  Calendar,
  Plug,
  Sparkles,
  Users,
  SlidersHorizontal,
  Cable,
  FileText,
  Lightbulb,
  FolderOpen,
  Instagram,
} from 'lucide-react';

// Navigation Types
export interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

export interface NavGroup {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

// Component Props
export interface DashboardLayoutProps {
  children: ReactNode;
}

export interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export interface PageTransitionProps {
  children: ReactNode;
}

// Swipe Configuration
export const SWIPE_CONFIG = {
  minDistance: 50,
  edgeZone: 50,
} as const;

// Icon Sizes
export const ICON_SIZES = {
  menu: 24,
  close: 20,
  nav: 18,
} as const;

// Navigation Groups Configuration
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Platforms',
    icon: Cable,
    items: [
      { href: '/dashboard/connectors', icon: Plug, label: 'Connectors' },
      { href: '/dashboard/credentials', icon: Key, label: 'Credentials' },
      { href: '/dashboard/instagram', icon: Instagram, label: 'Instagram' },
    ],
  },
  {
    label: 'Content',
    icon: FileText,
    items: [
      { href: '/dashboard/sync', icon: RefreshCw, label: 'Sync' },
      { href: '/dashboard/scheduler', icon: Calendar, label: 'Scheduler' },
      { href: '/dashboard/search', icon: Search, label: 'Search' },
      { href: '/dashboard/cleanup', icon: Trash2, label: 'Cleanup' },
    ],
  },
  {
    label: 'Insights',
    icon: Lightbulb,
    items: [
      { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
      { href: '/dashboard/feed-lab', icon: Sparkles, label: 'Feed Lab' },
      { href: '/dashboard/algorithm', icon: SlidersHorizontal, label: 'Algorithm' },
    ],
  },
  {
    label: 'Organize',
    icon: FolderOpen,
    items: [
      { href: '/dashboard/workspaces', icon: Users, label: 'Workspaces' },
      { href: '/dashboard/bookmarks', icon: Bookmark, label: 'Bookmarks' },
      { href: '/dashboard/export', icon: Download, label: 'Export' },
    ],
  },
];

// Static Nav Items
export const DASHBOARD_NAV: NavItem = {
  href: '/dashboard',
  icon: Home,
  label: 'Dashboard',
};

export const SETTINGS_NAV: NavItem = {
  href: '/dashboard/settings',
  icon: Settings,
  label: 'Settings',
};

// Page Transition Animation
export const PAGE_TRANSITION_VARIANTS: Variants = {
  initial: { opacity: 0, y: 8 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -8 },
};

export const PAGE_TRANSITION_CONFIG: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 25,
  mass: 0.8,
};

// Reduced motion variants (a11y)
export const PAGE_TRANSITION_VARIANTS_REDUCED: Variants = {
  initial: { opacity: 0 },
  in: { opacity: 1 },
  out: { opacity: 0 },
};

export const PAGE_TRANSITION_CONFIG_REDUCED: Transition = {
  type: 'tween',
  ease: 'easeOut',
  duration: 0.15,
};
