'use client';

import { ReactNode } from 'react';
import styled from 'styled-components';
import { LucideIcon } from 'lucide-react';
import { Stack } from '../Stack';
import { SmallText, Caption } from '../Typography';

// ============ Types ============
export interface PlatformFeature {
  icon: LucideIcon;
  label: string;
}

export interface PlatformIntroProps {
  logo: ReactNode;
  name: string;
  tagline: string;
  description: string;
  features?: PlatformFeature[];
  color?: string;
  learnMoreUrl?: string;
}

// ============ Styled Components ============
const IntroContainer = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[4]} 0;
`;

const LogoWrapper = styled.div<{ $color?: string }>`
  width: 72px;
  height: 72px;
  margin: 0 auto ${({ theme }) => theme.spacing[4]};
  background: ${({ $color, theme }) =>
    $color ? `linear-gradient(135deg, ${$color}dd 0%, ${$color} 100%)` : theme.colors.primary[500]};
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 32px;
  font-weight: bold;
  box-shadow: 0 4px 12px ${({ $color }) => $color ? `${$color}40` : 'rgba(0,0,0,0.1)'};
`;

const PlatformName = styled.h3`
  margin: 0 0 ${({ theme }) => theme.spacing[1]};
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Tagline = styled.span`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const Description = styled.p`
  max-width: 380px;
  margin: 0 auto ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.tertiary};
  line-height: 1.6;
`;

const FeatureGrid = styled.div`
  display: flex;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
`;

const FeatureItem = styled.div<{ $color?: string }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: ${({ theme }) => theme.spacing[2]};
  min-width: 80px;
`;

const FeatureIcon = styled.div<{ $color?: string }>`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background: ${({ $color, theme }) =>
    $color ? `${$color}15` : theme.colors.primary[50]};
  color: ${({ $color, theme }) => $color || theme.colors.primary[600]};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const LearnMoreLink = styled.a`
  display: inline-block;
  margin-top: ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.primary[600]};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

// ============ Component ============
export function PlatformIntro({
  logo,
  name,
  tagline,
  description,
  features,
  color,
  learnMoreUrl,
}: PlatformIntroProps) {
  return (
    <IntroContainer>
      <LogoWrapper $color={color}>
        {logo}
      </LogoWrapper>

      <PlatformName>{name}</PlatformName>
      <Tagline>{tagline}</Tagline>
      <Description>{description}</Description>

      {features && features.length > 0 && (
        <FeatureGrid>
          {features.map((feature, index) => (
            <FeatureItem key={index} $color={color}>
              <FeatureIcon $color={color}>
                <feature.icon size={20} />
              </FeatureIcon>
              <Caption>{feature.label}</Caption>
            </FeatureItem>
          ))}
        </FeatureGrid>
      )}

      {learnMoreUrl && (
        <LearnMoreLink href={learnMoreUrl} target="_blank" rel="noopener noreferrer">
          Learn more about {name} →
        </LearnMoreLink>
      )}
    </IntroContainer>
  );
}

export default PlatformIntro;
