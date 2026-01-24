'use client';

import styled from 'styled-components';
import { ReactNode, useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, LucideIcon } from 'lucide-react';

export interface CollapsibleMenuProps {
  label: string;
  icon?: LucideIcon;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: number;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
`;

const Header = styled.button<{ $isOpen: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  width: 100%;
  background: transparent;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  color: ${({ theme }) => theme.colors.text.secondary};

  &:hover {
    background-color: ${({ theme }) => theme.colors.background.tertiary};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const IconWrapper = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
`;

const Label = styled.span`
  flex: 1;
  text-align: left;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const ChevronWrapper = styled.span<{ $isOpen: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  transition: transform ${({ theme }) => theme.transitions.fast};
  transform: ${({ $isOpen }) => ($isOpen ? 'rotate(0deg)' : 'rotate(-90deg)')};
`;

const BadgeCount = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  font-size: 11px;
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
  background-color: ${({ theme }) => theme.colors.background.tertiary};
  border-radius: ${({ theme }) => theme.borderRadius.full};
`;

const Content = styled.div<{ $isOpen: boolean }>`
  display: ${({ $isOpen }) => ($isOpen ? 'flex' : 'none')};
  flex-direction: column;
  padding-left: ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[1]};
  gap: ${({ theme }) => theme.spacing[0.5] || '2px'};
`;

export const CollapsibleMenu = ({
  label,
  icon: Icon,
  children,
  defaultOpen = false,
  badge,
}: CollapsibleMenuProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <Container>
      <Header onClick={toggle} $isOpen={isOpen} aria-expanded={isOpen}>
        {Icon && (
          <IconWrapper>
            <Icon size={18} />
          </IconWrapper>
        )}
        <Label>{label}</Label>
        {badge !== undefined && badge > 0 && <BadgeCount>{badge}</BadgeCount>}
        <ChevronWrapper $isOpen={isOpen}>
          <ChevronDown size={14} />
        </ChevronWrapper>
      </Header>
      <Content $isOpen={isOpen}>{children}</Content>
    </Container>
  );
};

CollapsibleMenu.displayName = 'CollapsibleMenu';
