'use client';

import { forwardRef, useId, memo } from 'react';
import styled, { css } from 'styled-components';
import {
  FormFieldWrapper,
  FormLabel,
  FormHelperText,
  InputContainer,
  focusRingInset,
  disabledInputStyles,
} from '../utils';
import { InputProps, InputSize, INPUT_SIZES } from './types';

const IconWrapper = styled.span<{ $position: 'start' | 'end'; $size: InputSize }>`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.text.tertiary};
  pointer-events: none;
  display: flex;
  align-items: center;

  ${({ $position, $size }) => {
    const offset = $size === 'sm' ? '8px' : $size === 'lg' ? '14px' : '12px';
    return $position === 'start' ? `left: ${offset};` : `right: ${offset};`;
  }}

  svg {
    width: ${({ $size }) => INPUT_SIZES[$size].iconSize}px;
    height: ${({ $size }) => INPUT_SIZES[$size].iconSize}px;
  }
`;

const StyledInput = styled.input<{
  $hasError: boolean;
  $hasStartIcon?: boolean;
  $hasEndIcon?: boolean;
  $textAlign?: string;
  $size: InputSize;
}>`
  width: 100%;
  height: ${({ $size }) => INPUT_SIZES[$size].height}px;
  padding: ${({ $size, $hasStartIcon, $hasEndIcon }) => {
    const base = INPUT_SIZES[$size].padding.split(' ');
    const iconPadding = $size === 'sm' ? '32px' : $size === 'lg' ? '44px' : '40px';
    const leftPadding = $hasStartIcon ? iconPadding : base[1] || base[0];
    const rightPadding = $hasEndIcon ? iconPadding : base[1] || base[0];
    return `${base[0]} ${rightPadding} ${base[0]} ${leftPadding}`;
  }};
  font-size: ${({ theme, $size }) =>
    theme.fontSizes[INPUT_SIZES[$size].fontSize as keyof typeof theme.fontSizes]};
  color: ${({ theme }) => theme.colors.text.primary};
  background-color: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  transition: all ${({ theme }) => theme.transitions.fast};
  text-align: ${({ $textAlign }) => $textAlign || 'left'};

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.border.dark};
  }

  ${focusRingInset}
  ${disabledInputStyles}

  ${({ $hasError, theme }) =>
    $hasError &&
    css`
      border-color: ${theme.colors.danger[500]};

      &:focus {
        border-color: ${theme.colors.danger[500]};
        box-shadow: 0 0 0 3px ${theme.colors.danger[100]};
      }
    `}
`;

const InputComponent = forwardRef<HTMLInputElement, InputProps>(
  ({
    label,
    error,
    hint,
    fullWidth = false,
    size = 'md',
    startIcon,
    endIcon,
    textAlign,
    id: providedId,
    className,
    'aria-describedby': ariaDescribedBy,
    ...props
  }, ref) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const hintId = `${id}-hint`;
    const errorId = `${id}-error`;

    const describedBy = [
      error ? errorId : null,
      hint && !error ? hintId : null,
      ariaDescribedBy,
    ].filter(Boolean).join(' ') || undefined;

    return (
      <FormFieldWrapper $fullWidth={fullWidth} className={className}>
        {label && <FormLabel htmlFor={id}>{label}</FormLabel>}
        <InputContainer>
          {startIcon && (
            <IconWrapper $position="start" $size={size}>
              {startIcon}
            </IconWrapper>
          )}
          <StyledInput
            ref={ref}
            id={id}
            $hasError={!!error}
            $hasStartIcon={!!startIcon}
            $hasEndIcon={!!endIcon}
            $textAlign={textAlign}
            $size={size}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            {...props}
          />
          {endIcon && (
            <IconWrapper $position="end" $size={size}>
              {endIcon}
            </IconWrapper>
          )}
        </InputContainer>
        {error && (
          <FormHelperText $isError id={errorId} role="alert">
            {error}
          </FormHelperText>
        )}
        {hint && !error && <FormHelperText id={hintId}>{hint}</FormHelperText>}
      </FormFieldWrapper>
    );
  }
);

InputComponent.displayName = 'Input';

export const Input = memo(InputComponent);
