import { type LucideIcon } from 'lucide-react';

export type CommandCategory = 'navigation' | 'action' | 'settings' | 'recent';

export interface Command {
  id: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  keywords: string[];
  action: () => void | Promise<void>;
  shortcut?: string;
  category: CommandCategory;
}

export interface CommandGroup {
  heading: string;
  commands: Command[];
}
