'use client';

import { forwardRef, useId, useState, useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';
import {
  FormFieldWrapper,
  FormLabel,
  FormHelperText,
  FormCharCount,
  FormFooter,
  focusRingInset,
  disabledInputStyles,
} from '../utils';
import { TextAreaProps, TextAreaSize, TextAreaResize, TEXTAREA_SIZES } from './types';

const LabelContainer = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const RequiredIndicator = styled.span`
  color: ${({ theme }) => theme.colors.danger[500]};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const StyledTextArea = styled.textarea<{
  $hasError: boolean;
  $size: TextAreaSize;
  $resize: TextAreaResize;
}>`
  width: 100%;
  padding: ${({ $size }) => TEXTAREA_SIZES[$size].padding};
  font-size: ${({ theme, $size }) =>
    theme.fontSizes[TEXTAREA_SIZES[$size].fontSize as keyof typeof theme.fontSizes]};
  font-family: inherit;
  line-height: ${({ $size }) => TEXTAREA_SIZES[$size].lineHeight};
  border: 1px solid
    ${({ theme, $hasError }) =>
      $hasError ? theme.colors.danger[500] : theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  resize: ${({ $resize }) => $resize};
  background-color: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  transition: border-color ${({ theme }) => theme.transitions.fast},
    box-shadow ${({ theme }) => theme.transitions.fast};

  &:hover:not(:disabled):not(:focus) {
    border-color: ${({ theme, $hasError }) =>
      $hasError ? theme.colors.danger[500] : theme.colors.border.dark};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme, $hasError }) =>
      $hasError ? theme.colors.danger[500] : theme.colors.primary[500]};
    box-shadow: 0 0 0 3px
      ${({ theme, $hasError }) =>
        $hasError ? theme.colors.danger[100] : theme.colors.primary[100]};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  ${disabledInputStyles}
`;

const StyledFormFooter = styled(FormFooter)`
  gap: ${({ theme }) => theme.spacing[2]};
  align-items: flex-start;
`;

const StyledHelperText = styled(FormHelperText)`
  flex: 1;
`;

const StyledCharCount = styled(FormCharCount)`
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`;

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      label,
      helperText,
      error,
      size = 'md',
      fullWidth = false,
      minRows = 3,
      maxRows,
      showCharCount = false,
      maxLength,
      resize = 'vertical',
      required,
      id: providedId,
      value,
      defaultValue,
      onChange,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const helperId = `${id}-helper`;
    const errorId = `${id}-error`;

    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef = (ref || internalRef) as React.RefObject<HTMLTextAreaElement>;

    const [charCount, setCharCount] = useState(() => {
      if (typeof value === 'string') return value.length;
      if (typeof defaultValue === 'string') return defaultValue.length;
      return 0;
    });

    const updateHeight = useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea || !maxRows) return;

      textarea.style.height = 'auto';

      const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight);
      const paddingTop = parseFloat(getComputedStyle(textarea).paddingTop);
      const paddingBottom = parseFloat(getComputedStyle(textarea).paddingBottom);
      const borderTop = parseFloat(getComputedStyle(textarea).borderTopWidth);
      const borderBottom = parseFloat(getComputedStyle(textarea).borderBottomWidth);

      const minHeight = lineHeight * minRows + paddingTop + paddingBottom + borderTop + borderBottom;
      const maxHeight = lineHeight * maxRows + paddingTop + paddingBottom + borderTop + borderBottom;

      const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
      textarea.style.height = `${newHeight}px`;
    }, [maxRows, minRows, textareaRef]);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCharCount(e.target.value.length);
        updateHeight();
        onChange?.(e);
      },
      [onChange, updateHeight]
    );

    useEffect(() => {
      if (typeof value === 'string') {
        setCharCount(value.length);
      }
    }, [value]);

    useEffect(() => {
      updateHeight();
    }, [updateHeight, value]);

    const describedByIds = [
      error ? errorId : helperText ? helperId : null,
      ariaDescribedBy,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    const isOverLimit = maxLength !== undefined && charCount > maxLength;
    const lineHeight = TEXTAREA_SIZES[size].lineHeight;

    return (
      <FormFieldWrapper $fullWidth={fullWidth}>
        {label && (
          <LabelContainer>
            <FormLabel htmlFor={id}>
              {label}
              {required && <RequiredIndicator aria-hidden="true"> *</RequiredIndicator>}
            </FormLabel>
          </LabelContainer>
        )}
        <StyledTextArea
          ref={textareaRef}
          id={id}
          $hasError={!!error || isOverLimit}
          $size={size}
          $resize={maxRows ? 'none' : resize}
          rows={minRows}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          maxLength={maxLength}
          required={required}
          aria-invalid={!!error || isOverLimit}
          aria-describedby={describedByIds}
          aria-required={required}
          style={{
            minHeight: `calc(${lineHeight}em * ${minRows} + ${TEXTAREA_SIZES[size].padding.split(' ')[0]} * 2)`,
          }}
          {...props}
        />
        {(error || helperText || showCharCount) && (
          <StyledFormFooter>
            {error ? (
              <StyledHelperText id={errorId} $isError role="alert">
                {error}
              </StyledHelperText>
            ) : helperText ? (
              <StyledHelperText id={helperId}>{helperText}</StyledHelperText>
            ) : (
              <span />
            )}
            {showCharCount && (
              <StyledCharCount $isOver={isOverLimit} aria-live="polite">
                {charCount}
                {maxLength !== undefined && ` / ${maxLength}`}
              </StyledCharCount>
            )}
          </StyledFormFooter>
        )}
      </FormFieldWrapper>
    );
  }
);

TextArea.displayName = 'TextArea';
