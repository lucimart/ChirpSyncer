'use client';

import { memo, FC, forwardRef } from 'react';
import styled, { css } from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';
import {
  CardProps,
  CardHeaderProps,
  CardTitleProps,
  CardContentProps,
  CardFooterProps,
  CardPadding,
  CardVariant,
  CARD_PADDING,
  CARD_ANIMATION,
} from './types';

const getVariantStyles = (variant: CardVariant) => {
  switch (variant) {
    case 'outlined':
      return css`
        background-color: transparent;
        border: 1px solid ${({ theme }) => theme.colors.border.default};
        box-shadow: none;
      `;
    case 'elevated':
      return css`
        background-color: ${({ theme }) => theme.colors.background.primary};
        border: none;
        box-shadow: ${({ theme }) => theme.shadows.lg};
      `;
    case 'filled':
      return css`
        background-color: ${({ theme }) => theme.colors.background.secondary};
        border: none;
        box-shadow: none;
      `;
    case 'default':
    default:
      return css`
        background-color: ${({ theme }) => theme.colors.background.primary};
        border: 1px solid ${({ theme }) => theme.colors.border.light};
        box-shadow: ${({ theme }) => theme.shadows.sm};
      `;
  }
};

const StyledCard = styled(motion.div)<{
  $padding: CardPadding;
  $variant: CardVariant;
  $hoverable: boolean;
  $selected: boolean;
  $disabled: boolean;
}>`
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ $padding }) => CARD_PADDING[$padding]};
  transition: box-shadow ${({ theme }) => theme.transitions.fast},
    border-color ${({ theme }) => theme.transitions.fast};

  ${({ $variant }) => getVariantStyles($variant)}

  ${({ $selected, theme }) =>
    $selected &&
    css`
      border-color: ${theme.colors.primary[500]};
      box-shadow: 0 0 0 1px ${theme.colors.primary[500]};
    `}

  ${({ $hoverable, $disabled, theme }) =>
    $hoverable &&
    !$disabled &&
    css`
      cursor: pointer;

      &:hover {
        box-shadow: ${theme.shadows.md};
        border-color: ${theme.colors.border.default};
      }

      &:focus-visible {
        outline: 2px solid ${theme.colors.primary[500]};
        outline-offset: 2px;
      }
    `}

  ${({ $disabled, theme }) =>
    $disabled &&
    css`
      opacity: 0.6;
      cursor: not-allowed;
      pointer-events: none;
      background-color: ${theme.colors.neutral[50]};
    `}
`;

const CardHeaderStyled = styled.div<{ $hasAction: boolean }>`
  display: flex;
  align-items: flex-start;
  justify-content: ${({ $hasAction }) => ($hasAction ? 'space-between' : 'flex-start')};
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[6]}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const HeaderContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const CardTitleStyled = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
  line-height: 1.4;
`;

const CardDescription = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: ${({ theme }) => theme.spacing[1]} 0 0;
  line-height: 1.5;
`;

const CardContentStyled = styled.div`
  padding: ${({ theme }) => theme.spacing[6]};
`;

const CardFooterStyled = styled.div<{ $align: 'start' | 'center' | 'end' | 'between' }>`
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[6]}`};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  justify-content: ${({ $align }) => {
    switch ($align) {
      case 'start':
        return 'flex-start';
      case 'center':
        return 'center';
      case 'between':
        return 'space-between';
      case 'end':
      default:
        return 'flex-end';
    }
  }};
`;

const CardBase = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      padding = 'md',
      variant = 'default',
      hoverable = false,
      selected = false,
      disabled = false,
      onClick,
      className,
      style,
      id,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      'aria-describedby': ariaDescribedBy,
      ...rest
    },
    ref
  ) => {
    const prefersReducedMotion = useReducedMotion();

    const motionProps = hoverable && !disabled && !prefersReducedMotion
      ? {
          whileHover: CARD_ANIMATION.hover,
          whileTap: onClick ? CARD_ANIMATION.tap : undefined,
        }
      : {};

    return (
      <StyledCard
        ref={ref}
        $padding={padding}
        $variant={variant}
        $hoverable={hoverable}
        $selected={selected}
        $disabled={disabled}
        onClick={disabled ? undefined : onClick}
        tabIndex={hoverable && !disabled ? 0 : undefined}
        role={hoverable ? 'button' : undefined}
        aria-disabled={disabled || undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        className={className}
        style={style}
        id={id}
        {...Object.fromEntries(
          Object.entries(rest).filter(([key]) => key.startsWith('data-'))
        )}
        {...motionProps}
      >
        {children}
      </StyledCard>
    );
  }
);

CardBase.displayName = 'Card';

const CardHeader: FC<CardHeaderProps> = memo(({ children, action, ...props }) => (
  <CardHeaderStyled $hasAction={!!action} {...props}>
    <HeaderContent>{children}</HeaderContent>
    {action}
  </CardHeaderStyled>
));
CardHeader.displayName = 'Card.Header';

const CardTitle: FC<CardTitleProps> = memo(({ children, as = 'h3', ...props }) => (
  <CardTitleStyled as={as} {...props}>
    {children}
  </CardTitleStyled>
));
CardTitle.displayName = 'Card.Title';

const CardContent: FC<CardContentProps> = memo(({ children, ...props }) => (
  <CardContentStyled {...props}>{children}</CardContentStyled>
));
CardContent.displayName = 'Card.Content';

const CardFooter: FC<CardFooterProps> = memo(({ children, align = 'end', ...props }) => (
  <CardFooterStyled $align={align} {...props}>
    {children}
  </CardFooterStyled>
));
CardFooter.displayName = 'Card.Footer';

export const Card = Object.assign(memo(CardBase), {
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
  Content: CardContent,
  Footer: CardFooter,
});
