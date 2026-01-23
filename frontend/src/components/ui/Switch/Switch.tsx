import React from 'react';
import styled, { css } from 'styled-components';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const Input = styled.input`
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
`;

const sizeStyles = {
  sm: css`
    width: 36px;
    height: 20px;
  `,
  md: css`
    width: 44px;
    height: 24px;
  `,
  lg: css`
    width: 52px;
    height: 28px;
  `,
};

const sliderSizes = {
  sm: css`
    &:before {
      width: 16px;
      height: 16px;
      left: 2px;
      bottom: 2px;
    }
    ${Input}:checked + &:before {
      transform: translateX(16px);
    }
  `,
  md: css`
    &:before {
      width: 20px;
      height: 20px;
      left: 2px;
      bottom: 2px;
    }
    ${Input}:checked + &:before {
      transform: translateX(20px);
    }
  `,
  lg: css`
    &:before {
      width: 24px;
      height: 24px;
      left: 2px;
      bottom: 2px;
    }
    ${Input}:checked + &:before {
      transform: translateX(24px);
    }
  `,
};

const SwitchWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const Label = styled.span<{ $disabled?: boolean }>`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme, $disabled }) => 
    $disabled ? theme.colors.text.disabled : theme.colors.text.primary};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
`;

const SwitchContainer = styled.label<{ $disabled?: boolean; $size: 'sm' | 'md' | 'lg' }>`
  position: relative;
  display: inline-block;
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  ${({ $size }) => sizeStyles[$size]}
`;

const Slider = styled.span<{ $size: 'sm' | 'md' | 'lg' }>`
  position: absolute;
  cursor: inherit;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${({ theme }) => theme.colors.neutral[300]};
  transition: .2s;
  border-radius: 9999px;

  &:before {
    position: absolute;
    content: "";
    background-color: white;
    transition: .2s;
    border-radius: 50%;
  }

  ${({ $size }) => sliderSizes[$size]}

  ${Input}:checked + & {
    background-color: ${({ theme }) => theme.colors.primary[500]};
  }

  ${Input}:focus + & {
    box-shadow: 0 0 1px ${({ theme }) => theme.colors.primary[500]};
  }
`;

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, disabled, size = 'md', label, 'aria-label': ariaLabel, ...props }, ref) => {
    // Ensure input always has an accessible name
    const inputAriaLabel = ariaLabel || label;

    const switchComponent = (
      <SwitchContainer className={!label ? className : undefined} $disabled={disabled} $size={size}>
        <Input
          type="checkbox"
          disabled={disabled}
          ref={ref}
          aria-label={inputAriaLabel}
          {...props}
        />
        <Slider $size={size} />
      </SwitchContainer>
    );

    if (label) {
      return (
        <SwitchWrapper className={className}>
          {switchComponent}
          <Label $disabled={disabled}>{label}</Label>
        </SwitchWrapper>
      );
    }

    return switchComponent;
  }
);

Switch.displayName = 'Switch';
