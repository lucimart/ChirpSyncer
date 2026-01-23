'use client';

import { memo, FC, useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Link, FileText, Youtube, BookOpen, MessageSquare, Upload } from 'lucide-react';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Stack } from '@/components/ui/Stack';
import {
  detectSourceType,
  type SourceType,
  type CreateJobParams,
} from '@/lib/atomization';

export interface SourceInputProps {
  onSubmit: (params: CreateJobParams) => void;
  isLoading?: boolean;
}

const Container = styled.div`
  width: 100%;
`;

const DropZone = styled.div<{ $isDragging?: boolean }>`
  border: 2px dashed ${({ theme, $isDragging }) =>
    $isDragging ? theme.colors.primary[500] : theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing[8]};
  text-align: center;
  background-color: ${({ theme, $isDragging }) =>
    $isDragging ? theme.colors.primary[50] : theme.colors.background.secondary};
  transition: all ${({ theme }) => theme.transitions.fast};
  margin-top: ${({ theme }) => theme.spacing[4]};
`;

const DropZoneText = styled.p`
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin: 0;
`;

const SourceTypeIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[3]};
`;

const DetectedLabel = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const TabContent = styled.div`
  padding-top: ${({ theme }) => theme.spacing[4]};
`;

const tabItems = [
  { id: 'url', label: 'URL', icon: Link },
  { id: 'text', label: 'Paste Text', icon: FileText },
];

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

export const SourceInput: FC<SourceInputProps> = memo(({ onSubmit, isLoading }) => {
  const [activeTab, setActiveTab] = useState('url');
  const [urlValue, setUrlValue] = useState('');
  const [textValue, setTextValue] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const detectedType = useMemo((): SourceType | null => {
    if (activeTab === 'url' && urlValue.trim()) {
      return detectSourceType(urlValue);
    }
    if (activeTab === 'text' && textValue.trim()) {
      return detectSourceType(textValue);
    }
    return null;
  }, [activeTab, urlValue, textValue]);

  const canSubmit = useMemo(() => {
    if (isLoading) return false;
    if (activeTab === 'url') return urlValue.trim().length > 0;
    return textValue.trim().length > 0;
  }, [activeTab, urlValue, textValue, isLoading]);

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;

    if (activeTab === 'url') {
      const sourceType = detectSourceType(urlValue);
      onSubmit({
        source_type: sourceType,
        source_url: urlValue.trim(),
      });
    } else {
      const sourceType = detectSourceType(textValue);
      onSubmit({
        source_type: sourceType,
        source_content: textValue.trim(),
      });
    }
  }, [activeTab, urlValue, textValue, canSubmit, onSubmit]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const text = e.dataTransfer.getData('text/plain');
    if (text) {
      if (text.startsWith('http')) {
        setActiveTab('url');
        setUrlValue(text);
      } else {
        setActiveTab('text');
        setTextValue(text);
      }
    }
  }, []);

  const typeConfig = detectedType ? SOURCE_TYPE_CONFIG[detectedType] : null;
  const TypeIcon = typeConfig?.icon;

  return (
    <Container>
      <Tabs
        items={tabItems}
        value={activeTab}
        onChange={setActiveTab}
        variant="soft"
        aria-label="Source input type"
      />

      <TabContent>
        <TabPanel tabId="url" selectedTabId={activeTab}>
          <Stack direction="column" gap={4}>
            <Input
              placeholder="Paste a YouTube URL, blog post, or article link..."
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              startIcon={<Link size={18} />}
              fullWidth
              data-testid="url-input"
            />
          </Stack>
        </TabPanel>

        <TabPanel tabId="text" selectedTabId={activeTab}>
          <TextArea
            placeholder="Paste your content here (blog post, thread, article, etc.)"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            minRows={6}
            maxRows={12}
            fullWidth
            showCharCount
            data-testid="text-input"
          />
        </TabPanel>

        <DropZone
          $isDragging={isDragging}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload size={24} color="currentColor" style={{ opacity: 0.5 }} />
          <DropZoneText>or drag and drop content here</DropZoneText>
        </DropZone>

        {detectedType && typeConfig && TypeIcon && (
          <SourceTypeIndicator>
            <DetectedLabel>Detected:</DetectedLabel>
            <Badge
              variant={typeConfig.variant}
              size="sm"
              leftIcon={<TypeIcon size={12} />}
            >
              {typeConfig.label}
            </Badge>
          </SourceTypeIndicator>
        )}

        <Stack direction="row" justify="end" style={{ marginTop: 24 }}>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            isLoading={isLoading}
            loadingText="Analyzing..."
            data-testid="analyze-button"
          >
            Analyze
          </Button>
        </Stack>
      </TabContent>
    </Container>
  );
});

SourceInput.displayName = 'SourceInput';
