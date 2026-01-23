'use client';

import { useState } from 'react';
import styled from 'styled-components';
import { ExternalLink, Copy, Check, ChevronDown, ChevronUp, AlertCircle, Info } from 'lucide-react';
import { Stack } from '../Stack';
import { SmallText, Caption } from '../Typography';
import { Button } from '../Button';
import { Alert } from '../Alert';

// ============ Types ============
export interface OAuthStep {
  title: string;
  description: string;
  screenshot?: string;
  tip?: string;
}

export interface OAuthGuideProps {
  platform: string;
  portalName: string;
  portalUrl: string;
  steps: OAuthStep[];
  scopes?: string[];
  warning?: string;
  tip?: string;
  color?: string;
}

// ============ Styled Components ============
const GuideContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const PortalLink = styled.a<{ $color?: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ $color, theme }) =>
    $color ? `${$color}10` : theme.colors.primary[50]};
  border: 1px solid ${({ $color, theme }) =>
    $color ? `${$color}30` : theme.colors.primary[200]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  color: ${({ $color, theme }) => $color || theme.colors.primary[600]};
  text-decoration: none;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  transition: all 0.2s;

  &:hover {
    background: ${({ $color, theme }) =>
      $color ? `${$color}20` : theme.colors.primary[100]};
    transform: translateY(-1px);
  }
`;

const StepsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const StepCard = styled.div<{ $expanded: boolean; $color?: string }>`
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ $expanded, $color, theme }) =>
    $expanded ? ($color || theme.colors.primary[300]) : theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  overflow: hidden;
  transition: all 0.2s;
`;

const StepHeader = styled.button<{ $color?: string }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  width: 100%;
  padding: ${({ theme }) => theme.spacing[3]};
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;

  &:hover {
    background: ${({ theme }) => theme.colors.neutral[50]};
  }
`;

const StepNumber = styled.span<{ $color?: string }>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${({ $color, theme }) =>
    $color ? `${$color}15` : theme.colors.primary[100]};
  color: ${({ $color, theme }) => $color || theme.colors.primary[700]};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  flex-shrink: 0;
`;

const StepTitle = styled.span`
  flex: 1;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const StepContent = styled.div`
  padding: 0 ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[3]};
  padding-left: calc(28px + ${({ theme }) => theme.spacing[3]} + ${({ theme }) => theme.spacing[3]});
`;

const StepDescription = styled.p`
  margin: 0 0 ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
`;

const StepScreenshot = styled.img`
  width: 100%;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const StepTip = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[2]};
  background: ${({ theme }) => theme.colors.primary[50]};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.primary[700]};
`;

const ScopesSection = styled.div`
  background: ${({ theme }) => theme.colors.neutral[50]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing[3]};
`;

const ScopesList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[2]};
`;

const ScopeTag = styled.code`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const CopyButton = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.neutral[50]};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

// ============ Component ============
export function OAuthGuide({
  platform,
  portalName,
  portalUrl,
  steps,
  scopes,
  warning,
  tip,
  color,
}: OAuthGuideProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]));
  const [copiedScopes, setCopiedScopes] = useState(false);

  const toggleStep = (index: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const copyScopes = async () => {
    if (scopes) {
      await navigator.clipboard.writeText(scopes.join(' '));
      setCopiedScopes(true);
      setTimeout(() => setCopiedScopes(false), 2000);
    }
  };

  return (
    <GuideContainer>
      <PortalLink href={portalUrl} target="_blank" rel="noopener noreferrer" $color={color}>
        Open {portalName}
        <ExternalLink size={16} />
      </PortalLink>

      {warning && (
        <Alert variant="warning">
          <AlertCircle size={16} />
          {warning}
        </Alert>
      )}

      <StepsContainer>
        {steps.map((step, index) => (
          <StepCard
            key={index}
            $expanded={expandedSteps.has(index)}
            $color={color}
          >
            <StepHeader onClick={() => toggleStep(index)} $color={color}>
              <StepNumber $color={color}>{index + 1}</StepNumber>
              <StepTitle>{step.title}</StepTitle>
              {expandedSteps.has(index) ? (
                <ChevronUp size={18} color="#666" />
              ) : (
                <ChevronDown size={18} color="#666" />
              )}
            </StepHeader>

            {expandedSteps.has(index) && (
              <StepContent>
                <StepDescription>{step.description}</StepDescription>
                {step.screenshot && (
                  <StepScreenshot src={step.screenshot} alt={step.title} />
                )}
                {step.tip && (
                  <StepTip>
                    <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                    {step.tip}
                  </StepTip>
                )}
              </StepContent>
            )}
          </StepCard>
        ))}
      </StepsContainer>

      {scopes && scopes.length > 0 && (
        <ScopesSection>
          <Stack direction="row" justify="between" align="center">
            <SmallText style={{ fontWeight: 500 }}>Required Permissions (Scopes)</SmallText>
            <CopyButton onClick={copyScopes}>
              {copiedScopes ? <Check size={14} /> : <Copy size={14} />}
              {copiedScopes ? 'Copied!' : 'Copy all'}
            </CopyButton>
          </Stack>
          <ScopesList>
            {scopes.map((scope) => (
              <ScopeTag key={scope}>{scope}</ScopeTag>
            ))}
          </ScopesList>
        </ScopesSection>
      )}

      {tip && (
        <Alert variant="info">
          <Info size={16} />
          {tip}
        </Alert>
      )}
    </GuideContainer>
  );
}

export default OAuthGuide;
