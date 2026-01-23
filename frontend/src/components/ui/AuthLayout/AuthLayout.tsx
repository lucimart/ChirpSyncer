'use client';

import styled from 'styled-components';
import { ReactNode } from 'react';
import { Repeat } from 'lucide-react';
import { Card } from '../Card';

export interface AuthLayoutProps {
  children: ReactNode;
  /** Card title/subtitle shown below logo */
  title?: string;
  subtitle?: string;
  /** Maximum width of the card. Default: 400px */
  maxWidth?: string;
  /** Show ChirpSyncer branding. Default: true */
  showLogo?: boolean;
}

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
  width: 56px;
  height: 56px;
  background: linear-gradient(
    135deg,
    ${({ theme }) => theme.colors.primary[500]} 0%,
    ${({ theme }) => theme.colors.primary[600]} 100%
  );
  color: white;
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  box-shadow: 0 4px 14px ${({ theme }) => theme.colors.primary[500]}40;
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
  title = 'ChirpSyncer',
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
                <Repeat size={28} />
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
