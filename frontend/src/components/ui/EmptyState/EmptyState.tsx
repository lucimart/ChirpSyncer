'use client';

import { memo, FC } from 'react';
import styled, { css } from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';
import {
  EmptyStateProps,
  EmptyStateSize,
  EmptyStateVariant,
  EMPTY_STATE_SIZES,
  EMPTY_STATE_ANIMATION,
} from './types';

const getVariantStyles = (variant: EmptyStateVariant) => {
  switch (variant) {
    case 'inline':
      return css`
        border: none;
        background-color: transparent;
        padding: ${({ theme }) => theme.spacing[4]};
      `;
    case 'card':
      return css`
        border: 1px solid ${({ theme }) => theme.colors.border.light};
        background-color: ${({ theme }) => theme.colors.background.primary};
        box-shadow: ${({ theme }) => theme.shadows.sm};
      `;
    case 'default':
    default:
      return css`
        border: 2px dashed ${({ theme }) => theme.colors.border.light};
        background-color: ${({ theme }) => theme.colors.background.primary};
      `;
  }
};

const Container = styled.div<{ $size: EmptyStateSize; $variant: EmptyStateVariant }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: ${({ $size }) => EMPTY_STATE_SIZES[$size].padding};
  gap: ${({ $size }) => EMPTY_STATE_SIZES[$size].gap};
  border-radius: ${({ theme }) => theme.borderRadius.lg};

  ${({ $variant }) => getVariantStyles($variant)}
`;

const IconWrapper = styled(motion.div)<{ $size: EmptyStateSize }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => EMPTY_STATE_SIZES[$size].iconSize * 1.5}px;
  height: ${({ $size }) => EMPTY_STATE_SIZES[$size].iconSize * 1.5}px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background-color: ${({ theme }) => theme.colors.neutral[100]};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const IllustrationWrapper = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ContentWrapper = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const Title = styled.h3<{ $size: EmptyStateSize }>`
  font-size: ${({ theme, $size }) =>
    theme.fontSizes[EMPTY_STATE_SIZES[$size].titleSize as keyof typeof theme.fontSizes]};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
  line-height: 1.3;
`;

const Description = styled.p<{ $size: EmptyStateSize }>`
  font-size: ${({ theme, $size }) =>
    theme.fontSizes[EMPTY_STATE_SIZES[$size].descSize as keyof typeof theme.fontSizes]};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
  max-width: 400px;
  line-height: 1.5;
`;

const ActionsWrapper = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
  justify-content: center;
`;

export const EmptyState: FC<EmptyStateProps> = memo(({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  size = 'md',
  variant = 'default',
  illustration,
  'data-testid': testId,
  className,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const iconSize = EMPTY_STATE_SIZES[size].iconSize;

  const iconAnimation = prefersReducedMotion
    ? { initial: {}, animate: {}, transition: {} }
    : EMPTY_STATE_ANIMATION.icon;

  const contentAnimation = prefersReducedMotion
    ? { initial: {}, animate: {}, transition: {} }
    : EMPTY_STATE_ANIMATION.content;

  return (
    <Container
      $size={size}
      $variant={variant}
      data-testid={testId}
      className={className}
      role="status"
      aria-live="polite"
    >
      {illustration ? (
        <IllustrationWrapper
          initial={iconAnimation.initial}
          animate={iconAnimation.animate}
          transition={iconAnimation.transition}
        >
          {illustration}
        </IllustrationWrapper>
      ) : Icon ? (
        <IconWrapper
          $size={size}
          initial={iconAnimation.initial}
          animate={iconAnimation.animate}
          transition={iconAnimation.transition}
        >
          <Icon size={iconSize} strokeWidth={1.5} aria-hidden="true" />
        </IconWrapper>
      ) : null}

      <ContentWrapper
        initial={contentAnimation.initial}
        animate={contentAnimation.animate}
        transition={contentAnimation.transition}
      >
        <Title $size={size}>{title}</Title>
        {description && <Description $size={size}>{description}</Description>}
      </ContentWrapper>

      {(action || secondaryAction) && (
        <ActionsWrapper
          initial={contentAnimation.initial}
          animate={contentAnimation.animate}
          transition={{ ...contentAnimation.transition, delay: 0.2 }}
        >
          {action}
          {secondaryAction}
        </ActionsWrapper>
      )}
    </Container>
  );
});

EmptyState.displayName = 'EmptyState';
