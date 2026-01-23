'use client';

import styled, { css } from 'styled-components';
import { forwardRef, SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
  options: SelectOption[];
}

const SelectWrapper = styled.div<{ $fullWidth: boolean }>`
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

const SelectContainer = styled.div`
  position: relative;
  width: 100%;
`;

const StyledSelect = styled.select<{ $hasError: boolean }>`
  width: 100%;
  height: 40px;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[10]} ${theme.spacing[2]} ${theme.spacing[3]}`};
  font-size: ${({ theme }) => theme.fontSizes.base};
  color: ${({ theme }) => theme.colors.text.primary};
  background-color: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  transition: all ${({ theme }) => theme.transitions.fast};
  appearance: none;
  cursor: pointer;

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

const IconWrapper = styled.div`
  position: absolute;
  top: 50%;
  right: ${({ theme }) => theme.spacing[3]};
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.text.tertiary};
  pointer-events: none;
  display: flex;
  align-items: center;
`;

const HintText = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ErrorText = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.danger[600]};
`;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, fullWidth = false, options, id, className, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <SelectWrapper $fullWidth={fullWidth} className={className}>
        {label && <Label htmlFor={selectId}>{label}</Label>}
        <SelectContainer>
          <StyledSelect ref={ref} id={selectId} $hasError={!!error} {...props}>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </StyledSelect>
          <IconWrapper>
            <ChevronDown size={16} />
          </IconWrapper>
        </SelectContainer>
        {error && <ErrorText>{error}</ErrorText>}
        {hint && !error && <HintText>{hint}</HintText>}
      </SelectWrapper>
    );
  }
);

Select.displayName = 'Select';
