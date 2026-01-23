'use client';

import React from 'react';
import { LottieAnimation, type LottieAnimationProps } from './LottieAnimation';

// Sync complete animation - two arrows forming a circle with checkmark
const syncCompleteAnimationData = {
  v: '5.7.4',
  fr: 60,
  ip: 0,
  op: 90,
  w: 200,
  h: 200,
  nm: 'SyncComplete',
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'Check',
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: 50, s: [0], e: [100] },
            { t: 60, s: [100] },
          ],
        },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [100, 100, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 50, s: [0, 0, 100], e: [120, 120, 100] },
            { t: 65, s: [120, 120, 100], e: [100, 100, 100] },
            { t: 75, s: [100, 100, 100] },
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
                  v: [[-20, 0], [-5, 15], [25, -20]],
                  c: false,
                },
              },
            },
            {
              ty: 'st',
              c: { a: 0, k: [0.196, 0.804, 0.392, 1] },
              o: { a: 0, k: 100 },
              w: { a: 0, k: 10 },
              lc: 2,
              lj: 2,
            },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
          nm: 'Check',
        },
      ],
      ip: 50,
      op: 90,
      st: 50,
    },
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: 'SyncArrows',
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: 0, s: [100] },
            { t: 45, s: [100], e: [0] },
            { t: 55, s: [0] },
          ],
        },
        r: {
          a: 1,
          k: [
            { t: 0, s: [0], e: [360] },
            { t: 45, s: [360] },
          ],
        },
        p: { a: 0, k: [100, 100, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] },
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
                  i: [[0, -33], [33, 0]],
                  o: [[0, 33], [-33, 0]],
                  v: [[60, 0], [0, 60]],
                  c: false,
                },
              },
            },
            {
              ty: 'st',
              c: { a: 0, k: [0.314, 0.565, 0.996, 1] },
              o: { a: 0, k: 100 },
              w: { a: 0, k: 8 },
              lc: 2,
              lj: 2,
            },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
          nm: 'Arc1',
        },
        {
          ty: 'gr',
          it: [
            {
              ty: 'sh',
              d: 1,
              ks: {
                a: 0,
                k: {
                  i: [[0, 33], [-33, 0]],
                  o: [[0, -33], [33, 0]],
                  v: [[-60, 0], [0, -60]],
                  c: false,
                },
              },
            },
            {
              ty: 'st',
              c: { a: 0, k: [0.314, 0.565, 0.996, 1] },
              o: { a: 0, k: 100 },
              w: { a: 0, k: 8 },
              lc: 2,
              lj: 2,
            },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
          nm: 'Arc2',
        },
      ],
      ip: 0,
      op: 55,
      st: 0,
    },
  ],
  markers: [],
};

export interface SyncCompleteAnimationProps extends Omit<LottieAnimationProps, 'animation'> {}

export function SyncCompleteAnimation({
  size = 80,
  onComplete,
  ...props
}: SyncCompleteAnimationProps) {
  return (
    <LottieAnimation
      animation={syncCompleteAnimationData}
      size={size}
      loop={false}
      autoplay={true}
      onComplete={onComplete}
      ariaLabel="Sync complete"
      {...props}
    />
  );
}

export default SyncCompleteAnimation;
