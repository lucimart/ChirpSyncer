import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { OnboardingChecklist } from './OnboardingChecklist';
import { OnboardingContext, OnboardingContextType, OnboardingStep } from '../OnboardingProvider';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const createMockSteps = (completedCount: number): OnboardingStep[] => [
  {
    id: 'connect-platform',
    title: 'Connect your first platform',
    description: 'Link your social media accounts to get started',
    icon: 'link',
    targetRoute: '/dashboard/credentials',
    status: completedCount > 0 ? 'completed' : 'pending',
  },
  {
    id: 'first-sync',
    title: 'Run your first sync',
    description: 'Synchronize content across your connected platforms',
    icon: 'sync',
    targetRoute: '/dashboard/sync',
    status: completedCount > 1 ? 'completed' : 'pending',
  },
  {
    id: 'create-rule',
    title: 'Create a feed rule',
    description: 'Set up rules to customize your content feed',
    icon: 'rule',
    targetRoute: '/dashboard/feed-lab',
    status: completedCount > 2 ? 'completed' : 'pending',
  },
  {
    id: 'schedule-post',
    title: 'Schedule your first post',
    description: 'Plan and schedule content for optimal engagement',
    icon: 'calendar',
    targetRoute: '/dashboard/scheduler',
    status: completedCount > 3 ? 'completed' : 'pending',
  },
  {
    id: 'view-analytics',
    title: 'Explore analytics',
    description: 'Discover insights about your content performance',
    icon: 'chart',
    targetRoute: '/dashboard/analytics',
    status: completedCount > 4 ? 'completed' : 'pending',
  },
];

const createMockContext = (overrides: Partial<OnboardingContextType> = {}): OnboardingContextType => {
  const steps = createMockSteps(0);
  return {
    steps,
    currentStep: steps[0],
    progress: 0,
    isComplete: false,
    completeStep: jest.fn(),
    skipOnboarding: jest.fn(),
    ...overrides,
  };
};

const renderWithContext = (contextValue: OnboardingContextType) => {
  return render(
    <ThemeProvider theme={theme}>
      <OnboardingContext.Provider value={contextValue}>
        <OnboardingChecklist />
      </OnboardingContext.Provider>
    </ThemeProvider>
  );
};

describe('OnboardingChecklist', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('renders the checklist with title', () => {
    const context = createMockContext();
    renderWithContext(context);

    expect(screen.getByText('Getting Started')).toBeInTheDocument();
  });

  it('renders all onboarding steps', () => {
    const context = createMockContext();
    renderWithContext(context);

    expect(screen.getByText('Connect your first platform')).toBeInTheDocument();
    expect(screen.getByText('Run your first sync')).toBeInTheDocument();
    expect(screen.getByText('Create a feed rule')).toBeInTheDocument();
    expect(screen.getByText('Schedule your first post')).toBeInTheDocument();
    expect(screen.getByText('Explore analytics')).toBeInTheDocument();
  });

  it('displays progress percentage', () => {
    const context = createMockContext({ progress: 40 });
    renderWithContext(context);

    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('has accessible progressbar', () => {
    const context = createMockContext({ progress: 60 });
    renderWithContext(context);

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '60');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
  });

  it('navigates to step route on click', () => {
    const context = createMockContext();
    renderWithContext(context);

    const firstStep = screen.getByText('Connect your first platform').closest('[data-testid="onboarding-step"]');
    fireEvent.click(firstStep!);

    expect(mockPush).toHaveBeenCalledWith('/dashboard/credentials');
  });

  it('renders skip button', () => {
    const context = createMockContext();
    renderWithContext(context);

    expect(screen.getByText('Skip for now')).toBeInTheDocument();
  });

  it('calls skipOnboarding when skip button is clicked', () => {
    const skipOnboarding = jest.fn();
    const context = createMockContext({ skipOnboarding });
    renderWithContext(context);

    fireEvent.click(screen.getByText('Skip for now'));

    expect(skipOnboarding).toHaveBeenCalled();
  });

  it('renders completion state when isComplete is true', () => {
    const steps = createMockSteps(5);
    const context = createMockContext({
      steps,
      currentStep: null,
      progress: 100,
      isComplete: true,
    });
    renderWithContext(context);

    expect(screen.getByText('All done!')).toBeInTheDocument();
    expect(screen.getByText(/You have completed the onboarding/)).toBeInTheDocument();
    expect(screen.queryByText('Getting Started')).not.toBeInTheDocument();
  });

  it('does not render skip button when complete', () => {
    const context = createMockContext({ isComplete: true, progress: 100 });
    renderWithContext(context);

    expect(screen.queryByText('Skip for now')).not.toBeInTheDocument();
  });

  it('highlights current step', () => {
    const steps = createMockSteps(2);
    const context = createMockContext({
      steps,
      currentStep: steps[2], // create-rule is current
      progress: 40,
    });
    renderWithContext(context);

    const currentStepElement = screen.getByText('Create a feed rule').closest('[data-testid="onboarding-step"]');
    expect(currentStepElement).toHaveAttribute('data-current', 'true');
  });
});
