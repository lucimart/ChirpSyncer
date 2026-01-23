/**
 * CommandPalette Types and Constants
 */

import type { LucideIcon } from 'lucide-react';
import {
  Home,
  RefreshCw,
  Calendar,
  BarChart3,
  Settings,
  Key,
  Plug,
  Search,
  Trash2,
  Sparkles,
  Users,
  Bookmark,
  Download,
  SlidersHorizontal,
  Zap,
} from 'lucide-react';

// Types
export type CommandCategory = 'action' | 'navigation' | 'recent';

export interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  category: CommandCategory;
  keywords: string[];
  shortcut?: string;
  action: () => void | Promise<void>;
}

export interface CommandPaletteState {
  open: boolean;
  mounted: boolean;
}

// Navigation Commands (static - don't need router)
export interface NavCommandConfig {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  keywords: string[];
  shortcut?: string;
  path: string;
}

export const NAV_COMMANDS: NavCommandConfig[] = [
  {
    id: 'nav_dashboard',
    title: 'Dashboard',
    description: 'Go to dashboard',
    icon: Home,
    keywords: ['dashboard', 'home', 'inicio'],
    shortcut: 'G D',
    path: '/dashboard',
  },
  {
    id: 'nav_sync',
    title: 'Sync',
    description: 'Manage sync operations',
    icon: RefreshCw,
    keywords: ['sync', 'sincronizar'],
    shortcut: 'G S',
    path: '/dashboard/sync',
  },
  {
    id: 'nav_scheduler',
    title: 'Scheduler',
    description: 'Schedule posts',
    icon: Calendar,
    keywords: ['scheduler', 'schedule', 'programar', 'calendario'],
    path: '/dashboard/scheduler',
  },
  {
    id: 'nav_analytics',
    title: 'Analytics',
    description: 'View analytics and insights',
    icon: BarChart3,
    keywords: ['analytics', 'stats', 'estadisticas', 'metricas'],
    shortcut: 'G A',
    path: '/dashboard/analytics',
  },
  {
    id: 'nav_credentials',
    title: 'Credentials',
    description: 'Manage API credentials',
    icon: Key,
    keywords: ['credentials', 'api', 'keys', 'credenciales'],
    path: '/dashboard/credentials',
  },
  {
    id: 'nav_connectors',
    title: 'Connectors',
    description: 'Manage platform connections',
    icon: Plug,
    keywords: ['connectors', 'platforms', 'conectores', 'plataformas'],
    path: '/dashboard/connectors',
  },
  {
    id: 'nav_search',
    title: 'Search',
    description: 'Search posts and content',
    icon: Search,
    keywords: ['search', 'find', 'buscar'],
    path: '/dashboard/search',
  },
  {
    id: 'nav_cleanup',
    title: 'Cleanup',
    description: 'Manage cleanup rules',
    icon: Trash2,
    keywords: ['cleanup', 'delete', 'limpieza', 'borrar'],
    path: '/dashboard/cleanup',
  },
  {
    id: 'nav_feedlab',
    title: 'Feed Lab',
    description: 'Customize your algorithm',
    icon: Sparkles,
    keywords: ['feed', 'lab', 'algorithm', 'algoritmo'],
    path: '/dashboard/feed-lab',
  },
  {
    id: 'nav_algorithm',
    title: 'Algorithm',
    description: 'Configure sync algorithm',
    icon: SlidersHorizontal,
    keywords: ['algorithm', 'rules', 'algoritmo', 'reglas'],
    path: '/dashboard/algorithm',
  },
  {
    id: 'nav_workspaces',
    title: 'Workspaces',
    description: 'Manage workspaces',
    icon: Users,
    keywords: ['workspaces', 'teams', 'espacios'],
    path: '/dashboard/workspaces',
  },
  {
    id: 'nav_bookmarks',
    title: 'Bookmarks',
    description: 'View saved bookmarks',
    icon: Bookmark,
    keywords: ['bookmarks', 'saved', 'guardados', 'favoritos'],
    path: '/dashboard/bookmarks',
  },
  {
    id: 'nav_export',
    title: 'Export',
    description: 'Export your data',
    icon: Download,
    keywords: ['export', 'download', 'exportar', 'descargar'],
    path: '/dashboard/export',
  },
  {
    id: 'nav_settings',
    title: 'Settings',
    description: 'App settings and preferences',
    icon: Settings,
    keywords: ['settings', 'preferences', 'configuracion', 'ajustes'],
    shortcut: 'G ,',
    path: '/dashboard/settings',
  },
];

// Action command for sync
export const SYNC_NOW_COMMAND: Omit<CommandItem, 'category' | 'action'> = {
  id: 'sync_now',
  title: 'Sync Now',
  description: 'Execute sync immediately',
  icon: Zap,
  keywords: ['sync', 'run', 'execute', 'now', 'sincronizar'],
};

// Theme storage key
export const THEME_STORAGE_KEY = 'chirpsyncer-theme-mode';
