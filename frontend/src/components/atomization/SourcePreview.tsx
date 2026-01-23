'use client';

import { memo, FC } from 'react';
import styled from 'styled-components';
import { Youtube, BookOpen, MessageSquare, FileText, Calendar, User } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Stack } from '@/components/ui/Stack';
import type { SourceType } from '@/lib/atomization';

export interface SourcePreviewProps {
  sourceType: SourceType;
  url?: string;
  title?: string;
  author?: string;
  date?: string;
  thumbnail?: string;
  excerpt?: string;
}

const PreviewCard = styled(Card)`
  overflow: hidden;
`;

const ThumbnailContainer = styled.div`
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 aspect ratio */
  background-color: ${({ theme }) => theme.colors.background.tertiary};
  overflow: hidden;
`;

const Thumbnail = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const ThumbnailPlaceholder = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const Content = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
`;

const Title = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing[2]} 0;
  line-height: 1.4;
`;

const Excerpt = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const MetaItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};

  svg {
    flex-shrink: 0;
  }
`;

const SourceUrl = styled.a`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.primary[600]};
  text-decoration: none;
  display: block;
  margin-top: ${({ theme }) => theme.spacing[2]};
  word-break: break-all;

  &:hover {
    text-decoration: underline;
  }
`;

const SOURCE_TYPE_CONFIG: Record<
  SourceType,
  { label: string; icon: typeof Youtube; variant: 'danger' | 'primary' | 'success' | 'warning' }
> = {
  youtube: { label: 'YouTube Video', icon: Youtube, variant: 'danger' },
  video: { label: 'Video', icon: Youtube, variant: 'danger' },
  blog: { label: 'Blog Post', icon: BookOpen, variant: 'primary' },
  thread: { label: 'Thread', icon: MessageSquare, variant: 'success' },
  text: { label: 'Text Content', icon: FileText, variant: 'warning' },
};

export const SourcePreview: FC<SourcePreviewProps> = memo(
  ({ sourceType, url, title, author, date, thumbnail, excerpt }) => {
    const typeConfig = SOURCE_TYPE_CONFIG[sourceType];
    const TypeIcon = typeConfig.icon;

    const displayTitle = title || 'Untitled Content';
    const displayExcerpt = excerpt || 'Content preview will appear here after analysis.';

    return (
      <PreviewCard padding="none" data-testid="source-preview">
        {(thumbnail || sourceType === 'youtube') && (
          <ThumbnailContainer>
            {thumbnail ? (
              <Thumbnail src={thumbnail} alt={displayTitle} />
            ) : (
              <ThumbnailPlaceholder>
                <TypeIcon size={48} />
              </ThumbnailPlaceholder>
            )}
          </ThumbnailContainer>
        )}

        <Content>
          <Stack direction="row" align="center" gap={2} style={{ marginBottom: 8 }}>
            <Badge
              variant={typeConfig.variant}
              size="sm"
              leftIcon={<TypeIcon size={12} />}
            >
              {typeConfig.label}
            </Badge>
          </Stack>

          <Title>{displayTitle}</Title>
          <Excerpt>{displayExcerpt}</Excerpt>

          <Stack direction="row" gap={4} style={{ marginTop: 12 }}>
            {author && (
              <MetaItem>
                <User size={12} />
                <span>{author}</span>
              </MetaItem>
            )}
            {date && (
              <MetaItem>
                <Calendar size={12} />
                <span>{date}</span>
              </MetaItem>
            )}
          </Stack>

          {url && (
            <SourceUrl href={url} target="_blank" rel="noopener noreferrer">
              {url}
            </SourceUrl>
          )}
        </Content>
      </PreviewCard>
    );
  }
);

SourcePreview.displayName = 'SourcePreview';
