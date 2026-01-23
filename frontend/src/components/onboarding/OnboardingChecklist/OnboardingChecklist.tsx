'use client';

import { useCallback, memo, type FC } from 'react';
import styled, { useTheme } from 'styled-components';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { Card, Stack, SectionTitle, SmallText, Button, Progress } from '@/components/ui';
import { useOnboarding } from '../OnboardingProvider';
import { OnboardingStep } from '../OnboardingStep';

export interface OnboardingChecklistProps {
  className?: string;
}

const Header = styled.div`
  padding: ${({ theme }) => `${theme.spacing[5]} ${theme.spacing[6]}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const Footer = styled.div`
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[6]}`};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  display: flex;
  justify-content: center;
`;

const COMPLETE_ICON_SIZE = 64;

const StepList = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: 16px;
`;

const StepWrapper = styled(motion.div)``;

const CompleteWrapper = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: 32px;
  text-align: center;
`;

const listVariants = {
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const stepVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

const completeVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 },
};

export const OnboardingChecklist: FC<OnboardingChecklistProps> = memo(({ className }) => {
  const router = useRouter();
  const theme = useTheme();
  const { steps, currentStep, progress, isComplete, skipOnboarding } = useOnboarding();

  const handleStepClick = useCallback(
    (targetRoute: string) => {
      router.push(targetRoute);
    },
    [router]
  );

  if (isComplete) {
    return (
      <Card padding="none" className={className}>
        <CompleteWrapper
          variants={completeVariants}
          initial="hidden"
          animate="visible"
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <motion.div
            style={{ color: theme.colors.success[500] }}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
          >
            <CheckCircle2 size={COMPLETE_ICON_SIZE} />
          </motion.div>
          <SectionTitle>All done!</SectionTitle>
          <SmallText>
            You have completed the onboarding. Enjoy using ChirpSyncer!
          </SmallText>
        </CompleteWrapper>
      </Card>
    );
  }

  return (
    <Card padding="none" className={className}>
      <Header>
        <SectionTitle style={{ marginBottom: '16px' }}>Getting Started</SectionTitle>
        <Progress
          value={progress}
          showValue={false}
          size="md"
          aria-label={`Onboarding progress: ${progress}% complete`}
        />
        <SmallText style={{ marginTop: '8px', textAlign: 'right' }}>
          {progress}% complete
        </SmallText>
      </Header>

      <StepList
        variants={listVariants}
        initial="hidden"
        animate="visible"
      >
        {steps.map((step) => (
          <StepWrapper
            key={step.id}
            variants={stepVariants}
            transition={{ duration: 0.2 }}
          >
            <OnboardingStep
              id={step.id}
              title={step.title}
              description={step.description}
              status={step.status}
              icon={step.icon}
              isCurrent={currentStep?.id === step.id}
              onClick={() => handleStepClick(step.targetRoute)}
            />
          </StepWrapper>
        ))}
      </StepList>

      <Footer>
        <Button variant="ghost" size="sm" onClick={skipOnboarding}>
          Skip for now
        </Button>
      </Footer>
    </Card>
  );
});

OnboardingChecklist.displayName = 'OnboardingChecklist';
