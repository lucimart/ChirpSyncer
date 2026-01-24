'use client';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarStatus = 'online' | 'offline' | 'away' | 'busy';

export interface AvatarProps {
  /** User's name (used for initials fallback and alt text) */
  name?: string;
  /** Image URL */
  src?: string;
  /** Alt text (defaults to name) */
  alt?: string;
  /** Size preset */
  size?: AvatarSize;
  /** Online status indicator */
  status?: AvatarStatus;
  /** Custom className */
  className?: string;
}

export const AVATAR_SIZES: Record<AvatarSize, { size: number; fontSize: string; statusSize: number }> = {
  xs: { size: 24, fontSize: '10px', statusSize: 6 },
  sm: { size: 32, fontSize: '12px', statusSize: 8 },
  md: { size: 40, fontSize: '14px', statusSize: 10 },
  lg: { size: 48, fontSize: '16px', statusSize: 12 },
  xl: { size: 64, fontSize: '20px', statusSize: 14 },
};

export const AVATAR_STATUS_COLORS: Record<AvatarStatus, string> = {
  online: '#22c55e',
  offline: '#9ca3af',
  away: '#f59e0b',
  busy: '#ef4444',
};
