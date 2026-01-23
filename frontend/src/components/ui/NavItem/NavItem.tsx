'use client';

import styled from 'styled-components';
import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';

export interface NavItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Whether the item is currently active/selected */
  active?: boolean;
  /** Icon element to display on the left */
  icon?: ReactNode;
  /** Color for the icon (when not using theme colors) */
  iconColor?: string;
  /** Badge/count to display on the right */
  badge?: ReactNode;
}

const StyledNavItem = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[4]}`};
  background-color: ${({ $active, theme }) =>
    $active ? theme.colors.surface.primary.bg : 'transparent'};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background-color ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ $active, theme }) =>
      $active ? theme.colors.surface.primary.bg : theme.colors.background.secondary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const IconWrapper = styled.span<{ $color?: string }>`
  display: flex;
  align-items: center;
  color: ${({ $color, theme }) => $color ?? theme.colors.text.secondary};
`;

const Label = styled.span<{ $active: boolean }>`
  flex: 1;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ $active, theme }) =>
    $active ? theme.fontWeights.medium : theme.fontWeights.normal};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.surface.primary.text : theme.colors.text.primary};
`;

const BadgeWrapper = styled.span`
  display: flex;
  align-items: center;
`;

export const NavItem = forwardRef<HTMLButtonElement, NavItemProps>(
  ({ active = false, icon, iconColor, badge, children, ...props }, ref) => {
    return (
      <StyledNavItem ref={ref} $active={active} {...props}>
        {icon && <IconWrapper $color={iconColor}>{icon}</IconWrapper>}
        <Label $active={active}>{children}</Label>
        {badge && <BadgeWrapper>{badge}</BadgeWrapper>}
      </StyledNavItem>
    );
  }
);

NavItem.displayName = 'NavItem';
