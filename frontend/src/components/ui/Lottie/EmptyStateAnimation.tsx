'use client';

import React from 'react';
import { LottieAnimation, type LottieAnimationProps } from './LottieAnimation';

export type EmptyStateVariant =
  | 'default'
  | 'search'
  | 'inbox'
  | 'data'
  | 'notifications'
  | 'folder';

// Base empty box animation - a gentle floating box
const createEmptyAnimation = (variant: EmptyStateVariant) => ({
  v: '5.7.4',
  fr: 60,
  ip: 0,
  op: 120,
  w: 200,
  h: 200,
  nm: `Empty-${variant}`,
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'Icon',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: {
          a: 1,
          k: [
            { t: 0, s: [100, 100, 0], e: [100, 95, 0] },
            { t: 60, s: [100, 95, 0], e: [100, 100, 0] },
            { t: 120, s: [100, 100, 0] },
          ],
        },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] },
      },
      ao: 0,
      shapes: getShapesForVariant(variant),
      ip: 0,
      op: 120,
      st: 0,
    },
    // Subtle shadow
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: 'Shadow',
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: 0, s: [20], e: [10] },
            { t: 60, s: [10], e: [20] },
            { t: 120, s: [20] },
          ],
        },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [100, 160, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [100, 100, 100], e: [90, 100, 100] },
            { t: 60, s: [90, 100, 100], e: [100, 100, 100] },
            { t: 120, s: [100, 100, 100] },
          ],
        },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          it: [
            {
              ty: 'el',
              d: 1,
              s: { a: 0, k: [80, 16] },
              p: { a: 0, k: [0, 0] },
            },
            {
              ty: 'fl',
              c: { a: 0, k: [0.6, 0.6, 0.6, 1] },
              o: { a: 0, k: 100 },
            },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
          nm: 'Shadow',
        },
      ],
      ip: 0,
      op: 120,
      st: 0,
    },
  ],
  markers: [],
});

function getShapesForVariant(variant: EmptyStateVariant) {
  const baseColor = [0.6, 0.65, 0.7, 1]; // Neutral gray
  const accentColor = [0.314, 0.565, 0.996, 1]; // Primary blue

  switch (variant) {
    case 'search':
      return [
        {
          ty: 'gr',
          it: [
            { ty: 'el', d: 1, s: { a: 0, k: [50, 50] }, p: { a: 0, k: [-10, -10] } },
            { ty: 'st', c: { a: 0, k: baseColor }, o: { a: 0, k: 100 }, w: { a: 0, k: 8 }, lc: 2, lj: 2 },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
          nm: 'Circle',
        },
        {
          ty: 'gr',
          it: [
            { ty: 'sh', d: 1, ks: { a: 0, k: { i: [[0, 0], [0, 0]], o: [[0, 0], [0, 0]], v: [[15, 15], [35, 35]], c: false } } },
            { ty: 'st', c: { a: 0, k: baseColor }, o: { a: 0, k: 100 }, w: { a: 0, k: 8 }, lc: 2, lj: 2 },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
          nm: 'Handle',
        },
      ];
    case 'inbox':
      return [
        {
          ty: 'gr',
          it: [
            { ty: 'rc', d: 1, s: { a: 0, k: [70, 50] }, p: { a: 0, k: [0, 10] }, r: { a: 0, k: 6 } },
            { ty: 'st', c: { a: 0, k: baseColor }, o: { a: 0, k: 100 }, w: { a: 0, k: 6 }, lc: 2, lj: 2 },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
          nm: 'Box',
        },
        {
          ty: 'gr',
          it: [
            { ty: 'sh', d: 1, ks: { a: 0, k: { i: [[0, 0], [0, 0], [0, 0]], o: [[0, 0], [0, 0], [0, 0]], v: [[-35, -15], [0, -35], [35, -15]], c: false } } },
            { ty: 'st', c: { a: 0, k: accentColor }, o: { a: 0, k: 100 }, w: { a: 0, k: 6 }, lc: 2, lj: 2 },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
          nm: 'Arrow',
        },
      ];
    case 'notifications':
      return [
        {
          ty: 'gr',
          it: [
            { ty: 'sh', d: 1, ks: { a: 0, k: { i: [[0, 0], [-25, 0], [-25, -40], [25, -40], [25, 0], [0, 0]], o: [[0, 0], [-25, 0], [-25, -40], [25, -40], [25, 0], [0, 0]], v: [[-15, 25], [-30, 25], [-30, -15], [30, -15], [30, 25], [15, 25]], c: false } } },
            { ty: 'st', c: { a: 0, k: baseColor }, o: { a: 0, k: 100 }, w: { a: 0, k: 6 }, lc: 2, lj: 2 },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
          nm: 'Bell',
        },
        {
          ty: 'gr',
          it: [
            { ty: 'el', d: 1, s: { a: 0, k: [20, 12] }, p: { a: 0, k: [0, 32] } },
            { ty: 'st', c: { a: 0, k: baseColor }, o: { a: 0, k: 100 }, w: { a: 0, k: 6 }, lc: 2, lj: 2 },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
          nm: 'Clapper',
        },
      ];
    case 'data':
      return [
        {
          ty: 'gr',
          it: [
            { ty: 'rc', d: 1, s: { a: 0, k: [15, 40] }, p: { a: 0, k: [-25, 5] }, r: { a: 0, k: 3 } },
            { ty: 'fl', c: { a: 0, k: baseColor }, o: { a: 0, k: 100 } },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
          nm: 'Bar1',
        },
        {
          ty: 'gr',
          it: [
            { ty: 'rc', d: 1, s: { a: 0, k: [15, 60] }, p: { a: 0, k: [0, -5] }, r: { a: 0, k: 3 } },
            { ty: 'fl', c: { a: 0, k: accentColor }, o: { a: 0, k: 100 } },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
          nm: 'Bar2',
        },
        {
          ty: 'gr',
          it: [
            { ty: 'rc', d: 1, s: { a: 0, k: [15, 30] }, p: { a: 0, k: [25, 10] }, r: { a: 0, k: 3 } },
            { ty: 'fl', c: { a: 0, k: baseColor }, o: { a: 0, k: 100 } },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
          nm: 'Bar3',
        },
      ];
    case 'folder':
      return [
        {
          ty: 'gr',
          it: [
            { ty: 'rc', d: 1, s: { a: 0, k: [80, 55] }, p: { a: 0, k: [0, 5] }, r: { a: 0, k: 6 } },
            { ty: 'st', c: { a: 0, k: baseColor }, o: { a: 0, k: 100 }, w: { a: 0, k: 6 }, lc: 2, lj: 2 },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
          nm: 'Body',
        },
        {
          ty: 'gr',
          it: [
            { ty: 'rc', d: 1, s: { a: 0, k: [30, 12] }, p: { a: 0, k: [-20, -28] }, r: { a: 0, k: 4 } },
            { ty: 'fl', c: { a: 0, k: accentColor }, o: { a: 0, k: 100 } },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
          nm: 'Tab',
        },
      ];
    default:
      return [
        {
          ty: 'gr',
          it: [
            { ty: 'rc', d: 1, s: { a: 0, k: [70, 70] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 10 } },
            { ty: 'st', c: { a: 0, k: baseColor }, o: { a: 0, k: 100 }, w: { a: 0, k: 6 }, lc: 2, lj: 2 },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
          nm: 'Box',
        },
        {
          ty: 'gr',
          it: [
            { ty: 'sh', d: 1, ks: { a: 0, k: { i: [[0, 0], [0, 0]], o: [[0, 0], [0, 0]], v: [[-15, 0], [15, 0]], c: false } } },
            { ty: 'st', c: { a: 0, k: baseColor }, o: { a: 0, k: 100 }, w: { a: 0, k: 6 }, lc: 2, lj: 2 },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
          nm: 'Line',
        },
      ];
  }
}

export interface EmptyStateAnimationProps extends Omit<LottieAnimationProps, 'animation'> {
  /** Visual variant */
  variant?: EmptyStateVariant;
}

export function EmptyStateAnimation({
  variant = 'default',
  size = 120,
  ...props
}: EmptyStateAnimationProps) {
  const animationData = React.useMemo(
    () => createEmptyAnimation(variant),
    [variant]
  );

  return (
    <LottieAnimation
      animation={animationData}
      size={size}
      loop={true}
      autoplay={true}
      ariaLabel={`Empty ${variant} state`}
      {...props}
    />
  );
}

export default EmptyStateAnimation;
