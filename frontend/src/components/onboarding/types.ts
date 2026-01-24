/**
 * Shared types and constants for onboarding components
 */

import type { LucideIcon } from 'lucide-react';
import { Link, RefreshCw, PenLine, Calendar, BarChart2 } from 'lucide-react';

/** Step completion status */
export type StepStatus = 'pending' | 'completed' | 'current';

/** Icon type identifiers */
export type StepIconType = 'link' | 'sync' | 'rule' | 'calendar' | 'chart';

/** Onboarding step data structure */
export interface OnboardingStepData {
  id: string;
  title: string;
  description: string;
  icon: StepIconType;
  targetRoute: string;
  status: StepStatus;
}

/** Onboarding persistent state */
export interface OnboardingState {
  completedSteps: string[];
  skipped: boolean;
}

/** Icon mapping for step types */
export const STEP_ICONS: Record<StepIconType, LucideIcon> = {
  link: Link,
  sync: RefreshCw,
  rule: PenLine,
  calendar: Calendar,
  chart: BarChart2,
} as const;

/** Local storage key for onboarding state */
export const STORAGE_KEY = 'chirpsyncer-onboarding';

/** Default onboarding state */
export const DEFAULT_STATE: OnboardingState = {
  completedSteps: [],
  skipped: false,
} as const;

/** Default onboarding steps configuration */
export const DEFAULT_STEPS: Omit<OnboardingStepData, 'status'>[] = [
  {
    id: 'connect-platform',
    title: 'Connect your first platform',
    description: 'Link your social media accounts to get started',
    icon: 'link',
    targetRoute: '/dashboard/credentials',
  },
  {
    id: 'first-sync',
    title: 'Run your first sync',
    description: 'Synchronize content across your connected platforms',
    icon: 'sync',
    targetRoute: '/dashboard/sync',
  },
  {
    id: 'create-rule',
    title: 'Create a feed rule',
    description: 'Set up rules to customize your content feed',
    icon: 'rule',
    targetRoute: '/dashboard/feed-lab',
  },
  {
    id: 'schedule-post',
    title: 'Schedule your first post',
    description: 'Plan and schedule content for optimal engagement',
    icon: 'calendar',
    targetRoute: '/dashboard/scheduler',
  },
  {
    id: 'view-analytics',
    title: 'Explore analytics',
    description: 'Discover insights about your content performance',
    icon: 'chart',
    targetRoute: '/dashboard/analytics',
  },
] as const;
