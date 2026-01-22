/**
 * Onboarding Gamificado Tests (TDD)
 * 
 * Tests for the onboarding system that guides new users through setup
 * with progress tracking and gamification elements.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';

// Components to be implemented
import { OnboardingProvider, useOnboarding } from '@/components/onboarding/OnboardingProvider';
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist';
import { OnboardingStep } from '@/components/onboarding/OnboardingStep';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      <OnboardingProvider>
        {ui}
      </OnboardingProvider>
    </ThemeProvider>
  );
};

// Test component to access hook
const TestHookConsumer = () => {
  const { 
    steps, 
    currentStep, 
    progress, 
    completeStep, 
    skipOnboarding,
    isComplete 
  } = useOnboarding();
  
  return (
    <div>
      <div data-testid="progress">{progress}%</div>
      <div data-testid="current-step">{currentStep?.id || 'none'}</div>
      <div data-testid="is-complete">{isComplete ? 'yes' : 'no'}</div>
      <div data-testid="steps-count">{steps.length}</div>
      {steps.map(step => (
        <div key={step.id} data-testid={`step-${step.id}`}>
          {step.status}
        </div>
      ))}
      <button onClick={() => completeStep('connect-platform')}>Complete Connect</button>
      <button onClick={skipOnboarding}>Skip</button>
    </div>
  );
};

describe('OnboardingProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  describe('Initial State', () => {
    it('provides default onboarding steps', () => {
      renderWithProviders(<TestHookConsumer />);
      
      // Should have 5 default steps as per the plan
      expect(screen.getByTestId('steps-count')).toHaveTextContent('5');
    });

    it('starts with 0% progress for new users', () => {
      renderWithProviders(<TestHookConsumer />);
      
      expect(screen.getByTestId('progress')).toHaveTextContent('0%');
    });

    it('sets first step as current step', () => {
      renderWithProviders(<TestHookConsumer />);
      
      expect(screen.getByTestId('current-step')).toHaveTextContent('connect-platform');
    });

    it('marks all steps as pending initially', () => {
      renderWithProviders(<TestHookConsumer />);
      
      expect(screen.getByTestId('step-connect-platform')).toHaveTextContent('pending');
      expect(screen.getByTestId('step-first-sync')).toHaveTextContent('pending');
    });
  });

  describe('Step Completion', () => {
    it('marks step as completed when completeStep is called', async () => {
      renderWithProviders(<TestHookConsumer />);
      
      const completeButton = screen.getByText('Complete Connect');
      await act(async () => {
        fireEvent.click(completeButton);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('step-connect-platform')).toHaveTextContent('completed');
      });
    });

    it('updates progress when step is completed', async () => {
      renderWithProviders(<TestHookConsumer />);
      
      const completeButton = screen.getByText('Complete Connect');
      await act(async () => {
        fireEvent.click(completeButton);
      });
      
      await waitFor(() => {
        // 1 of 5 steps = 20%
        expect(screen.getByTestId('progress')).toHaveTextContent('20%');
      });
    });

    it('advances to next step after completion', async () => {
      renderWithProviders(<TestHookConsumer />);
      
      const completeButton = screen.getByText('Complete Connect');
      await act(async () => {
        fireEvent.click(completeButton);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('current-step')).toHaveTextContent('first-sync');
      });
    });

    it('persists progress to localStorage', async () => {
      renderWithProviders(<TestHookConsumer />);
      
      const completeButton = screen.getByText('Complete Connect');
      await act(async () => {
        fireEvent.click(completeButton);
      });
      
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'chirpsyncer-onboarding',
          expect.any(String)
        );
      });
    });
  });

  describe('Skip Onboarding', () => {
    it('marks onboarding as complete when skipped', async () => {
      renderWithProviders(<TestHookConsumer />);
      
      const skipButton = screen.getByText('Skip');
      await act(async () => {
        fireEvent.click(skipButton);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('is-complete')).toHaveTextContent('yes');
      });
    });

    it('persists skip state to localStorage', async () => {
      renderWithProviders(<TestHookConsumer />);
      
      const skipButton = screen.getByText('Skip');
      await act(async () => {
        fireEvent.click(skipButton);
      });
      
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'chirpsyncer-onboarding',
          expect.stringContaining('"skipped":true')
        );
      });
    });
  });

  describe('Persistence', () => {
    it('restores progress from localStorage on mount', () => {
      const savedState = JSON.stringify({
        completedSteps: ['connect-platform'],
        skipped: false,
      });
      localStorageMock.getItem.mockReturnValue(savedState);
      
      renderWithProviders(<TestHookConsumer />);
      
      expect(screen.getByTestId('step-connect-platform')).toHaveTextContent('completed');
      expect(screen.getByTestId('progress')).toHaveTextContent('20%');
    });
  });
});

describe('OnboardingChecklist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    // Reset mockReturnValue to use the actual store
    localStorageMock.getItem.mockImplementation((key: string) => null);
  });

  it('renders checklist with all steps', () => {
    renderWithProviders(<OnboardingChecklist />);
    
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
    expect(screen.getByText(/Connect your first platform/i)).toBeInTheDocument();
    expect(screen.getByText(/Run your first sync/i)).toBeInTheDocument();
  });

  it('displays progress bar', () => {
    renderWithProviders(<OnboardingChecklist />);
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows completed steps with checkmark', async () => {
    const savedState = JSON.stringify({
      completedSteps: ['connect-platform'],
      skipped: false,
    });
    localStorageMock.getItem.mockReturnValue(savedState);
    
    renderWithProviders(<OnboardingChecklist />);
    
    // The completed step should have a checkmark icon
    const completedStep = screen.getByTestId('onboarding-step-connect-platform');
    expect(completedStep).toHaveAttribute('data-completed', 'true');
  });

  it('highlights current step', () => {
    renderWithProviders(<OnboardingChecklist />);
    
    const currentStep = screen.getByTestId('onboarding-step-connect-platform');
    expect(currentStep).toHaveAttribute('data-current', 'true');
  });

  it('renders skip button', () => {
    renderWithProviders(<OnboardingChecklist />);
    
    expect(screen.getByText(/Skip for now/i)).toBeInTheDocument();
  });

  it('hides checklist when onboarding is complete', () => {
    const savedState = JSON.stringify({
      completedSteps: ['connect-platform', 'first-sync', 'create-rule', 'schedule-post', 'view-analytics'],
      skipped: false,
    });
    localStorageMock.getItem.mockReturnValue(savedState);
    
    renderWithProviders(<OnboardingChecklist />);
    
    // Should show completion message instead of checklist
    expect(screen.getByText(/All done/i)).toBeInTheDocument();
  });

  it('navigates to relevant page when step is clicked', async () => {
    renderWithProviders(<OnboardingChecklist />);
    
    const connectStep = screen.getByTestId('onboarding-step-connect-platform');
    await act(async () => {
      fireEvent.click(connectStep);
    });
    
    expect(mockPush).toHaveBeenCalledWith('/dashboard/credentials');
  });
});

describe('OnboardingStep', () => {
  const defaultProps = {
    id: 'test-step',
    title: 'Test Step',
    description: 'This is a test step',
    status: 'pending' as const,
    icon: 'link' as const,
    onClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders step title and description', () => {
    render(
      <ThemeProvider theme={theme}>
        <OnboardingStep {...defaultProps} />
      </ThemeProvider>
    );
    
    expect(screen.getByText('Test Step')).toBeInTheDocument();
    expect(screen.getByText('This is a test step')).toBeInTheDocument();
  });

  it('shows pending state correctly', () => {
    render(
      <ThemeProvider theme={theme}>
        <OnboardingStep {...defaultProps} status="pending" />
      </ThemeProvider>
    );
    
    const step = screen.getByTestId('onboarding-step-test-step');
    expect(step).toHaveAttribute('data-status', 'pending');
  });

  it('shows completed state with checkmark', () => {
    render(
      <ThemeProvider theme={theme}>
        <OnboardingStep {...defaultProps} status="completed" />
      </ThemeProvider>
    );
    
    const step = screen.getByTestId('onboarding-step-test-step');
    expect(step).toHaveAttribute('data-status', 'completed');
  });

  it('shows current state with highlight', () => {
    render(
      <ThemeProvider theme={theme}>
        <OnboardingStep {...defaultProps} isCurrent />
      </ThemeProvider>
    );
    
    const step = screen.getByTestId('onboarding-step-test-step');
    expect(step).toHaveAttribute('data-current', 'true');
  });

  it('calls onClick when clicked', async () => {
    const onClick = jest.fn();
    render(
      <ThemeProvider theme={theme}>
        <OnboardingStep {...defaultProps} onClick={onClick} />
      </ThemeProvider>
    );
    
    const step = screen.getByTestId('onboarding-step-test-step');
    await act(async () => {
      fireEvent.click(step);
    });
    
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is not clickable when completed', async () => {
    const onClick = jest.fn();
    render(
      <ThemeProvider theme={theme}>
        <OnboardingStep {...defaultProps} status="completed" onClick={onClick} />
      </ThemeProvider>
    );
    
    const step = screen.getByTestId('onboarding-step-test-step');
    await act(async () => {
      fireEvent.click(step);
    });
    
    // Should not call onClick for completed steps
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('Onboarding Steps Definition', () => {
  it('defines connect-platform step', () => {
    renderWithProviders(<TestHookConsumer />);
    expect(screen.getByTestId('step-connect-platform')).toBeInTheDocument();
  });

  it('defines first-sync step', () => {
    renderWithProviders(<TestHookConsumer />);
    expect(screen.getByTestId('step-first-sync')).toBeInTheDocument();
  });

  it('defines create-rule step', () => {
    renderWithProviders(<TestHookConsumer />);
    expect(screen.getByTestId('step-create-rule')).toBeInTheDocument();
  });

  it('defines schedule-post step', () => {
    renderWithProviders(<TestHookConsumer />);
    expect(screen.getByTestId('step-schedule-post')).toBeInTheDocument();
  });

  it('defines view-analytics step', () => {
    renderWithProviders(<TestHookConsumer />);
    expect(screen.getByTestId('step-view-analytics')).toBeInTheDocument();
  });
});
