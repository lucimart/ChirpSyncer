'use client';

import { ReactNode } from 'react';
import styled from 'styled-components';

export interface SettingRowProps {
  label: string;
  hint?: string;
  children: ReactNode;
  noBorder?: boolean;
}

const Container = styled.div<{ $noBorder: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing[3]} 0;
  border-bottom: ${({ $noBorder, theme }) =>
    $noBorder ? 'none' : `1px solid ${theme.colors.border.light}`};

  &:last-child {
    border-bottom: none;
  }
`;

const Info = styled.div`
  flex: 1;
  min-width: 0;
`;

const Label = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const Hint = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const Control = styled.div`
  flex-shrink: 0;
  margin-left: ${({ theme }) => theme.spacing[4]};
`;

export function SettingRow({ label, hint, children, noBorder = false }: SettingRowProps) {
  return (
    <Container $noBorder={noBorder} data-testid="setting-row">
      <Info>
        <Label>{label}</Label>
        {hint && <Hint>{hint}</Hint>}
      </Info>
      <Control>{children}</Control>
    </Container>
  );
}
