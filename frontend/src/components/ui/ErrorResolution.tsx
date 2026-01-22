'use client';

import React, { useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  RefreshCw, 
  ExternalLink, 
  LifeBuoy, 
  Lightbulb,
  XCircle
} from 'lucide-react';
import { Badge } from './Badge';
import { Button } from './Button/Button';

// --- Types ---

export interface ErrorDiagnosis {
  code: string;
  message: string;
  details: string[];
  timestamp: Date;
  lastSuccess?: Date;
}

export interface ResolutionOption {
  id: string;
  title: string;
  description: string;
  recommended: boolean;
  action: {
    type: 'auto' | 'manual' | 'link';
    label: string;
    handler?: () => Promise<void>;
    href?: string;
  };
}

export interface ErrorResolutionProps {
  error: ErrorDiagnosis;
  options: ResolutionOption[];
  tip?: string;
  onResolve?: (optionId: string) => Promise<void>;
  onContactSupport?: () => void;
  className?: string;
}

// --- Styles ---

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[6]};
  padding: ${({ theme }) => theme.spacing[6]};
  background-color: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.danger[100]};
  border-left: 4px solid ${({ theme }) => theme.colors.danger[500]};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  animation: ${fadeIn} 0.4s ease-out;
  max-width: 800px;
  width: 100%;
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background-color: ${({ theme }) => theme.colors.danger[50]};
  color: ${({ theme }) => theme.colors.danger[600]};
  flex-shrink: 0;

  svg {
    width: 24px;
    height: 24px;
  }
`;

const TitleSection = styled.div`
  flex: 1;
`;

const Title = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const MetaInfo = styled.div`
  margin-top: ${({ theme }) => theme.spacing[2]};
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.tertiary};
  align-items: center;

  svg {
    width: 14px;
    height: 14px;
    margin-right: ${({ theme }) => theme.spacing[1]};
  }
`;

const SectionTitle = styled.h4`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0 0 ${({ theme }) => theme.spacing[3]} 0;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const DiagnosisBox = styled.div`
  background-color: ${({ theme }) => theme.colors.neutral[50]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing[4]};
  border: 1px solid ${({ theme }) => theme.colors.neutral[200]};
`;

const DiagnosisList = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const DiagnosisItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};

  &::before {
    content: "•";
    color: ${({ theme }) => theme.colors.danger[500]};
    font-weight: bold;
  }
`;

const OptionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: ${({ theme }) => theme.spacing[4]};
`;

const OptionCard = styled.div<{ $recommended?: boolean }>`
  position: relative;
  background-color: ${({ theme, $recommended }) => 
    $recommended ? theme.colors.success[50] : theme.colors.background.primary};
  border: 1px solid ${({ theme, $recommended }) => 
    $recommended ? theme.colors.success[100] : theme.colors.neutral[200]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing[5]};
  transition: all ${({ theme }) => theme.transitions.default};
  display: flex;
  flex-direction: column;

  ${({ $recommended, theme }) => $recommended && css`
    box-shadow: 0 0 0 1px ${theme.colors.success[100]}, ${theme.shadows.sm};
  `}

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows.md};
    border-color: ${({ theme, $recommended }) => 
      $recommended ? theme.colors.success[500] : theme.colors.primary[300]};
  }
`;

const PositionedBadge = styled(Badge)`
  position: absolute;
  top: -10px;
  right: 12px;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
`;

const OptionTitle = styled.h5`
  margin: 0 0 ${({ theme }) => theme.spacing[2]} 0;
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const OptionDescription = styled.p`
  margin: 0 0 ${({ theme }) => theme.spacing[4]} 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.5;
  flex: 1;
`;

const TipSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]};
  background-color: ${({ theme }) => theme.colors.warning[50]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px dashed ${({ theme }) => theme.colors.warning[100]};
  color: ${({ theme }) => theme.colors.warning[700]};
  font-size: ${({ theme }) => theme.fontSizes.sm};

  svg {
    color: ${({ theme }) => theme.colors.warning[600]};
    flex-shrink: 0;
  }
`;

const Footer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: ${({ theme }) => theme.spacing[4]};
  border-top: 1px solid ${({ theme }) => theme.colors.neutral[100]};
`;

const SupportLink = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.neutral[500]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  cursor: pointer;
  padding: 0;
  transition: color ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.primary[600]};
    text-decoration: underline;
  }
`;

// --- Component ---

export const ErrorResolution: React.FC<ErrorResolutionProps> = ({
  error,
  options,
  tip,
  onResolve,
  onContactSupport,
  className
}) => {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleAction = async (option: ResolutionOption) => {
    if (option.action.type === 'link' && option.action.href) {
      window.open(option.action.href, '_blank', 'noopener,noreferrer');
      return;
    }

    if (option.action.handler) {
      setLoadingId(option.id);
      try {
        await option.action.handler();
      } finally {
        setLoadingId(null);
      }
    } else if (onResolve) {
      setLoadingId(option.id);
      try {
        await onResolve(option.id);
      } finally {
        setLoadingId(null);
      }
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    }).format(date);
  };

  return (
    <Container className={className}>
      <Header>
        <IconWrapper>
          <AlertTriangle />
        </IconWrapper>
        <TitleSection>
          <Title>
            {error.message}
            <Badge variant="danger" size="sm" outline>{error.code}</Badge>
          </Title>
          <MetaInfo>
            {error.lastSuccess && (
              <span title="Last successful operation">
                <CheckCircle2 /> Last success: {formatDate(error.lastSuccess)}
              </span>
            )}
            <span title="Time of error">
              <Clock /> {formatDate(error.timestamp)}
            </span>
          </MetaInfo>
        </TitleSection>
      </Header>

      <div>
        <SectionTitle>
          <XCircle size={16} /> Diagnosis
        </SectionTitle>
        <DiagnosisBox>
          <DiagnosisList>
            {error.details.map((detail, index) => (
              <DiagnosisItem key={index}>{detail}</DiagnosisItem>
            ))}
          </DiagnosisList>
        </DiagnosisBox>
      </div>

      <div>
        <SectionTitle>
          <RefreshCw size={16} /> Resolution Options
        </SectionTitle>
        <OptionsGrid>
          {options.map((option) => (
            <OptionCard key={option.id} $recommended={option.recommended}>
              {option.recommended && (
                <PositionedBadge variant="status-success" size="sm">
                  <Lightbulb size={12} /> Recommended
                </PositionedBadge>
              )}
              <OptionTitle>{option.title}</OptionTitle>
              <OptionDescription>{option.description}</OptionDescription>
              <Button 
                variant={
                  option.action.type === 'auto' ? 'primary' : 
                  option.action.type === 'manual' ? 'secondary' : 'dashed'
                }
                size="sm"
                fullWidth
                isLoading={loadingId === option.id}
                disabled={loadingId !== null}
                onClick={() => handleAction(option)}
              >
                {loadingId === option.id ? (
                  <>Processing...</>
                ) : (
                  <>
                    {option.action.type === 'auto' && <RefreshCw size={16} />}
                    {option.action.type === 'manual' && <ChevronRight size={16} />}
                    {option.action.type === 'link' && <ExternalLink size={16} />}
                    {option.action.label}
                  </>
                )}
              </Button>
            </OptionCard>
          ))}
        </OptionsGrid>
      </div>

      {tip && (
        <TipSection>
          <Lightbulb size={18} />
          <span><strong>Tip:</strong> {tip}</span>
        </TipSection>
      )}

      {onContactSupport && (
        <Footer>
          <SupportLink onClick={onContactSupport}>
            <LifeBuoy size={16} />
            Still having issues? Contact Support
          </SupportLink>
        </Footer>
      )}
    </Container>
  );
};
