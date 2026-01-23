'use client';

import { memo, useCallback, type FC } from 'react';
import styled from 'styled-components';
import { Twitter, Cloud, Image as ImageIcon, ArrowRight } from 'lucide-react';
import { Stack } from '@/components/ui';
import type { SyncPreviewItemData } from '@/lib/api';

// Local styled components that properly forward data-testid
const ContentText = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
`;

const TimestampText = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;
import {
  type Platform,
  type PlatformIconMap,
  PLATFORM_COLORS,
  truncateContent,
  formatTimestamp,
} from '../types';

// Constants
const TRUNCATE_LENGTH = 100;
const ICON_SIZE = 14;

const PLATFORM_ICONS: PlatformIconMap = {
  twitter: Twitter,
  bluesky: Cloud,
};

export interface SyncPreviewItemProps {
  item: SyncPreviewItemData;
  onToggle: (id: string) => void;
}

const ItemContainer = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  transition: ${({ theme }) => theme.transitions.fast};

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.default};
  }
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  margin-top: 2px;
  cursor: pointer;
  accent-color: ${({ theme }) => theme.colors.primary[600]};
  flex-shrink: 0;
`;

const PlatformIcon = styled.span<{ $platform: Platform }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background: ${({ $platform }) => PLATFORM_COLORS[$platform]};
  color: white;
  flex-shrink: 0;
`;

const DirectionArrow = styled.span`
  display: flex;
  align-items: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const MediaIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
  background: ${({ theme }) => theme.colors.background.tertiary};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
`;

export const SyncPreviewItem: FC<SyncPreviewItemProps> = memo(({ item, onToggle }) => {
  const handleCheckboxChange = useCallback(() => {
    onToggle(item.id);
  }, [onToggle, item.id]);

  const SourceIcon = PLATFORM_ICONS[item.sourcePlatform];
  const TargetIcon = PLATFORM_ICONS[item.targetPlatform];

  return (
    <ItemContainer
      data-testid={`sync-preview-item-${item.id}`}
      data-selected={item.selected}
    >
      <Checkbox
        type="checkbox"
        checked={item.selected}
        onChange={handleCheckboxChange}
        aria-label={`Select item ${item.id}`}
      />
      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
        <ContentText data-testid="preview-content" style={{ lineHeight: 1.5 }}>
          {truncateContent(item.content, TRUNCATE_LENGTH)}
        </ContentText>
        <Stack direction="row" align="center" gap={3} wrap>
          <Stack direction="row" align="center" gap={2}>
            <PlatformIcon
              $platform={item.sourcePlatform}
              data-testid="source-platform-icon"
              data-platform={item.sourcePlatform}
            >
              <SourceIcon size={ICON_SIZE} />
            </PlatformIcon>
            <DirectionArrow data-testid="sync-direction-indicator">
              <ArrowRight size={16} />
            </DirectionArrow>
            <PlatformIcon
              $platform={item.targetPlatform}
              data-testid="target-platform-icon"
              data-platform={item.targetPlatform}
            >
              <TargetIcon size={ICON_SIZE} />
            </PlatformIcon>
          </Stack>
          <TimestampText data-testid="item-timestamp">
            {formatTimestamp(item.timestamp)}
          </TimestampText>
          {item.hasMedia && (
            <MediaIndicator data-testid="media-indicator">
              <ImageIcon size={ICON_SIZE} aria-hidden="true" data-testid="media-icon" />
              {item.mediaCount && item.mediaCount > 0 && (
                <span>{item.mediaCount}</span>
              )}
            </MediaIndicator>
          )}
        </Stack>
      </Stack>
    </ItemContainer>
  );
});

SyncPreviewItem.displayName = 'SyncPreviewItem';
