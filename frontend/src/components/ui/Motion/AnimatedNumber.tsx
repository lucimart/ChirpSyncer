'use client';

/**
 * AnimatedNumber
 *
 * Smoothly animates numeric value changes using react-spring.
 * Physics-based animation for natural feel.
 *
 * Usage:
 * <AnimatedNumber value={1234} />
 * <AnimatedNumber value={99.5} decimals={1} prefix="$" />
 */

import { memo, type FC } from 'react';
import { useSpring, animated, config } from '@react-spring/web';

export interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
  formatOptions?: Intl.NumberFormatOptions;
}

export const AnimatedNumber: FC<AnimatedNumberProps> = memo(({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  duration = 500,
  className,
  formatOptions,
}) => {
  const { number } = useSpring({
    from: { number: 0 },
    number: value,
    delay: 0,
    config: { ...config.gentle, duration },
  });

  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    ...formatOptions,
  });

  return (
    <animated.span className={className}>
      {number.to((n) => `${prefix}${formatter.format(n)}${suffix}`)}
    </animated.span>
  );
});

AnimatedNumber.displayName = 'AnimatedNumber';

// Variant for percentages
export interface AnimatedPercentageProps {
  value: number;
  decimals?: number;
  className?: string;
  showSign?: boolean;
}

export const AnimatedPercentage: FC<AnimatedPercentageProps> = memo(({
  value,
  decimals = 0,
  className,
  showSign = false,
}) => {
  const sign = showSign && value > 0 ? '+' : '';
  return (
    <AnimatedNumber
      value={value}
      decimals={decimals}
      prefix={sign}
      suffix="%"
      className={className}
    />
  );
});

AnimatedPercentage.displayName = 'AnimatedPercentage';

// Variant for currency
export interface AnimatedCurrencyProps {
  value: number;
  currency?: string;
  locale?: string;
  className?: string;
}

export const AnimatedCurrency: FC<AnimatedCurrencyProps> = memo(({
  value,
  currency = 'USD',
  locale = 'en-US',
  className,
}) => {
  const { number } = useSpring({
    from: { number: 0 },
    number: value,
    config: config.gentle,
  });

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <animated.span className={className}>
      {number.to((n) => formatter.format(n))}
    </animated.span>
  );
});

AnimatedCurrency.displayName = 'AnimatedCurrency';

// Variant for compact numbers (1.2K, 3.4M)
export interface AnimatedCompactNumberProps {
  value: number;
  className?: string;
}

export const AnimatedCompactNumber: FC<AnimatedCompactNumberProps> = memo(({
  value,
  className,
}) => {
  const { number } = useSpring({
    from: { number: 0 },
    number: value,
    config: config.gentle,
  });

  const formatCompact = (n: number): string => {
    if (n >= 1_000_000) {
      return `${(n / 1_000_000).toFixed(1)}M`;
    }
    if (n >= 1_000) {
      return `${(n / 1_000).toFixed(1)}K`;
    }
    return Math.round(n).toString();
  };

  return (
    <animated.span className={className}>
      {number.to(formatCompact)}
    </animated.span>
  );
});

AnimatedCompactNumber.displayName = 'AnimatedCompactNumber';

export default AnimatedNumber;
