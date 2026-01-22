'use client';

import styled, { css } from 'styled-components';
import { forwardRef, InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
  startIcon?: React.ReactNode;
  textAlign?: 'left' | 'center' | 'right';
}

const InputWrapper = styled.div<{ $fullWidth: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
`;

const Label = styled.label`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const InputContainer = styled.div`
  position: relative;
  width: 100%;
`;

const IconWrapper = styled.div`
  position: absolute;
  top: 50%;
  left: ${({ theme }) => theme.spacing[3]};
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.text.tertiary};
  pointer-events: none;
  display: flex;
  align-items: center;
`;

const StyledInput = styled.input<{ $hasError: boolean; $hasStartIcon?: boolean; $textAlign?: string }>`
  width: 100%;
  height: 40px;
  padding: ${({ theme, $hasStartIcon }) =>
    $hasStartIcon
      ? `${theme.spacing[2]} ${theme.spacing[3]} ${theme.spacing[2]} ${theme.spacing[10]}`
      : `${theme.spacing[2]} ${theme.spacing[3]}`};
  font-size: ${({ theme }) => theme.fontSizes.base};
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

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primary[100]};
  }

  &:disabled {
    background-color: ${({ theme }) => theme.colors.background.secondary};
    cursor: not-allowed;
    opacity: 0.7;
  }

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

const HintText = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ErrorText = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.danger[600]};
`;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, fullWidth = false, startIcon, textAlign, id, className, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <InputWrapper $fullWidth={fullWidth} className={className}>
        {label && <Label htmlFor={inputId}>{label}</Label>}
        <InputContainer>
          {startIcon && <IconWrapper>{startIcon}</IconWrapper>}
          <StyledInput
            ref={ref}
            id={inputId}
            $hasError={!!error}
            $hasStartIcon={!!startIcon}
            $textAlign={textAlign}
            {...props}
          />
        </InputContainer>
        {error && <ErrorText>{error}</ErrorText>}
        {hint && !error && <HintText>{hint}</HintText>}
      </InputWrapper>
    );
  }
);

Input.displayName = 'Input';
