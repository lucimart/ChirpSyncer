'use client';

import styled from 'styled-components';
import { ReactNode } from 'react';
import { Card } from '../Card';

export interface AuthLayoutProps {
  children: ReactNode;
  /** Card title/subtitle shown below logo */
  title?: string;
  subtitle?: string;
  /** Maximum width of the card. Default: 400px */
  maxWidth?: string;
  /** Show Swoop branding. Default: true */
  showLogo?: boolean;
}

const SwoopIcon = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="32" height="32">
    <defs>
      <linearGradient id="swoop-icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8B5CF6"/>
        <stop offset="100%" stopColor="#34D399"/>
      </linearGradient>
    </defs>
    <path
      d="M4 22 Q16 6 28 22"
      stroke="url(#swoop-icon-gradient)"
      strokeWidth="4"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

const PageContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) =>
    theme.mode === 'dark'
      ? `linear-gradient(135deg, ${theme.colors.neutral[900]} 0%, ${theme.colors.neutral[800]} 100%)`
      : `linear-gradient(135deg, ${theme.colors.neutral[100]} 0%, ${theme.colors.neutral[50]} 100%)`};
`;

const AuthCard = styled(Card)<{ $maxWidth: string }>`
  width: 100%;
  max-width: ${({ $maxWidth }) => $maxWidth};
  box-shadow: ${({ theme }) => theme.shadows.xl};
`;

const AuthCardContent = styled(Card.Content)`
  padding: 2rem;
`;

const Logo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const LogoIcon = styled.div`
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.spacing[3]};

  svg {
    width: 64px;
    height: 64px;
  }
`;

const LogoText = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  color: ${({ theme }) => theme.colors.primary[600]};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-top: ${({ theme }) => theme.spacing[1]};
  text-align: center;
`;

export function AuthLayout({
  children,
  title = 'Swoop',
  subtitle,
  maxWidth = '400px',
  showLogo = true,
}: AuthLayoutProps) {
  return (
    <PageContainer>
      <AuthCard $maxWidth={maxWidth}>
        <AuthCardContent>
          {showLogo && (
            <Logo>
              <LogoIcon>
                <SwoopIcon />
              </LogoIcon>
              <LogoText>{title}</LogoText>
              {subtitle && <Subtitle>{subtitle}</Subtitle>}
            </Logo>
          )}
          {children}
        </AuthCardContent>
      </AuthCard>
    </PageContainer>
  );
}
