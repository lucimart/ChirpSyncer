'use client';

import { memo, FC, useId, useCallback } from 'react';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { AlertProps, AlertVariant, ALERT_ANIMATION } from './types';

const variantStyles: Record<AlertVariant, ReturnType<typeof css>> = {
  error: css`
    background-color: ${({ theme }) => theme.colors.surface?.danger?.bg ?? theme.colors.danger[50]};
    border-color: ${({ theme }) => theme.colors.surface?.danger?.border ?? theme.colors.danger[200]};
    color: ${({ theme }) => theme.colors.surface?.danger?.text ?? theme.colors.danger[800]};
  `,
  success: css`
    background-color: ${({ theme }) => theme.colors.surface?.success?.bg ?? theme.colors.success[50]};
    border-color: ${({ theme }) => theme.colors.surface?.success?.border ?? theme.colors.success[200]};
    color: ${({ theme }) => theme.colors.surface?.success?.text ?? theme.colors.success[800]};
  `,
  warning: css`
    background-color: ${({ theme }) => theme.colors.surface?.warning?.bg ?? theme.colors.warning[50]};
    border-color: ${({ theme }) => theme.colors.surface?.warning?.border ?? theme.colors.warning[200]};
    color: ${({ theme }) => theme.colors.surface?.warning?.text ?? theme.colors.warning[800]};
  `,
  info: css`
    background-color: ${({ theme }) => theme.colors.surface?.info?.bg ?? theme.colors.primary[50]};
    border-color: ${({ theme }) => theme.colors.surface?.info?.border ?? theme.colors.primary[200]};
    color: ${({ theme }) => theme.colors.surface?.info?.text ?? theme.colors.primary[800]};
  `,
};

const Container = styled(motion.div)<{ $variant: AlertVariant }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]};
  border: 1px solid;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSizes.sm};

  ${({ $variant }) => variantStyles[$variant]}
`;

const IconWrapper = styled(motion.div)<{ $variant: AlertVariant }>`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
  color: ${({ $variant, theme }) => {
    switch ($variant) {
      case 'error':
        return theme.colors.danger[600];
      case 'success':
        return theme.colors.success[600];
      case 'warning':
        return theme.colors.warning[600];
      case 'info':
        return theme.colors.primary[600];
    }
  }};
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
  flex: 1;
  min-width: 0;
`;

const Title = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
`;

const Message = styled.span`
  line-height: 1.5;
`;

const DismissButton = styled.button<{ $variant: AlertVariant }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  margin: -2px -2px -2px 0;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  background: transparent;
  cursor: pointer;
  transition: background-color 0.15s ease, opacity 0.15s ease;
  opacity: 0.7;
  color: currentColor;

  &:hover {
    opacity: 1;
    background-color: ${({ $variant, theme }) => {
      switch ($variant) {
        case 'error':
          return theme.colors.danger[100];
        case 'success':
          return theme.colors.success[100];
        case 'warning':
          return theme.colors.warning[100];
        case 'info':
          return theme.colors.primary[100];
      }
    }};
  }

  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
    opacity: 1;
  }
`;

const defaultIcons: Record<AlertVariant, JSX.Element> = {
  error: <AlertCircle size={18} />,
  success: <CheckCircle2 size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />,
};

export const Alert: FC<AlertProps> = memo(({
  variant = 'info',
  title,
  icon,
  children,
  dismissible = false,
  onDismiss,
  className,
  id: providedId,
}) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const shouldReduceMotion = useReducedMotion();

  const handleDismiss = useCallback(() => {
    onDismiss?.();
  }, [onDismiss]);

  const containerAnimation = shouldReduceMotion
    ? {}
    : {
        initial: ALERT_ANIMATION.container.initial,
        animate: ALERT_ANIMATION.container.animate,
        exit: ALERT_ANIMATION.container.exit,
        transition: ALERT_ANIMATION.container.transition,
      };

  const iconAnimation = shouldReduceMotion
    ? {}
    : {
        initial: ALERT_ANIMATION.icon.initial,
        animate: ALERT_ANIMATION.icon.animate,
        transition: ALERT_ANIMATION.icon.transition,
      };

  const displayIcon = icon ?? defaultIcons[variant];

  return (
    <AnimatePresence mode="wait">
      <Container
        $variant={variant}
        className={className}
        role="alert"
        data-variant={variant}
        aria-live={variant === 'error' ? 'assertive' : 'polite'}
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={descriptionId}
        {...containerAnimation}
      >
        <IconWrapper
          $variant={variant}
          aria-hidden="true"
          data-testid="alert-icon"
          {...iconAnimation}
        >
          {displayIcon}
        </IconWrapper>
        <Content>
          {title && <Title id={titleId}>{title}</Title>}
          <Message id={descriptionId}>{children}</Message>
        </Content>
        {dismissible && (
          <DismissButton
            $variant={variant}
            onClick={handleDismiss}
            aria-label="Dismiss alert"
            type="button"
          >
            <X size={16} />
          </DismissButton>
        )}
      </Container>
    </AnimatePresence>
  );
});

Alert.displayName = 'Alert';
