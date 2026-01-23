'use client';

import { useState, useCallback, ReactNode, createContext, useContext } from 'react';
import styled from 'styled-components';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '../Button';
import { Stack } from '../Stack';

// ============ Types ============
export interface WizardStep {
  id: string;
  title: string;
  description?: string;
  content: ReactNode;
  canProceed?: boolean;
  onEnter?: () => void;
  onExit?: () => void;
}

export interface ConnectionWizardProps {
  steps: WizardStep[];
  onComplete: () => void;
  onCancel?: () => void;
  isLoading?: boolean;
  completeButtonText?: string;
  platformColor?: string;
  showStepTitles?: boolean;
}

interface WizardContextValue {
  currentStep: number;
  totalSteps: number;
  goNext: () => void;
  goBack: () => void;
  goToStep: (step: number) => void;
  canGoNext: boolean;
  canGoBack: boolean;
}

// ============ Context ============
const WizardContext = createContext<WizardContextValue | null>(null);

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within a ConnectionWizard');
  }
  return context;
}

// ============ Styled Components ============
const WizardContainer = styled.div`
  min-height: 350px;
  display: flex;
  flex-direction: column;
`;

const StepIndicatorContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[5]};
  padding-bottom: ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const StepDot = styled.button<{ $active: boolean; $completed: boolean; $color?: string }>`
  width: ${({ $active }) => ($active ? '28px' : '10px')};
  height: 10px;
  border-radius: 5px;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: all 0.3s ease;
  background: ${({ $active, $completed, $color, theme }) =>
    $active
      ? $color || theme.colors.primary[500]
      : $completed
        ? theme.colors.success[500]
        : theme.colors.neutral[200]};

  &:hover:not(:disabled) {
    transform: scale(1.1);
  }

  &:disabled {
    cursor: default;
  }
`;

const StepTitle = styled.span<{ $active: boolean }>`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.text.primary : theme.colors.text.tertiary};
  font-weight: ${({ $active, theme }) =>
    $active ? theme.fontWeights.medium : theme.fontWeights.normal};
  transition: all 0.2s ease;
  white-space: nowrap;
`;

const StepContent = styled.div`
  flex: 1;
  overflow-y: auto;
`;

const NavigationFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: ${({ theme }) => theme.spacing[6]};
  padding-top: ${({ theme }) => theme.spacing[4]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const StepCounter = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

// ============ Component ============
export function ConnectionWizard({
  steps,
  onComplete,
  onCancel,
  isLoading = false,
  completeButtonText = 'Connect',
  platformColor,
  showStepTitles = false,
}: ConnectionWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const canProceed = currentStepData?.canProceed !== false;

  const goNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      currentStepData?.onExit?.();
      const nextStep = currentStep + 1;
      steps[nextStep]?.onEnter?.();
      setCurrentStep(nextStep);
    }
  }, [currentStep, steps, currentStepData]);

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      currentStepData?.onExit?.();
      const prevStep = currentStep - 1;
      steps[prevStep]?.onEnter?.();
      setCurrentStep(prevStep);
    }
  }, [currentStep, steps, currentStepData]);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < steps.length && step <= currentStep) {
      currentStepData?.onExit?.();
      steps[step]?.onEnter?.();
      setCurrentStep(step);
    }
  }, [steps, currentStep, currentStepData]);

  const handleComplete = () => {
    currentStepData?.onExit?.();
    onComplete();
  };

  const contextValue: WizardContextValue = {
    currentStep,
    totalSteps: steps.length,
    goNext,
    goBack,
    goToStep,
    canGoNext: canProceed && !isLastStep,
    canGoBack: currentStep > 0,
  };

  return (
    <WizardContext.Provider value={contextValue}>
      <WizardContainer>
        <StepIndicatorContainer>
          {steps.map((step, index) => (
            <Stack key={step.id} direction="row" align="center" gap={1}>
              <StepDot
                $active={index === currentStep}
                $completed={index < currentStep}
                $color={platformColor}
                onClick={() => goToStep(index)}
                disabled={index > currentStep}
                title={step.title}
              />
              {showStepTitles && (
                <StepTitle $active={index === currentStep}>
                  {step.title}
                </StepTitle>
              )}
            </Stack>
          ))}
        </StepIndicatorContainer>

        <StepContent>
          {currentStepData?.content}
        </StepContent>

        <NavigationFooter>
          <div>
            {currentStep > 0 ? (
              <Button variant="ghost" onClick={goBack} disabled={isLoading}>
                <ArrowLeft size={16} />
                Back
              </Button>
            ) : onCancel ? (
              <Button variant="ghost" onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
            ) : (
              <div />
            )}
          </div>

          <StepCounter>
            Step {currentStep + 1} of {steps.length}
          </StepCounter>

          <div>
            {isLastStep ? (
              <Button onClick={handleComplete} disabled={!canProceed} isLoading={isLoading}>
                <Check size={16} />
                {completeButtonText}
              </Button>
            ) : (
              <Button onClick={goNext} disabled={!canProceed}>
                Continue
                <ArrowRight size={16} />
              </Button>
            )}
          </div>
        </NavigationFooter>
      </WizardContainer>
    </WizardContext.Provider>
  );
}

export default ConnectionWizard;
