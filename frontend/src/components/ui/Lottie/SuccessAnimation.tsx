'use client';

import React from 'react';
import { LottieAnimation, type LottieAnimationProps } from './LottieAnimation';

// Optimized success checkmark animation
// Minimal Lottie JSON for a checkmark with circle
const successAnimationData = {
  v: '5.7.4',
  fr: 60,
  ip: 0,
  op: 60,
  w: 200,
  h: 200,
  nm: 'Success',
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'Checkmark',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [100, 100, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [0, 0, 100], e: [120, 120, 100] },
            { t: 20, s: [120, 120, 100], e: [100, 100, 100] },
            { t: 30, s: [100, 100, 100] },
          ],
        },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          it: [
            {
              ty: 'sh',
              d: 1,
              ks: {
                a: 0,
                k: {
                  i: [[0, 0], [0, 0], [0, 0]],
                  o: [[0, 0], [0, 0], [0, 0]],
                  v: [[-25, 0], [-5, 20], [30, -25]],
                  c: false,
                },
              },
            },
            {
              ty: 'st',
              c: { a: 0, k: [0.196, 0.804, 0.392, 1] },
              o: { a: 0, k: 100 },
              w: { a: 0, k: 12 },
              lc: 2,
              lj: 2,
            },
            {
              ty: 'tm',
              s: { a: 0, k: 0 },
              e: {
                a: 1,
                k: [
                  { t: 15, s: [0], e: [100] },
                  { t: 35, s: [100] },
                ],
              },
              o: { a: 0, k: 0 },
            },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
          nm: 'Check',
        },
      ],
      ip: 0,
      op: 60,
      st: 0,
    },
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: 'Circle',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [100, 100, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [0, 0, 100], e: [110, 110, 100] },
            { t: 15, s: [110, 110, 100], e: [100, 100, 100] },
            { t: 25, s: [100, 100, 100] },
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
              s: { a: 0, k: [120, 120] },
              p: { a: 0, k: [0, 0] },
            },
            {
              ty: 'st',
              c: { a: 0, k: [0.196, 0.804, 0.392, 1] },
              o: { a: 0, k: 100 },
              w: { a: 0, k: 8 },
              lc: 2,
              lj: 2,
            },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
          nm: 'Circle',
        },
      ],
      ip: 0,
      op: 60,
      st: 0,
    },
  ],
  markers: [],
};

export interface SuccessAnimationProps extends Omit<LottieAnimationProps, 'animation'> {
  /** Show confetti particles */
  withConfetti?: boolean;
}

export function SuccessAnimation({
  size = 100,
  onComplete,
  ...props
}: SuccessAnimationProps) {
  return (
    <LottieAnimation
      animation={successAnimationData}
      size={size}
      loop={false}
      autoplay={true}
      onComplete={onComplete}
      ariaLabel="Success"
      {...props}
    />
  );
}

export default SuccessAnimation;
