'use client';

import { forwardRef, useId, memo, useCallback, useState } from 'react';
import styled from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';
import { SwitchProps, SwitchSize, SWITCH_SIZES, SWITCH_ANIMATION } from './types';

const SwitchWrapper = styled.div<{ $labelPosition: 'left' | 'right' }>`
  display: inline-flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-direction: ${({ $labelPosition }) => $labelPosition === 'left' ? 'row-reverse' : 'row'};
`;

const LabelWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const Label = styled.label<{ $disabled?: boolean }>`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme, $disabled }) =>
    $disabled ? theme.colors.text.disabled : theme.colors.text.primary};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  user-select: none;
`;

const Description = styled.span<{ $disabled?: boolean }>`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme, $disabled }) =>
    $disabled ? theme.colors.text.disabled : theme.colors.text.tertiary};
`;

const SwitchContainer = styled.button<{
  $disabled?: boolean;
  $size: SwitchSize;
  $checked: boolean;
}>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $size }) => SWITCH_SIZES[$size].width}px;
  height: ${({ $size }) => SWITCH_SIZES[$size].height}px;
  padding: 0;
  border: none;
  border-radius: 9999px;
  background-color: ${({ theme, $checked }) =>
    $checked ? theme.colors.primary[500] : theme.colors.neutral[300]};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  transition: background-color 0.15s ease;
  flex-shrink: 0;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary[500]};
    outline-offset: 2px;
  }

  &:hover:not(:disabled) {
    background-color: ${({ theme, $checked }) =>
      $checked ? theme.colors.primary[600] : theme.colors.neutral[400]};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Knob = styled(motion.span)<{ $size: SwitchSize }>`
  position: absolute;
  left: 2px;
  width: ${({ $size }) => SWITCH_SIZES[$size].knob}px;
  height: ${({ $size }) => SWITCH_SIZES[$size].knob}px;
  background-color: white;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
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

const SwitchLabels = styled.span<{ $size: SwitchSize }>`
  position: absolute;
  display: flex;
  justify-content: space-between;
  width: 100%;
  padding: 0 6px;
  font-size: ${({ $size }) => $size === 'sm' ? '8px' : '9px'};
  font-weight: 600;
  text-transform: uppercase;
  pointer-events: none;
`;

const OnLabel = styled.span<{ $visible: boolean }>`
  color: white;
  opacity: ${({ $visible }) => $visible ? 1 : 0};
  transition: opacity 0.15s ease;
`;

const OffLabel = styled.span<{ $visible: boolean }>`
  color: ${({ theme }) => theme.colors.text.tertiary};
  opacity: ${({ $visible }) => $visible ? 1 : 0};
  transition: opacity 0.15s ease;
`;

export const Switch = memo(forwardRef<HTMLInputElement, SwitchProps>(
  ({
    className,
    disabled,
    size = 'md',
    label,
    description,
    labelPosition = 'right',
    onLabel,
    offLabel,
    checked,
    defaultChecked,
    onChange,
    id: providedId,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    ...props
  }, ref) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const descriptionId = `${id}-description`;
    const shouldReduceMotion = useReducedMotion();

    // Handle both controlled and uncontrolled
    const isControlled = checked !== undefined;
    const [internalChecked, setInternalChecked] = useState(defaultChecked ?? false);
    const isChecked = isControlled ? checked : internalChecked;

    const handleClick = useCallback(() => {
      if (disabled) return;

      const newChecked = !isChecked;

      // Update internal state for uncontrolled mode
      if (!isControlled) {
        setInternalChecked(newChecked);
      }

      // Trigger onChange event manually since we're using a button
      const syntheticEvent = {
        target: {
          checked: newChecked,
          name: props.name,
          value: props.value,
        },
        currentTarget: {
          checked: newChecked,
          name: props.name,
          value: props.value,
        },
      } as React.ChangeEvent<HTMLInputElement>;

      onChange?.(syntheticEvent);
    }, [disabled, isChecked, isControlled, onChange, props.name, props.value]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    }, [handleClick]);

    const knobAnimation = shouldReduceMotion
      ? {}
      : {
          x: isChecked ? SWITCH_SIZES[size].translate : 0,
          ...SWITCH_ANIMATION.knob,
        };

    const switchElement = (
      <SwitchContainer
        type="button"
        role="switch"
        aria-checked={isChecked}
        aria-label={!label ? ariaLabel : undefined}
        aria-describedby={description ? descriptionId : ariaDescribedBy}
        disabled={disabled}
        $disabled={disabled}
        $size={size}
        $checked={!!isChecked}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <HiddenInput
          ref={ref}
          type="checkbox"
          id={id}
          checked={isChecked}
          disabled={disabled}
          onChange={() => {}} // No-op: actual change handled by button onClick
          tabIndex={-1}
          aria-hidden="true"
          readOnly
          {...props}
        />
        {(onLabel || offLabel) && size !== 'sm' && (
          <SwitchLabels $size={size}>
            <OnLabel $visible={!!isChecked}>{onLabel}</OnLabel>
            <OffLabel $visible={!isChecked}>{offLabel}</OffLabel>
          </SwitchLabels>
        )}
        <Knob
          $size={size}
          animate={knobAnimation}
          initial={false}
        />
      </SwitchContainer>
    );

    if (label || description) {
      return (
        <SwitchWrapper className={className} $labelPosition={labelPosition}>
          {switchElement}
          <LabelWrapper>
            {label && (
              <Label htmlFor={id} $disabled={disabled} onClick={handleClick}>
                {label}
              </Label>
            )}
            {description && (
              <Description id={descriptionId} $disabled={disabled}>
                {description}
              </Description>
            )}
          </LabelWrapper>
        </SwitchWrapper>
      );
    }

    return <span className={className}>{switchElement}</span>;
  }
));

Switch.displayName = 'Switch';
