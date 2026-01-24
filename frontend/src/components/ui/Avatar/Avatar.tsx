'use client';

import { memo, FC, useState, useCallback } from 'react';
import styled from 'styled-components';
import {
  AvatarProps,
  AvatarSize,
  AvatarStatus,
  AVATAR_SIZES,
  AVATAR_STATUS_COLORS,
} from './types';

const AvatarContainer = styled.div<{ $size: AvatarSize }>`
  position: relative;
  display: inline-flex;
  width: ${({ $size }) => AVATAR_SIZES[$size].size}px;
  height: ${({ $size }) => AVATAR_SIZES[$size].size}px;
  flex-shrink: 0;
`;

const AvatarImage = styled.img<{ $size: AvatarSize }>`
  width: 100%;
  height: 100%;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  object-fit: cover;
`;

const AvatarFallback = styled.div<{ $size: AvatarSize }>`
  width: 100%;
  height: 100%;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background-color: ${({ theme }) => theme.colors.primary[100]};
  color: ${({ theme }) => theme.colors.primary[700]};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: ${({ $size }) => AVATAR_SIZES[$size].fontSize};
  text-transform: uppercase;
  user-select: none;
`;

const StatusIndicator = styled.span<{ $size: AvatarSize; $status: AvatarStatus }>`
  position: absolute;
  bottom: 0;
  right: 0;
  width: ${({ $size }) => AVATAR_SIZES[$size].statusSize}px;
  height: ${({ $size }) => AVATAR_SIZES[$size].statusSize}px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background-color: ${({ $status }) => AVATAR_STATUS_COLORS[$status]};
  border: 2px solid ${({ theme }) => theme.colors.background.primary};
  box-sizing: content-box;
`;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    return parts[0].slice(0, 2);
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getStatusLabel(status: AvatarStatus): string {
  switch (status) {
    case 'online':
      return 'Online';
    case 'offline':
      return 'Offline';
    case 'away':
      return 'Away';
    case 'busy':
      return 'Busy';
  }
}

export const Avatar: FC<AvatarProps> = memo(({
  name,
  src,
  alt,
  size = 'md',
  status,
  className,
}) => {
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  const initials = name ? getInitials(name) : '?';
  const displayAlt = alt || name || 'Avatar';
  const showImage = src && !hasError;

  return (
    <AvatarContainer
      $size={size}
      className={className}
      role="img"
      aria-label={status ? `${displayAlt} (${getStatusLabel(status)})` : displayAlt}
      title={name}
    >
      {showImage ? (
        <AvatarImage
          $size={size}
          src={src}
          alt=""
          onError={handleError}
          aria-hidden="true"
        />
      ) : (
        <AvatarFallback $size={size} aria-hidden="true">
          {initials}
        </AvatarFallback>
      )}
      {status && (
        <StatusIndicator
          $size={size}
          $status={status}
          aria-hidden="true"
        />
      )}
    </AvatarContainer>
  );
});

Avatar.displayName = 'Avatar';
