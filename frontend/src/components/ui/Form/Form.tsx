'use client';

import styled from 'styled-components';
import { FormHTMLAttributes, forwardRef } from 'react';

export interface FormProps extends FormHTMLAttributes<HTMLFormElement> {
  /** Gap between form elements */
  gap?: 'sm' | 'md' | 'lg';
}

const gapSizes = {
  sm: 3,
  md: 4,
  lg: 6,
};

const StyledForm = styled.form<{ $gap: 'sm' | 'md' | 'lg' }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme, $gap }) => theme.spacing[gapSizes[$gap]]};
`;

export const Form = forwardRef<HTMLFormElement, FormProps>(
  ({ gap = 'md', children, ...props }, ref) => {
    return (
      <StyledForm ref={ref} $gap={gap} {...props}>
        {children}
      </StyledForm>
    );
  }
);

Form.displayName = 'Form';
