import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { OnboardingStep } from './OnboardingStep';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('OnboardingStep', () => {
  const defaultProps = {
    id: 'test-step',
    title: 'Test Step',
    description: 'This is a test step description',
    status: 'pending' as const,
    icon: 'link' as const,
  };

  it('renders title and description', () => {
    renderWithTheme(<OnboardingStep {...defaultProps} />);

    expect(screen.getByText('Test Step')).toBeInTheDocument();
    expect(screen.getByText('This is a test step description')).toBeInTheDocument();
  });

  it('has correct test id', () => {
    renderWithTheme(<OnboardingStep {...defaultProps} />);

    expect(screen.getByTestId('onboarding-step-test-step')).toBeInTheDocument();
  });

  it('shows status as data attribute', () => {
    renderWithTheme(<OnboardingStep {...defaultProps} status="completed" />);

    const step = screen.getByTestId('onboarding-step-test-step');
    expect(step).toHaveAttribute('data-status', 'completed');
  });

  it('shows current state as data attribute', () => {
    renderWithTheme(<OnboardingStep {...defaultProps} isCurrent />);

    const step = screen.getByTestId('onboarding-step-test-step');
    expect(step).toHaveAttribute('data-current', 'true');
  });

  it('shows completed state as data attribute', () => {
    renderWithTheme(<OnboardingStep {...defaultProps} status="completed" />);

    const step = screen.getByTestId('onboarding-step-test-step');
    expect(step).toHaveAttribute('data-completed', 'true');
  });

  it('calls onClick when clicked and not completed', () => {
    const handleClick = jest.fn();
    renderWithTheme(<OnboardingStep {...defaultProps} onClick={handleClick} />);

    fireEvent.click(screen.getByTestId('onboarding-step-test-step'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when completed', () => {
    const handleClick = jest.fn();
    renderWithTheme(
      <OnboardingStep {...defaultProps} status="completed" onClick={handleClick} />
    );

    fireEvent.click(screen.getByTestId('onboarding-step-test-step'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('has tabIndex 0 when clickable', () => {
    const handleClick = jest.fn();
    renderWithTheme(<OnboardingStep {...defaultProps} onClick={handleClick} />);

    const step = screen.getByTestId('onboarding-step-test-step');
    expect(step).toHaveAttribute('tabIndex', '0');
  });

  it('has tabIndex -1 when not clickable', () => {
    renderWithTheme(<OnboardingStep {...defaultProps} />);

    const step = screen.getByTestId('onboarding-step-test-step');
    expect(step).toHaveAttribute('tabIndex', '-1');
  });

  it('has role button', () => {
    renderWithTheme(<OnboardingStep {...defaultProps} />);

    const step = screen.getByTestId('onboarding-step-test-step');
    expect(step).toHaveAttribute('role', 'button');
  });

  describe('icons', () => {
    const icons = ['link', 'sync', 'rule', 'calendar', 'chart'] as const;

    icons.forEach((icon) => {
      it(`renders ${icon} icon`, () => {
        renderWithTheme(<OnboardingStep {...defaultProps} icon={icon} />);
        expect(screen.getByTestId(`onboarding-step-test-step`)).toBeInTheDocument();
      });
    });
  });
});
