'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type FC,
  type ReactNode,
} from 'react';
import {
  type StepStatus,
  type OnboardingStepData,
  type OnboardingState,
  STORAGE_KEY,
  DEFAULT_STATE,
  DEFAULT_STEPS,
} from './types';

// Re-export types for backwards compatibility
export type { StepStatus };
export type OnboardingStep = OnboardingStepData;

/** Onboarding context value */
export interface OnboardingContextValue {
  steps: OnboardingStepData[];
  currentStep: OnboardingStepData | null;
  progress: number;
  isComplete: boolean;
  completeStep: (stepId: string) => void;
  skipOnboarding: () => void;
}

/** @deprecated Use OnboardingContextValue instead */
export type OnboardingContextType = OnboardingContextValue;

export const OnboardingContext = createContext<OnboardingContextValue | null>(null);

/** Load onboarding state from localStorage */
function loadState(): OnboardingState {
  if (typeof window === 'undefined') {
    return DEFAULT_STATE;
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved) as OnboardingState;
    }
  } catch {
    // Ignore parse errors
  }

  return DEFAULT_STATE;
}

/** Save onboarding state to localStorage */
function saveState(state: OnboardingState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

export interface OnboardingProviderProps {
  children: ReactNode;
}

export const OnboardingProvider: FC<OnboardingProviderProps> = ({ children }) => {
  const [state, setState] = useState<OnboardingState>(loadState);

  // Reload state on mount (for SSR hydration)
  useEffect(() => {
    setState(loadState());
  }, []);

  const steps = useMemo<OnboardingStepData[]>(
    () =>
      DEFAULT_STEPS.map((step) => ({
        ...step,
        status: state.completedSteps.includes(step.id) ? 'completed' : 'pending',
      })),
    [state.completedSteps]
  );

  const currentStep = useMemo(
    () => steps.find((s) => s.status === 'pending') ?? null,
    [steps]
  );

  const progress = useMemo(
    () => Math.round((state.completedSteps.length / DEFAULT_STEPS.length) * 100),
    [state.completedSteps.length]
  );

  const isComplete = useMemo(
    () => state.skipped || state.completedSteps.length === DEFAULT_STEPS.length,
    [state.skipped, state.completedSteps.length]
  );

  const completeStep = useCallback((stepId: string) => {
    setState((prev) => {
      if (prev.completedSteps.includes(stepId)) {
        return prev;
      }

      const newState: OnboardingState = {
        ...prev,
        completedSteps: [...prev.completedSteps, stepId],
      };

      saveState(newState);
      return newState;
    });
  }, []);

  const skipOnboarding = useCallback(() => {
    setState((prev) => {
      const newState: OnboardingState = {
        ...prev,
        skipped: true,
      };

      saveState(newState);
      return newState;
    });
  }, []);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      steps,
      currentStep,
      progress,
      isComplete,
      completeStep,
      skipOnboarding,
    }),
    [steps, currentStep, progress, isComplete, completeStep, skipOnboarding]
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

/** Hook to access onboarding context */
export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);

  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }

  return context;
}
