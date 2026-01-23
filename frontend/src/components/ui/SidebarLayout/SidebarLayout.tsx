'use client';

import styled from 'styled-components';
import { HTMLAttributes, forwardRef, ReactNode } from 'react';

export interface SidebarLayoutProps extends HTMLAttributes<HTMLDivElement> {
  /** Main content */
  children: ReactNode;
  /** Sidebar content */
  sidebar: ReactNode;
  /** Sidebar width in pixels */
  sidebarWidth?: number;
  /** Gap between main and sidebar */
  gap?: 4 | 6 | 8;
  /** Sidebar position */
  sidebarPosition?: 'left' | 'right';
  /** Breakpoint for stacking (in pixels) */
  stackBelow?: number;
}

const Container = styled.div<{
  $sidebarWidth: number;
  $gap: number;
  $sidebarPosition: 'left' | 'right';
  $stackBelow: number;
}>`
  display: grid;
  grid-template-columns: ${({ $sidebarPosition, $sidebarWidth }) =>
    $sidebarPosition === 'left'
      ? `${$sidebarWidth}px 1fr`
      : `1fr ${$sidebarWidth}px`};
  gap: ${({ theme, $gap }) => theme.spacing[$gap]};

  @media (max-width: ${({ $stackBelow }) => $stackBelow}px) {
    grid-template-columns: 1fr;
  }
`;

const Main = styled.div``;

const Sidebar = styled.aside`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

export const SidebarLayout = forwardRef<HTMLDivElement, SidebarLayoutProps>(
  (
    {
      children,
      sidebar,
      sidebarWidth = 320,
      gap = 6,
      sidebarPosition = 'right',
      stackBelow = 1024,
      ...props
    },
    ref
  ) => {
    const mainContent = <Main>{children}</Main>;
    const sidebarContent = <Sidebar>{sidebar}</Sidebar>;

    return (
      <Container
        ref={ref}
        $sidebarWidth={sidebarWidth}
        $gap={gap}
        $sidebarPosition={sidebarPosition}
        $stackBelow={stackBelow}
        {...props}
      >
        {sidebarPosition === 'left' ? (
          <>
            {sidebarContent}
            {mainContent}
          </>
        ) : (
          <>
            {mainContent}
            {sidebarContent}
          </>
        )}
      </Container>
    );
  }
);

SidebarLayout.displayName = 'SidebarLayout';
