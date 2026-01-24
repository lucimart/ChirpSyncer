'use client';

import { forwardRef, useId, memo } from 'react';
import styled, { css } from 'styled-components';
import { ChevronDown } from 'lucide-react';
import {
  FormFieldWrapper,
  FormLabel,
  FormHelperText,
  InputContainer,
  focusRingInset,
  disabledInputStyles,
} from '../utils';
import {
  SelectProps,
  SelectOption,
  SelectOptionGroup,
  SelectSize,
  SELECT_SIZES,
} from './types';

const StyledSelect = styled.select<{ $hasError: boolean; $size: SelectSize }>`
  width: 100%;
  height: ${({ $size }) => SELECT_SIZES[$size].height}px;
  padding: ${({ $size }) => SELECT_SIZES[$size].padding};
  font-size: ${({ theme, $size }) =>
    theme.fontSizes[SELECT_SIZES[$size].fontSize as keyof typeof theme.fontSizes]};
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

const IconWrapper = styled.div<{ $size: SelectSize }>`
  position: absolute;
  top: 50%;
  right: ${({ $size }) => $size === 'sm' ? '8px' : $size === 'lg' ? '16px' : '12px'};
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.text.tertiary};
  pointer-events: none;
  display: flex;
  align-items: center;
`;

// Type guard to check if options are grouped
function isOptionGroup(option: SelectOption | SelectOptionGroup): option is SelectOptionGroup {
  return 'options' in option;
}

function hasOptionGroups(options: SelectOption[] | SelectOptionGroup[]): options is SelectOptionGroup[] {
  return options.length > 0 && isOptionGroup(options[0]);
}

const SelectComponent = forwardRef<HTMLSelectElement, SelectProps>(
  ({
    label,
    error,
    hint,
    fullWidth = false,
    size = 'md',
    options,
    placeholder,
    id: providedId,
    className,
    'aria-describedby': ariaDescribedBy,
    'aria-label': ariaLabel,
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

    const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;

    return (
      <FormFieldWrapper $fullWidth={fullWidth} className={className}>
        {label && <FormLabel htmlFor={id}>{label}</FormLabel>}
        <InputContainer>
          <StyledSelect
            ref={ref}
            id={id}
            $hasError={!!error}
            $size={size}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            aria-label={label ? undefined : ariaLabel}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {hasOptionGroups(options)
              ? options.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.options.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                        disabled={option.disabled}
                      >
                        {option.label}
                      </option>
                    ))}
                  </optgroup>
                ))
              : options.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                  >
                    {option.label}
                  </option>
                ))}
          </StyledSelect>
          <IconWrapper $size={size}>
            <ChevronDown size={iconSize} />
          </IconWrapper>
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

SelectComponent.displayName = 'Select';

export const Select = memo(SelectComponent);
