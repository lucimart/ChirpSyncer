'use client';

import { useCallback, memo, type FC, type KeyboardEvent } from 'react';
import styled, { css } from 'styled-components';
import { Check } from 'lucide-react';
import { Stack, SmallText, Caption } from '@/components/ui';
import { type StepStatus, type StepIconType, STEP_ICONS } from '../types';

export interface OnboardingStepProps {
  id: string;
  title: string;
  description: string;
  status: StepStatus;
  icon: StepIconType;
  onClick?: () => void;
  isCurrent?: boolean;
}

const ICON_SIZE = 20;

const StepContainer = styled.div<{
  $status: StepStatus;
  $isCurrent: boolean;
  $clickable: boolean;
}>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[4]};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  background-color: ${({ theme }) => theme.colors.background.primary};
  transition: ${({ theme }) => theme.transitions.default};
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};

  ${({ $isCurrent, theme }) =>
    $isCurrent &&
    css`
      border-color: ${theme.colors.primary[500]};
      background-color: ${theme.colors.surface.primary.bg};
      box-shadow: ${theme.shadows.md};
    `}

  ${({ $status, theme }) =>
    $status === 'completed' &&
    css`
      background-color: ${theme.colors.surface.success.bg};
      border-color: ${theme.colors.success[500]};
    `}

  ${({ $clickable, theme }) =>
    $clickable &&
    css`
      &:hover {
        box-shadow: ${theme.shadows.md};
        transform: translateY(-1px);
      }
    `}
`;

const IconWrapper = styled.div<{
  $status: StepStatus;
  $isCurrent: boolean;
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  flex-shrink: 0;

  ${({ $status, $isCurrent, theme }) => {
    if ($status === 'completed') {
      return css`
        background-color: ${theme.colors.success[500]};
        color: white;
      `;
    }
    if ($isCurrent) {
      return css`
        background-color: ${theme.colors.primary[500]};
        color: white;
      `;
    }
    return css`
      background-color: ${theme.colors.background.tertiary};
      color: ${theme.colors.text.secondary};
    `;
  }}
`;

const Title = styled.span<{ $status: StepStatus }>`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme, $status }) =>
    $status === 'completed'
      ? theme.colors.surface.success.text
      : theme.colors.text.primary};
`;

export const OnboardingStep: FC<OnboardingStepProps> = memo(({
  id,
  title,
  description,
  status,
  icon,
  onClick,
  isCurrent = false,
}) => {
  const IconComponent = STEP_ICONS[icon];
  const isCompleted = status === 'completed';
  const isClickable = !isCompleted && !!onClick;

  const handleClick = useCallback(() => {
    if (isClickable) {
      onClick?.();
    }
  }, [isClickable, onClick]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick?.();
      }
    },
    [isClickable, onClick]
  );

  return (
    <StepContainer
      data-testid={`onboarding-step-${id}`}
      data-status={status}
      data-current={isCurrent ? 'true' : undefined}
      data-completed={isCompleted ? 'true' : undefined}
      $status={status}
      $isCurrent={isCurrent}
      $clickable={isClickable}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={isClickable ? 0 : -1}
    >
      <IconWrapper $status={status} $isCurrent={isCurrent}>
        {isCompleted ? <Check size={ICON_SIZE} /> : <IconComponent size={ICON_SIZE} />}
      </IconWrapper>
      <Stack gap={1} style={{ flex: 1, minWidth: 0 }}>
        <SmallText>
          <Title $status={status}>{title}</Title>
        </SmallText>
        <Caption style={{ lineHeight: 1.5 }}>{description}</Caption>
      </Stack>
    </StepContainer>
  );
});

OnboardingStep.displayName = 'OnboardingStep';
