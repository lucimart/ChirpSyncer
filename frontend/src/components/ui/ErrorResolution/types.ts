/**
 * ErrorResolution Types
 */

export type ActionType = 'auto' | 'manual' | 'link';

export interface ErrorDiagnosis {
  code: string;
  message: string;
  details: string[];
  timestamp: Date;
  lastSuccess?: Date;
}

export interface ResolutionAction {
  type: ActionType;
  label: string;
  handler?: () => Promise<void>;
  href?: string;
}

export interface ResolutionOption {
  id: string;
  title: string;
  description: string;
  recommended: boolean;
  action: ResolutionAction;
}

export interface ErrorResolutionProps {
  error: ErrorDiagnosis;
  options: ResolutionOption[];
  tip?: string;
  onResolve?: (optionId: string) => Promise<void>;
  onContactSupport?: () => void;
  className?: string;
}

// Icon sizes
export const ICON_SIZES = {
  header: 24,
  meta: 14,
  section: 16,
  button: 16,
  tip: 18,
  support: 16,
  badge: 12,
} as const;
