'use client';

/**
 * CommandPalette Component
 *
 * Global command palette for quick navigation and actions,
 * triggered with Ctrl+K / Cmd+K.
 */

import { useEffect, useState, useCallback, useMemo, memo, type FC } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import styled from 'styled-components';
import { Moon, Sun } from 'lucide-react';
import {
  type CommandItem,
  NAV_COMMANDS,
  SYNC_NOW_COMMAND,
  THEME_STORAGE_KEY,
} from './types';

// Styled Components
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
    background-color: ${({ theme }) => theme.colors.surface.primary.bg};
  }

  &:hover {
    background-color: ${({ theme }) => theme.colors.background.tertiary};
  }

  &[data-selected='true']:hover {
    background-color: ${({ theme }) => theme.colors.surface.primary.bg};
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

// Hook for theme management
function useSafeTheme() {
  const [mode, setModeState] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
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
    localStorage.setItem(THEME_STORAGE_KEY, newMode);
    window.location.reload();
  }, [mode]);

  return { mode, toggleMode };
}

/**
 * CommandPalette Component
 */
export const CommandPalette: FC = memo(() => {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { mode, toggleMode } = useSafeTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Toggle with Ctrl+K or Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = useCallback((command: () => void | Promise<void>) => {
    setOpen(false);
    command();
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
    }
  }, []);

  // Build commands with router
  const commands = useMemo((): CommandItem[] => {
    const actionCommands: CommandItem[] = [
      {
        ...SYNC_NOW_COMMAND,
        category: 'action',
        action: () => {
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
    ];

    const navigationCommands: CommandItem[] = NAV_COMMANDS.map((cmd) => ({
      id: cmd.id,
      title: cmd.title,
      description: cmd.description,
      icon: cmd.icon,
      category: 'navigation' as const,
      keywords: cmd.keywords,
      shortcut: cmd.shortcut,
      action: () => router.push(cmd.path),
    }));

    return [...actionCommands, ...navigationCommands];
  }, [mode, toggleMode, router]);

  const actionCommands = useMemo(
    () => commands.filter((c) => c.category === 'action'),
    [commands]
  );

  const navigationCommands = useMemo(
    () => commands.filter((c) => c.category === 'navigation'),
    [commands]
  );

  if (!mounted || !open) return null;

  return (
    <>
      <Overlay onClick={handleClose} />
      <StyledCommand onKeyDown={handleKeyDown}>
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
});

CommandPalette.displayName = 'CommandPalette';
