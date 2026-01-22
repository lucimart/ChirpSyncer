'use client';

import styled, { css } from 'styled-components';
import type { ReactNode } from 'react';

type AlertVariant = 'error' | 'success' | 'warning' | 'info';

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
}

const variantStyles: Record<AlertVariant, ReturnType<typeof css>> = {
  error: css`
    background-color: ${({ theme }) => theme.colors.danger[50]};
    border-color: ${({ theme }) => theme.colors.danger[500]};
    color: ${({ theme }) => theme.colors.danger[700]};
  `,
  success: css`
    background-color: ${({ theme }) => theme.colors.success[50]};
    border-color: ${({ theme }) => theme.colors.success[500]};
    color: ${({ theme }) => theme.colors.success[700]};
  `,
  warning: css`
    background-color: ${({ theme }) => theme.colors.warning[50]};
    border-color: ${({ theme }) => theme.colors.warning[500]};
    color: ${({ theme }) => theme.colors.warning[700]};
  `,
  info: css`
    background-color: ${({ theme }) => theme.colors.primary[50]};
    border-color: ${({ theme }) => theme.colors.primary[500]};
    color: ${({ theme }) => theme.colors.primary[700]};
  `,
};

const Container = styled.div<{ $variant: AlertVariant }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]};
  border: 1px solid;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSizes.sm};

  ${({ $variant }) => variantStyles[$variant]}
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
`;

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const Title = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

export const Alert = ({ variant = 'error', title, icon, children }: AlertProps) => {
  return (
    <Container $variant={variant} data-variant={variant} role="alert">
      {icon && <IconWrapper data-testid="alert-icon">{icon}</IconWrapper>}
      <Content>
        {title && <Title>{title}</Title>}
        <span>{children}</span>
      </Content>
    </Container>
  );
};

Alert.displayName = 'Alert';
