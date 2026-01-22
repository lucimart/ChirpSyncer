'use client';

import styled, { css } from 'styled-components';
import { Link, RefreshCw, PenLine, Calendar, BarChart2, Check } from 'lucide-react';

export type StepStatus = 'pending' | 'completed' | 'current';

export interface OnboardingStepProps {
  id: string;
  title: string;
  description: string;
  status: StepStatus;
  icon: 'link' | 'sync' | 'rule' | 'calendar' | 'chart';
  onClick?: () => void;
  isCurrent?: boolean;
}

const iconMap = {
  link: Link,
  sync: RefreshCw,
  rule: PenLine,
  calendar: Calendar,
  chart: BarChart2,
};

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
      background-color: ${theme.colors.primary[50]};
      box-shadow: ${theme.shadows.md};
    `}

  ${({ $status, theme }) =>
    $status === 'completed' &&
    css`
      opacity: 0.7;
      background-color: ${theme.colors.success[50]};
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
      background-color: ${theme.colors.neutral[100]};
      color: ${theme.colors.neutral[500]};
    `;
  }}
`;

const Content = styled.div`
  flex: 1;
  min-width: 0;
`;

const Title = styled.h4<{ $status: StepStatus }>`
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme, $status }) =>
    $status === 'completed'
      ? theme.colors.success[700]
      : theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing[1]} 0;
`;

const Description = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
  line-height: 1.5;
`;

export const OnboardingStep = ({
  id,
  title,
  description,
  status,
  icon,
  onClick,
  isCurrent = false,
}: OnboardingStepProps) => {
  const IconComponent = iconMap[icon];
  const isCompleted = status === 'completed';
  const isClickable = !isCompleted && !!onClick;

  const handleClick = () => {
    if (isClickable) {
      onClick?.();
    }
  };

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
      role="button"
      tabIndex={isClickable ? 0 : -1}
    >
      <IconWrapper $status={status} $isCurrent={isCurrent}>
        {isCompleted ? <Check size={20} /> : <IconComponent size={20} />}
      </IconWrapper>
      <Content>
        <Title $status={status}>{title}</Title>
        <Description>{description}</Description>
      </Content>
    </StepContainer>
  );
};
