/**
 * Shared Form Styles
 *
 * Reusable styled components for form inputs (Input, TextArea, Select).
 */

import styled, { css } from 'styled-components';

// Form field wrapper with optional full width
export const FormFieldWrapper = styled.div<{ $fullWidth?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
`;

// Form label
export const FormLabel = styled.label`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

// Helper/hint text below input
export const FormHelperText = styled.span<{ $isError?: boolean }>`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme, $isError }) =>
    $isError ? theme.colors.danger[600] : theme.colors.text.tertiary};
`;

// Character count display
export const FormCharCount = styled.span<{ $isOver?: boolean }>`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme, $isOver }) =>
    $isOver ? theme.colors.danger[600] : theme.colors.text.tertiary};
  margin-left: auto;
`;

// Footer row for helper text and char count
export const FormFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 20px;
`;

// Common input base styles
export const inputBaseStyles = css<{ $hasError?: boolean; $size?: 'sm' | 'md' | 'lg' }>`
  width: 100%;
  border: 1px solid
    ${({ theme, $hasError }) =>
      $hasError ? theme.colors.danger[500] : theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background-color: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  transition: border-color ${({ theme }) => theme.transitions.fast},
    box-shadow ${({ theme }) => theme.transitions.fast};

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme, $hasError }) =>
      $hasError ? theme.colors.danger[500] : theme.colors.primary[500]};
    box-shadow: 0 0 0 3px
      ${({ theme, $hasError }) =>
        $hasError ? theme.colors.danger[100] : theme.colors.primary[100]};
  }

  &:disabled {
    background-color: ${({ theme }) => theme.colors.background.secondary};
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

// Icon wrapper for inputs
export const InputIconWrapper = styled.span<{
  $position: 'start' | 'end';
  $size?: 'sm' | 'md' | 'lg';
}>`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
  pointer-events: none;

  ${({ $position, $size }) => {
    const offset = $size === 'sm' ? '8px' : $size === 'lg' ? '14px' : '12px';
    return $position === 'start' ? `left: ${offset};` : `right: ${offset};`;
  }}
`;

// Input container (relative for icon positioning)
export const InputContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;
