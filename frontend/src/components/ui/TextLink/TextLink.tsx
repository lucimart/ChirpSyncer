'use client';

import styled, { css } from 'styled-components';
import Link from 'next/link';
import { ComponentProps } from 'react';

type TextLinkSize = 'xs' | 'sm' | 'md';
type TextLinkAlign = 'left' | 'center' | 'right';

export interface TextLinkProps extends ComponentProps<typeof Link> {
  size?: TextLinkSize;
  align?: TextLinkAlign;
  block?: boolean;
}

const sizeStyles = {
  xs: css`
    font-size: ${({ theme }) => theme.fontSizes.xs};
  `,
  sm: css`
    font-size: ${({ theme }) => theme.fontSizes.sm};
  `,
  md: css`
    font-size: ${({ theme }) => theme.fontSizes.base};
  `,
};

const Wrapper = styled.span<{
  $size: TextLinkSize;
  $align: TextLinkAlign;
  $block: boolean;
}>`
  display: ${({ $block }) => ($block ? 'block' : 'inline')};
  text-align: ${({ $align }) => $align};
  ${({ $size }) => sizeStyles[$size]}

  a {
    color: ${({ theme }) => theme.colors.primary[600]};
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;

export function TextLink({
  size = 'sm',
  align = 'left',
  block = false,
  children,
  ...props
}: TextLinkProps) {
  return (
    <Wrapper $size={size} $align={align} $block={block}>
      <Link {...props}>{children}</Link>
    </Wrapper>
  );
}
