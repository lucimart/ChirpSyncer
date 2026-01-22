'use client';

import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';
import { useOnboarding } from './OnboardingProvider';
import { OnboardingStep } from './OnboardingStep';

const ChecklistCard = styled.div`
  background-color: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  overflow: hidden;
`;

const Header = styled.div`
  padding: ${({ theme }) => `${theme.spacing[5]} ${theme.spacing[6]}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const Title = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing[4]} 0;
`;

const ProgressWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const ProgressTrack = styled.div`
  flex: 1;
  height: 8px;
  background-color: ${({ theme }) => theme.colors.neutral[200]};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  overflow: hidden;
`;

const ProgressFill = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${({ $progress }) => `${$progress}%`};
  background-color: ${({ theme }) => theme.colors.primary[500]};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  transition: width 0.3s ease-out;
`;

const ProgressText = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
  min-width: 40px;
`;

const StepsList = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const Footer = styled.div`
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[6]}`};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  display: flex;
  justify-content: center;
`;

const SkipButton = styled.button`
  background: none;
  border: none;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]}`};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  transition: ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.text.secondary};
    background-color: ${({ theme }) => theme.colors.neutral[100]};
  }
`;

const CompletionContainer = styled.div`
  padding: ${({ theme }) => theme.spacing[8]};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const CompletionIcon = styled.div`
  color: ${({ theme }) => theme.colors.success[500]};
`;

const CompletionTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const CompletionText = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.base};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
`;

// Map provider icon types to OnboardingStep icon types
const iconMap: Record<string, 'link' | 'sync' | 'rule' | 'calendar' | 'chart'> = {
  link: 'link',
  sync: 'sync',
  rule: 'rule',
  calendar: 'calendar',
  chart: 'chart',
};

export function OnboardingChecklist() {
  const router = useRouter();
  const { steps, currentStep, progress, isComplete, skipOnboarding } = useOnboarding();

  if (isComplete) {
    return (
      <ChecklistCard>
        <CompletionContainer>
          <CompletionIcon>
            <CheckCircle2 size={64} />
          </CompletionIcon>
          <CompletionTitle>All done!</CompletionTitle>
          <CompletionText>
            You have completed the onboarding. Enjoy using ChirpSyncer!
          </CompletionText>
        </CompletionContainer>
      </ChecklistCard>
    );
  }

  return (
    <ChecklistCard>
      <Header>
        <Title>Getting Started</Title>
        <ProgressWrapper>
          <ProgressTrack
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <ProgressFill $progress={progress} />
          </ProgressTrack>
          <ProgressText>{progress}%</ProgressText>
        </ProgressWrapper>
      </Header>

      <StepsList>
        {steps.map((step) => {
          const isCurrent = currentStep?.id === step.id;
          const mappedIcon = iconMap[step.icon] || 'link';

          return (
            <OnboardingStep
              key={step.id}
              id={step.id}
              title={step.title}
              description={step.description}
              status={step.status}
              icon={mappedIcon}
              isCurrent={isCurrent}
              onClick={() => router.push(step.targetRoute)}
            />
          );
        })}
      </StepsList>

      <Footer>
        <SkipButton onClick={skipOnboarding}>Skip for now</SkipButton>
      </Footer>
    </ChecklistCard>
  );
}
