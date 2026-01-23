'use client';

import styled from 'styled-components';
import { ReactNode } from 'react';

export interface AuthFooterProps {
  children: ReactNode;
  className?: string;
}

const StyledAuthFooter = styled.div`
  margin-top: ${({ theme }) => theme.spacing[6]};
  text-align: center;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};

  a {
    color: ${({ theme }) => theme.colors.primary[600]};
    font-weight: ${({ theme }) => theme.fontWeights.medium};
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;

export function AuthFooter({ children, className }: AuthFooterProps) {
  return (
    <StyledAuthFooter className={className} data-testid="auth-footer">
      {children}
    </StyledAuthFooter>
  );
}
