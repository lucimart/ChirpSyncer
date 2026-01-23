import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

export const mockOnboardingContext = {
  steps: [
    { id: 'connect-platform', title: 'Connect Platform', status: 'completed' as const },
    { id: 'first-sync', title: 'First Sync', status: 'pending' as const },
    { id: 'explore-features', title: 'Explore Features', status: 'pending' as const },
  ],
  currentStep: { id: 'first-sync', title: 'First Sync', status: 'pending' as const },
  progress: 33,
  isComplete: false,
  showChecklist: true,
  completeStep: jest.fn(),
  dismissChecklist: jest.fn(),
  resetOnboarding: jest.fn(),
};

export const OnboardingContext = createContext(mockOnboardingContext);

export const MockOnboardingProvider = ({ children }: { children: ReactNode }) => (
  <OnboardingContext.Provider value={mockOnboardingContext}>
    {children}
  </OnboardingContext.Provider>
);

export const useOnboarding = () => useContext(OnboardingContext);
