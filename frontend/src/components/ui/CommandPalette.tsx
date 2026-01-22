'use client';

import { useEffect, useState, useCallback, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import styled from 'styled-components';
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
  Moon,
  Sun,
  SlidersHorizontal,
  Zap,
  Clock,
  LucideIcon,
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  category: 'action' | 'navigation' | 'recent';
  keywords: string[];
  shortcut?: string;
  action: () => void | Promise<void>;
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 9998;
  animation: fadeIn 0.15s ease;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const StyledCommand = styled(Command)`
  position: fixed;
  top: 20%;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 640px;
  background-color: ${({ theme }) => theme.colors.background.primary};
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  box-shadow: ${({ theme }) => theme.shadows.xl};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  overflow: hidden;
  z-index: 9999;
  animation: slideIn 0.15s ease;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-50%) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) scale(1);
    }
  }
`;

const StyledInput = styled(Command.Input)`
  width: 100%;
  padding: ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  border: none;
  outline: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.text.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`;

const StyledList = styled(Command.List)`
  max-height: 400px;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing[2]};
`;

const StyledEmpty = styled(Command.Empty)`
  padding: ${({ theme }) => theme.spacing[8]};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const StyledGroup = styled(Command.Group)`
  &[hidden] {
    display: none;
  }

  & + & {
    margin-top: ${({ theme }) => theme.spacing[2]};
  }

  [cmdk-group-heading] {
    padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
    font-size: ${({ theme }) => theme.fontSizes.xs};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    color: ${({ theme }) => theme.colors.text.tertiary};
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
`;

const StyledItem = styled(Command.Item)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[3]}`};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &[data-selected='true'] {
    background-color: ${({ theme }) => theme.colors.primary[50]};
  }

  &:hover {
    background-color: ${({ theme }) => theme.colors.background.tertiary};
  }

  &[data-selected='true']:hover {
    background-color: ${({ theme }) => theme.colors.primary[100]};
  }
`;

const ItemIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background-color: ${({ theme }) => theme.colors.background.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};

  svg {
    width: 16px;
    height: 16px;
  }
`;

const ItemContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const ItemTitle = styled.span`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ItemDescription = styled.span`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ItemShortcut = styled.span`
  display: flex;
  gap: 4px;
`;

const Kbd = styled.kbd`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  font-size: 11px;
  font-family: inherit;
  background-color: ${({ theme }) => theme.colors.background.tertiary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: 4px;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]}`};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const FooterHints = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const FooterHint = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
`;

// Safe theme hook that doesn't throw
function useSafeTheme() {
  const [mode, setModeState] = useState<'light' | 'dark'>('dark');
  
  useEffect(() => {
    // Check localStorage for theme preference
    const stored = localStorage.getItem('chirpsyncer-theme-mode');
    if (stored === 'light' || stored === 'dark') {
      setModeState(stored);
    } else if (stored === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setModeState(prefersDark ? 'dark' : 'light');
    }
  }, []);

  const toggleMode = useCallback(() => {
    const newMode = mode === 'dark' ? 'light' : 'dark';
    setModeState(newMode);
    localStorage.setItem('chirpsyncer-theme-mode', newMode);
    // Trigger a page reload to apply theme change
    window.location.reload();
  }, [mode]);

  return { mode, toggleMode };
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { mode, toggleMode } = useSafeTheme();

  // Only render after mount to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Toggle with Ctrl+K or Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = useCallback((command: () => void | Promise<void>) => {
    setOpen(false);
    command();
  }, []);

  const commands: CommandItem[] = [
    // Actions
    {
      id: 'sync_now',
      title: 'Sync Now',
      description: 'Execute sync immediately',
      icon: Zap,
      category: 'action',
      keywords: ['sync', 'run', 'execute', 'now', 'sincronizar'],
      action: () => {
        // TODO: Implement sync action
        console.log('Sync now');
      },
    },
    {
      id: 'toggle_theme',
      title: mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      description: 'Toggle between light and dark theme',
      icon: mode === 'dark' ? Sun : Moon,
      category: 'action',
      keywords: ['theme', 'dark', 'light', 'mode', 'tema', 'oscuro', 'claro'],
      action: toggleMode,
    },
    // Navigation
    {
      id: 'nav_dashboard',
      title: 'Dashboard',
      description: 'Go to dashboard',
      icon: Home,
      category: 'navigation',
      keywords: ['dashboard', 'home', 'inicio'],
      shortcut: 'G D',
      action: () => router.push('/dashboard'),
    },
    {
      id: 'nav_sync',
      title: 'Sync',
      description: 'Manage sync operations',
      icon: RefreshCw,
      category: 'navigation',
      keywords: ['sync', 'sincronizar'],
      shortcut: 'G S',
      action: () => router.push('/dashboard/sync'),
    },
    {
      id: 'nav_scheduler',
      title: 'Scheduler',
      description: 'Schedule posts',
      icon: Calendar,
      category: 'navigation',
      keywords: ['scheduler', 'schedule', 'programar', 'calendario'],
      action: () => router.push('/dashboard/scheduler'),
    },
    {
      id: 'nav_analytics',
      title: 'Analytics',
      description: 'View analytics and insights',
      icon: BarChart3,
      category: 'navigation',
      keywords: ['analytics', 'stats', 'estadisticas', 'metricas'],
      shortcut: 'G A',
      action: () => router.push('/dashboard/analytics'),
    },
    {
      id: 'nav_credentials',
      title: 'Credentials',
      description: 'Manage API credentials',
      icon: Key,
      category: 'navigation',
      keywords: ['credentials', 'api', 'keys', 'credenciales'],
      action: () => router.push('/dashboard/credentials'),
    },
    {
      id: 'nav_connectors',
      title: 'Connectors',
      description: 'Manage platform connections',
      icon: Plug,
      category: 'navigation',
      keywords: ['connectors', 'platforms', 'conectores', 'plataformas'],
      action: () => router.push('/dashboard/connectors'),
    },
    {
      id: 'nav_search',
      title: 'Search',
      description: 'Search posts and content',
      icon: Search,
      category: 'navigation',
      keywords: ['search', 'find', 'buscar'],
      action: () => router.push('/dashboard/search'),
    },
    {
      id: 'nav_cleanup',
      title: 'Cleanup',
      description: 'Manage cleanup rules',
      icon: Trash2,
      category: 'navigation',
      keywords: ['cleanup', 'delete', 'limpieza', 'borrar'],
      action: () => router.push('/dashboard/cleanup'),
    },
    {
      id: 'nav_feedlab',
      title: 'Feed Lab',
      description: 'Customize your algorithm',
      icon: Sparkles,
      category: 'navigation',
      keywords: ['feed', 'lab', 'algorithm', 'algoritmo'],
      action: () => router.push('/dashboard/feed-lab'),
    },
    {
      id: 'nav_algorithm',
      title: 'Algorithm',
      description: 'Configure sync algorithm',
      icon: SlidersHorizontal,
      category: 'navigation',
      keywords: ['algorithm', 'rules', 'algoritmo', 'reglas'],
      action: () => router.push('/dashboard/algorithm'),
    },
    {
      id: 'nav_workspaces',
      title: 'Workspaces',
      description: 'Manage workspaces',
      icon: Users,
      category: 'navigation',
      keywords: ['workspaces', 'teams', 'espacios'],
      action: () => router.push('/dashboard/workspaces'),
    },
    {
      id: 'nav_bookmarks',
      title: 'Bookmarks',
      description: 'View saved bookmarks',
      icon: Bookmark,
      category: 'navigation',
      keywords: ['bookmarks', 'saved', 'guardados', 'favoritos'],
      action: () => router.push('/dashboard/bookmarks'),
    },
    {
      id: 'nav_export',
      title: 'Export',
      description: 'Export your data',
      icon: Download,
      category: 'navigation',
      keywords: ['export', 'download', 'exportar', 'descargar'],
      action: () => router.push('/dashboard/export'),
    },
    {
      id: 'nav_settings',
      title: 'Settings',
      description: 'App settings and preferences',
      icon: Settings,
      category: 'navigation',
      keywords: ['settings', 'preferences', 'configuracion', 'ajustes'],
      shortcut: 'G ,',
      action: () => router.push('/dashboard/settings'),
    },
  ];

  const actionCommands = commands.filter((c) => c.category === 'action');
  const navigationCommands = commands.filter((c) => c.category === 'navigation');

  if (!mounted || !open) return null;

  return (
    <>
      <Overlay onClick={() => setOpen(false)} />
      <StyledCommand
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      >
        <StyledInput placeholder="Search commands, pages, or actions..." autoFocus />
        <StyledList>
          <StyledEmpty>No results found.</StyledEmpty>

          <StyledGroup heading="Quick Actions">
            {actionCommands.map((command) => (
              <StyledItem
                key={command.id}
                value={`${command.title} ${command.keywords.join(' ')}`}
                onSelect={() => runCommand(command.action)}
              >
                <ItemIcon>
                  <command.icon />
                </ItemIcon>
                <ItemContent>
                  <ItemTitle>{command.title}</ItemTitle>
                  {command.description && (
                    <ItemDescription>{command.description}</ItemDescription>
                  )}
                </ItemContent>
                {command.shortcut && (
                  <ItemShortcut>
                    {command.shortcut.split(' ').map((key, i) => (
                      <Kbd key={i}>{key}</Kbd>
                    ))}
                  </ItemShortcut>
                )}
              </StyledItem>
            ))}
          </StyledGroup>

          <StyledGroup heading="Navigation">
            {navigationCommands.map((command) => (
              <StyledItem
                key={command.id}
                value={`${command.title} ${command.keywords.join(' ')}`}
                onSelect={() => runCommand(command.action)}
              >
                <ItemIcon>
                  <command.icon />
                </ItemIcon>
                <ItemContent>
                  <ItemTitle>{command.title}</ItemTitle>
                  {command.description && (
                    <ItemDescription>{command.description}</ItemDescription>
                  )}
                </ItemContent>
                {command.shortcut && (
                  <ItemShortcut>
                    {command.shortcut.split(' ').map((key, i) => (
                      <Kbd key={i}>{key}</Kbd>
                    ))}
                  </ItemShortcut>
                )}
              </StyledItem>
            ))}
          </StyledGroup>
        </StyledList>

        <Footer>
          <FooterHints>
            <FooterHint>
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd>
              Navigate
            </FooterHint>
            <FooterHint>
              <Kbd>↵</Kbd>
              Select
            </FooterHint>
            <FooterHint>
              <Kbd>esc</Kbd>
              Close
            </FooterHint>
          </FooterHints>
          <span>
            <Kbd>Ctrl</Kbd> + <Kbd>K</Kbd> to open
          </span>
        </Footer>
      </StyledCommand>
    </>
  );
}

CommandPalette.displayName = 'CommandPalette';
