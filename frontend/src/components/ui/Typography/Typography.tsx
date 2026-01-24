'use client';

import { CSSProperties, ReactNode } from 'react';
import styled, { css } from 'styled-components';

type TypographyVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'body'
  | 'body-sm'
  | 'caption'
  | 'label';

type TypographyColor = 'primary' | 'secondary' | 'tertiary' | 'success' | 'danger' | 'warning';

export interface TypographyProps {
  variant?: TypographyVariant;
  color?: TypographyColor;
  as?: keyof JSX.IntrinsicElements;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const variantStyles = {
  h1: css`
    font-size: ${({ theme }) => theme.fontSizes['2xl']};
    font-weight: ${({ theme }) => theme.fontWeights.bold};
    line-height: 1.2;
  `,
  h2: css`
    font-size: ${({ theme }) => theme.fontSizes.xl};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    line-height: 1.3;
  `,
  h3: css`
    font-size: ${({ theme }) => theme.fontSizes.lg};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    line-height: 1.4;
  `,
  h4: css`
    font-size: ${({ theme }) => theme.fontSizes.md};
    font-weight: ${({ theme }) => theme.fontWeights.medium};
    line-height: 1.4;
  `,
  body: css`
    font-size: ${({ theme }) => theme.fontSizes.md};
    font-weight: ${({ theme }) => theme.fontWeights.normal};
    line-height: 1.5;
  `,
  'body-sm': css`
    font-size: ${({ theme }) => theme.fontSizes.sm};
    font-weight: ${({ theme }) => theme.fontWeights.normal};
    line-height: 1.5;
  `,
  caption: css`
    font-size: ${({ theme }) => theme.fontSizes.xs};
    font-weight: ${({ theme }) => theme.fontWeights.normal};
    line-height: 1.4;
  `,
  label: css`
    font-size: ${({ theme }) => theme.fontSizes.sm};
    font-weight: ${({ theme }) => theme.fontWeights.medium};
    line-height: 1.4;
  `,
};

const colorStyles = {
  primary: css`
    color: ${({ theme }) => theme.colors.text.primary};
  `,
  secondary: css`
    color: ${({ theme }) => theme.colors.text.secondary};
  `,
  tertiary: css`
    color: ${({ theme }) => theme.colors.text.tertiary};
  `,
  success: css`
    color: ${({ theme }) => theme.colors.success[700]};
  `,
  danger: css`
    color: ${({ theme }) => theme.colors.danger[700]};
  `,
  warning: css`
    color: ${({ theme }) => theme.colors.warning[700]};
  `,
};

const StyledTypography = styled.span<{
  $variant: TypographyVariant;
  $color: TypographyColor;
}>`
  margin: 0;
  ${({ $variant }) => variantStyles[$variant]}
  ${({ $color }) => colorStyles[$color]}
`;

const defaultTags: Record<TypographyVariant, keyof JSX.IntrinsicElements> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  body: 'p',
  'body-sm': 'p',
  caption: 'span',
  label: 'span',
};

export function Typography({
  variant = 'body',
  color = 'primary',
  as,
  children,
  className,
  style,
}: TypographyProps) {
  const tag = as || defaultTags[variant];

  return (
    <StyledTypography
      as={tag}
      $variant={variant}
      $color={color}
      className={className}
      style={style}
      data-testid="typography"
    >
      {children}
    </StyledTypography>
  );
}

// Convenience components for common use cases
export const SectionTitle = styled(Typography).attrs({
  variant: 'h2' as TypographyVariant,
  as: 'h2',
})`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

export const PageTitle = styled(Typography).attrs({
  variant: 'h1' as TypographyVariant,
  as: 'h1',
})``;

export const Text = styled(Typography).attrs({
  variant: 'body' as TypographyVariant,
})``;

export const SmallText = styled(Typography).attrs({
  variant: 'body-sm' as TypographyVariant,
  color: 'secondary' as TypographyColor,
})``;

export const Caption = styled(Typography).attrs({
  variant: 'caption' as TypographyVariant,
  color: 'tertiary' as TypographyColor,
})``;

export const TruncatedText = styled(Text)<{ $maxWidth?: string }>`
  max-width: ${({ $maxWidth }) => $maxWidth ?? '100%'};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
