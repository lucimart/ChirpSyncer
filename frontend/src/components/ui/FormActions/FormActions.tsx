'use client';

import styled from 'styled-components';
import { ReactNode } from 'react';

export interface FormActionsProps {
  children: ReactNode;
  /** Alignment of buttons. Default: 'end' */
  align?: 'start' | 'center' | 'end' | 'between';
  /** Add border separator on top. Default: true */
  withBorder?: boolean;
  /** Custom class name */
  className?: string;
}

const alignmentMap = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
};

const StyledFormActions = styled.div<{
  $align: 'start' | 'center' | 'end' | 'between';
  $withBorder: boolean;
}>`
  display: flex;
  justify-content: ${({ $align }) => alignmentMap[$align]};
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[6]};
  padding-top: ${({ $withBorder, theme }) =>
    $withBorder ? theme.spacing[4] : '0'};
  border-top: ${({ $withBorder, theme }) =>
    $withBorder ? `1px solid ${theme.colors.border.light}` : 'none'};
`;

export function FormActions({
  children,
  align = 'end',
  withBorder = true,
  className,
}: FormActionsProps) {
  return (
    <StyledFormActions $align={align} $withBorder={withBorder} className={className}>
      {children}
    </StyledFormActions>
  );
}
