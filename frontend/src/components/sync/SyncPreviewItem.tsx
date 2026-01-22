'use client';

import styled from 'styled-components';
import { Twitter, Cloud, Image, ArrowRight } from 'lucide-react';
import type { SyncPreviewItemData } from '@/lib/api';

interface SyncPreviewItemProps {
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
`;

const ContentWrapper = styled.div`
  flex: 1;
  min-width: 0;
`;

const ContentText = styled.p`
  margin: 0 0 ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  line-height: 1.5;
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
`;

const PlatformInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const PlatformIcon = styled.span<{ $platform: 'twitter' | 'bluesky' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background: ${({ $platform }) =>
    $platform === 'twitter' ? '#1DA1F2' : '#0085FF'};
  color: white;

  svg {
    width: 14px;
    height: 14px;
  }
`;

const DirectionArrow = styled.span`
  display: flex;
  align-items: center;
  color: ${({ theme }) => theme.colors.text.tertiary};

  svg {
    width: 16px;
    height: 16px;
  }
`;

const Timestamp = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
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

const MediaIcon = styled.span`
  display: flex;
  align-items: center;

  svg {
    width: 14px;
    height: 14px;
  }
`;

function truncateContent(content: string, maxLength: number = 100): string {
  if (content.length <= maxLength) {
    return content;
  }
  return content.slice(0, maxLength) + '...';
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function PlatformIconContent({ platform }: { platform: 'twitter' | 'bluesky' }) {
  return platform === 'twitter' ? <Twitter /> : <Cloud />;
}

export function SyncPreviewItem({ item, onToggle }: SyncPreviewItemProps) {
  const handleCheckboxChange = () => {
    onToggle(item.id);
  };

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
      <ContentWrapper>
        <ContentText data-testid="preview-content">
          {truncateContent(item.content)}
        </ContentText>
        <MetaRow>
          <PlatformInfo>
            <PlatformIcon
              $platform={item.sourcePlatform}
              data-testid="source-platform-icon"
              data-platform={item.sourcePlatform}
            >
              <PlatformIconContent platform={item.sourcePlatform} />
            </PlatformIcon>
            <DirectionArrow data-testid="sync-direction-indicator">
              <ArrowRight />
            </DirectionArrow>
            <PlatformIcon
              $platform={item.targetPlatform}
              data-testid="target-platform-icon"
              data-platform={item.targetPlatform}
            >
              <PlatformIconContent platform={item.targetPlatform} />
            </PlatformIcon>
          </PlatformInfo>
          <Timestamp data-testid="item-timestamp">
            {formatTimestamp(item.timestamp)}
          </Timestamp>
          {item.hasMedia && (
            <MediaIndicator data-testid="media-indicator">
              <MediaIcon data-testid="media-icon">
                <Image />
              </MediaIcon>
              {item.mediaCount && item.mediaCount > 0 && (
                <span>{item.mediaCount}</span>
              )}
            </MediaIndicator>
          )}
        </MetaRow>
      </ContentWrapper>
    </ItemContainer>
  );
}
