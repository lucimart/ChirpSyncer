// Types
export type {
  StepStatus,
  StepIconType,
  OnboardingStepData,
  OnboardingState,
} from './types';

export {
  STEP_ICONS,
  STORAGE_KEY,
  DEFAULT_STATE,
  DEFAULT_STEPS,
} from './types';

// Provider
export {
  OnboardingProvider,
  useOnboarding,
  OnboardingContext,
} from './OnboardingProvider';
export type {
  OnboardingStep as OnboardingStepDataLegacy,
  OnboardingContextValue,
  OnboardingContextType,
  OnboardingProviderProps,
} from './OnboardingProvider';

// Components
export { OnboardingStep } from './OnboardingStep';
export type { OnboardingStepProps } from './OnboardingStep';

export { OnboardingChecklist } from './OnboardingChecklist';
export type { OnboardingChecklistProps } from './OnboardingChecklist';
