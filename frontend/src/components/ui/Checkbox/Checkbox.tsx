'use client';

import { forwardRef, useId, memo, useEffect, useRef } from 'react';
import styled, { css } from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckboxProps, CheckboxSize, CHECKBOX_SIZES, CHECKBOX_ANIMATION } from './types';

const CheckboxWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const CheckboxLabel = styled.label<{ $disabled?: boolean; $size: CheckboxSize }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme, $size }) =>
    theme.fontSizes[CHECKBOX_SIZES[$size].font as keyof typeof theme.fontSizes]};
  color: ${({ theme, $disabled }) =>
    $disabled ? theme.colors.text.disabled : theme.colors.text.primary};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  user-select: none;
`;

const LabelContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
  padding-top: 1px;
`;

const LabelText = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const Description = styled.span<{ $disabled?: boolean }>`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme, $disabled }) =>
    $disabled ? theme.colors.text.disabled : theme.colors.text.tertiary};
`;

const ErrorMessage = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.danger[600]};
  margin-left: ${({ theme }) => `calc(${theme.spacing[2]} + 16px)`};
`;

const HiddenInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

const CheckboxBox = styled(motion.div)<{
  $size: CheckboxSize;
  $checked: boolean;
  $indeterminate: boolean;
  $disabled: boolean;
  $error: boolean;
}>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => CHECKBOX_SIZES[$size].box}px;
  height: ${({ $size }) => CHECKBOX_SIZES[$size].box}px;
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  border: 2px solid;
  transition: background-color 0.15s ease, border-color 0.15s ease;

  ${({ $checked, $indeterminate, $disabled, $error, theme }) => {
    if ($disabled) {
      return css`
        background-color: ${$checked || $indeterminate
          ? theme.colors.neutral[300]
          : theme.colors.neutral[100]};
        border-color: ${theme.colors.neutral[300]};
        cursor: not-allowed;
      `;
    }
    if ($error) {
      return css`
        background-color: ${$checked || $indeterminate
          ? theme.colors.danger[600]
          : 'transparent'};
        border-color: ${theme.colors.danger[600]};
      `;
    }
    return css`
      background-color: ${$checked || $indeterminate
        ? theme.colors.primary[600]
        : 'transparent'};
      border-color: ${$checked || $indeterminate
        ? theme.colors.primary[600]
        : theme.colors.neutral[400]};

      &:hover {
        border-color: ${$checked || $indeterminate
          ? theme.colors.primary[700]
          : theme.colors.primary[500]};
        background-color: ${$checked || $indeterminate
          ? theme.colors.primary[700]
          : 'transparent'};
      }
    `;
  }}
`;

const CheckIcon = styled(motion.svg)<{ $size: CheckboxSize }>`
  position: absolute;
  width: ${({ $size }) => CHECKBOX_SIZES[$size].check}px;
  height: ${({ $size }) => CHECKBOX_SIZES[$size].check}px;
`;

const CheckPath = styled(motion.path)`
  stroke: white;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
`;

const IndeterminatePath = styled(motion.path)`
  stroke: white;
  stroke-width: 2.5;
  stroke-linecap: round;
  fill: none;
`;

const FocusRing = styled.span<{ $size: CheckboxSize }>`
  position: absolute;
  inset: -4px;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  pointer-events: none;

  ${HiddenInput}:focus-visible ~ & {
    outline: 2px solid ${({ theme }) => theme.colors.primary[500]};
    outline-offset: 0;
  }
`;

const CheckboxContainer = styled.div`
  position: relative;
  display: inline-flex;
`;

export const Checkbox = memo(forwardRef<HTMLInputElement, CheckboxProps>(
  ({
    className,
    label,
    description,
    size = 'md',
    indeterminate = false,
    error = false,
    errorMessage,
    checked,
    disabled,
    id: providedId,
    'aria-describedby': ariaDescribedBy,
    ...props
  }, ref) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const descriptionId = `${id}-description`;
    const errorId = `${id}-error`;
    const internalRef = useRef<HTMLInputElement>(null);
    const shouldReduceMotion = useReducedMotion();

    // Handle indeterminate state
    useEffect(() => {
      const inputRef = (ref as React.RefObject<HTMLInputElement>) || internalRef;
      if (inputRef.current) {
        inputRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate, ref]);

    const isChecked = checked ?? false;

    const checkAnimation = shouldReduceMotion
      ? { opacity: isChecked && !indeterminate ? 1 : 0 }
      : {
          pathLength: isChecked && !indeterminate ? 1 : 0,
          opacity: isChecked && !indeterminate ? 1 : 0,
        };

    const indeterminateAnimation = shouldReduceMotion
      ? { opacity: indeterminate ? 1 : 0 }
      : {
          pathLength: indeterminate ? 1 : 0,
          opacity: indeterminate ? 1 : 0,
        };

    const describedBy = [
      description ? descriptionId : null,
      error && errorMessage ? errorId : null,
      ariaDescribedBy,
    ].filter(Boolean).join(' ') || undefined;

    const checkboxContent = (
      <CheckboxContainer>
        <HiddenInput
          ref={ref || internalRef}
          type="checkbox"
          id={id}
          checked={isChecked}
          disabled={disabled}
          aria-invalid={error}
          aria-describedby={describedBy}
          {...props}
        />
        <CheckboxBox
          $size={size}
          $checked={isChecked}
          $indeterminate={indeterminate}
          $disabled={!!disabled}
          $error={error}
          whileTap={!disabled ? CHECKBOX_ANIMATION.box.tap : undefined}
        >
          <CheckIcon $size={size} viewBox="0 0 12 12">
            <CheckPath
              d="M2 6L5 9L10 3"
              initial={CHECKBOX_ANIMATION.check.initial}
              animate={checkAnimation}
              transition={shouldReduceMotion ? { duration: 0 } : CHECKBOX_ANIMATION.check.transition}
            />
            <IndeterminatePath
              d="M2 6H10"
              initial={CHECKBOX_ANIMATION.check.initial}
              animate={indeterminateAnimation}
              transition={shouldReduceMotion ? { duration: 0 } : CHECKBOX_ANIMATION.check.transition}
            />
          </CheckIcon>
        </CheckboxBox>
        <FocusRing $size={size} />
      </CheckboxContainer>
    );

    if (label || description) {
      return (
        <CheckboxWrapper className={className}>
          <CheckboxLabel $disabled={disabled} $size={size}>
            {checkboxContent}
            <LabelContent>
              {label && <LabelText>{label}</LabelText>}
              {description && (
                <Description id={descriptionId} $disabled={disabled}>
                  {description}
                </Description>
              )}
            </LabelContent>
          </CheckboxLabel>
          {error && errorMessage && (
            <ErrorMessage id={errorId}>{errorMessage}</ErrorMessage>
          )}
        </CheckboxWrapper>
      );
    }

    return (
      <span className={className}>
        {checkboxContent}
        {error && errorMessage && (
          <ErrorMessage id={errorId}>{errorMessage}</ErrorMessage>
        )}
      </span>
    );
  }
));

Checkbox.displayName = 'Checkbox';
