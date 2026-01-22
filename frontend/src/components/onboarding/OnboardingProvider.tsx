'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type StepStatus = 'pending' | 'completed' | 'current';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: 'link' | 'sync' | 'rule' | 'calendar' | 'chart';
  targetRoute: string;
  status: StepStatus;
}

interface OnboardingState {
  completedSteps: string[];
  skipped: boolean;
}

interface OnboardingContextValue {
  steps: OnboardingStep[];
  currentStep: OnboardingStep | null;
  progress: number;
  isComplete: boolean;
  completeStep: (stepId: string) => void;
  skipOnboarding: () => void;
}

const STORAGE_KEY = 'chirpsyncer-onboarding';

const DEFAULT_STEPS: Omit<OnboardingStep, 'status'>[] = [
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
];

export const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export type OnboardingContextType = OnboardingContextValue;

function loadState(): OnboardingState {
  if (typeof window === 'undefined') {
    return { completedSteps: [], skipped: false };
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore parse errors
  }

  return { completedSteps: [], skipped: false };
}

function saveState(state: OnboardingState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [state, setState] = useState<OnboardingState>(() => loadState());

  // Reload state on mount (for SSR hydration)
  useEffect(() => {
    setState(loadState());
  }, []);

  const steps: OnboardingStep[] = DEFAULT_STEPS.map((step) => {
    if (state.completedSteps.includes(step.id)) {
      return { ...step, status: 'completed' as StepStatus };
    }
    return { ...step, status: 'pending' as StepStatus };
  });

  // currentStep is the first pending step (without modifying the status array)
  const currentStep = steps.find((s) => s.status === 'pending') || null;

  const progress = Math.round((state.completedSteps.length / DEFAULT_STEPS.length) * 100);

  const isComplete = state.skipped || state.completedSteps.length === DEFAULT_STEPS.length;

  const completeStep = useCallback((stepId: string) => {
    setState((prev) => {
      if (prev.completedSteps.includes(stepId)) {
        return prev;
      }

      const newState = {
        ...prev,
        completedSteps: [...prev.completedSteps, stepId],
      };

      saveState(newState);
      return newState;
    });
  }, []);

  const skipOnboarding = useCallback(() => {
    setState((prev) => {
      const newState = {
        ...prev,
        skipped: true,
      };

      saveState(newState);
      return newState;
    });
  }, []);

  const value: OnboardingContextValue = {
    steps,
    currentStep,
    progress,
    isComplete,
    completeStep,
    skipOnboarding,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);

  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }

  return context;
}
