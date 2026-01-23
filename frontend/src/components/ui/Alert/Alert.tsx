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
    background-color: ${({ theme }) => theme.colors.surface.danger.bg};
    border-color: ${({ theme }) => theme.colors.surface.danger.border};
    color: ${({ theme }) => theme.colors.surface.danger.text};
  `,
  success: css`
    background-color: ${({ theme }) => theme.colors.surface.success.bg};
    border-color: ${({ theme }) => theme.colors.surface.success.border};
    color: ${({ theme }) => theme.colors.surface.success.text};
  `,
  warning: css`
    background-color: ${({ theme }) => theme.colors.surface.warning.bg};
    border-color: ${({ theme }) => theme.colors.surface.warning.border};
    color: ${({ theme }) => theme.colors.surface.warning.text};
  `,
  info: css`
    background-color: ${({ theme }) => theme.colors.surface.info.bg};
    border-color: ${({ theme }) => theme.colors.surface.info.border};
    color: ${({ theme }) => theme.colors.surface.info.text};
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
