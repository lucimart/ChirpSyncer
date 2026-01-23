'use client';

import { memo, FC, useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Hash, AlertTriangle, Lightbulb } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { TextArea } from '@/components/ui/TextArea';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Stack } from '@/components/ui/Stack';
import { Alert } from '@/components/ui/Alert';
import {
  type AtomizedContent,
  PLATFORM_CONFIG,
  getCharCountColor,
  splitIntoThreadParts,
} from '@/lib/atomization';

export interface OutputEditorProps {
  output: AtomizedContent;
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string) => void;
  isSaving?: boolean;
}

const EditorContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const PlatformHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding-bottom: ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const PlatformIcon = styled.div<{ $color: string }>`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ $color }) => $color};
  color: white;
  font-weight: ${({ theme }) => theme.fontWeights.bold};
`;

const PlatformInfo = styled.div`
  flex: 1;
`;

const PlatformName = styled.h4`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const FormatLabel = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.tertiary};
`;

const CharacterLimit = styled.div<{ $variant: 'default' | 'warning' | 'danger' }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background-color: ${({ theme, $variant }) => {
    switch ($variant) {
      case 'danger':
        return theme.colors.danger[50];
      case 'warning':
        return theme.colors.warning[50];
      default:
        return theme.colors.background.secondary;
    }
  }};
  color: ${({ theme, $variant }) => {
    switch ($variant) {
      case 'danger':
        return theme.colors.danger[700];
      case 'warning':
        return theme.colors.warning[700];
      default:
        return theme.colors.text.secondary;
    }
  }};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-variant-numeric: tabular-nums;
`;

const HashtagSection = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
  background-color: ${({ theme }) => theme.colors.background.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const HashtagTitle = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const HashtagList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const HashtagButton = styled.button`
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  background-color: ${({ theme }) => theme.colors.primary[50]};
  color: ${({ theme }) => theme.colors.primary[700]};
  border: 1px solid ${({ theme }) => theme.colors.primary[200]};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme }) => theme.colors.primary[100]};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary[500]};
    outline-offset: 2px;
  }
`;

const TipsSection = styled.div`
  padding: ${({ theme }) => theme.spacing[4]};
  background-color: ${({ theme }) => theme.colors.surface.primary.bg};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid ${({ theme }) => theme.colors.surface.primary.border};
`;

const TipsTitle = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.surface.primary.text};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const TipsList = styled.ul`
  margin: 0;
  padding-left: ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  line-height: 1.6;

  li {
    margin-bottom: ${({ theme }) => theme.spacing[1]};
  }
`;

const ThreadEditor = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const ThreadItemContainer = styled.div`
  position: relative;
  padding: ${({ theme }) => theme.spacing[3]};
  background-color: ${({ theme }) => theme.colors.background.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
`;

const ThreadNumber = styled.div`
  position: absolute;
  top: ${({ theme }) => theme.spacing[2]};
  right: ${({ theme }) => theme.spacing[2]};
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.colors.primary[600]};
  color: white;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const SUGGESTED_HASHTAGS: Record<string, string[]> = {
  twitter: ['#tech', '#startup', '#innovation', '#AI', '#productivity'],
  linkedin: ['#leadership', '#careers', '#business', '#networking', '#growth'],
  medium: ['#writing', '#storytelling', '#creativity', '#productivity', '#learning'],
  instagram: ['#content', '#creator', '#motivation', '#lifestyle', '#inspo'],
};

const PLATFORM_TIPS: Record<string, string[]> = {
  twitter: [
    'Use short, punchy sentences',
    'Add relevant emojis to increase engagement',
    'Include a call-to-action in the last tweet',
  ],
  linkedin: [
    'Start with a hook that stops the scroll',
    'Use line breaks for readability',
    'End with a question to encourage comments',
  ],
  medium: [
    'Use headers to structure your content',
    'Add images to break up long text',
    'Include a compelling intro paragraph',
  ],
  instagram: [
    'Keep the first line attention-grabbing',
    'Use relevant hashtags (5-10 recommended)',
    'Include a clear call-to-action',
  ],
};

export const OutputEditor: FC<OutputEditorProps> = memo(
  ({ output, isOpen, onClose, onSave, isSaving }) => {
    const [content, setContent] = useState(output.content);

    const platformConfig = PLATFORM_CONFIG[output.platform];
    const isThread = output.format === 'thread';

    const threadParts = useMemo(() => {
      if (isThread) {
        return splitIntoThreadParts(content);
      }
      return [];
    }, [isThread, content]);

    const charCount = content.length;
    const charCountVariant = getCharCountColor(charCount, platformConfig.charLimit);
    const isOverLimit = charCount > platformConfig.charLimit;

    const suggestedHashtags = SUGGESTED_HASHTAGS[output.platform] || [];
    const tips = PLATFORM_TIPS[output.platform] || [];

    const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setContent(e.target.value);
    }, []);

    const handleHashtagClick = useCallback((hashtag: string) => {
      setContent((prev) => `${prev} ${hashtag}`);
    }, []);

    const handleSave = useCallback(() => {
      onSave(content);
    }, [content, onSave]);

    const handleThreadPartChange = useCallback((index: number, value: string) => {
      const newParts = [...threadParts];
      newParts[index] = value;
      setContent(newParts.join('\n---\n'));
    }, [threadParts]);

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Edit Content"
        size="lg"
        footer={
          <Stack direction="row" justify="end" gap={3}>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              isLoading={isSaving}
              disabled={isOverLimit}
            >
              Save Changes
            </Button>
          </Stack>
        }
      >
        <EditorContainer>
          <PlatformHeader>
            <PlatformIcon $color={platformConfig.color}>
              {platformConfig.icon}
            </PlatformIcon>
            <PlatformInfo>
              <PlatformName>{platformConfig.name}</PlatformName>
              <FormatLabel>{output.format}</FormatLabel>
            </PlatformInfo>
            <Badge variant="neutral-soft">{output.format}</Badge>
          </PlatformHeader>

          {isOverLimit && (
            <Alert variant="error" title="Character Limit Exceeded">
              Your content exceeds the {platformConfig.charLimit.toLocaleString()} character
              limit for {platformConfig.name}.
            </Alert>
          )}

          {isThread ? (
            <ThreadEditor>
              {threadParts.map((part, index) => (
                <ThreadItemContainer key={index}>
                  <ThreadNumber>{index + 1}</ThreadNumber>
                  <TextArea
                    value={part}
                    onChange={(e) => handleThreadPartChange(index, e.target.value)}
                    minRows={3}
                    maxLength={280}
                    showCharCount
                    fullWidth
                  />
                </ThreadItemContainer>
              ))}
            </ThreadEditor>
          ) : (
            <TextArea
              value={content}
              onChange={handleContentChange}
              minRows={8}
              maxRows={20}
              showCharCount
              maxLength={platformConfig.charLimit}
              fullWidth
              error={isOverLimit ? 'Content exceeds character limit' : undefined}
            />
          )}

          <CharacterLimit $variant={charCountVariant}>
            {isOverLimit && <AlertTriangle size={16} />}
            <span>
              {charCount.toLocaleString()} / {platformConfig.charLimit.toLocaleString()} characters
            </span>
          </CharacterLimit>

          <HashtagSection>
            <HashtagTitle>
              <Hash size={16} />
              Suggested Hashtags
            </HashtagTitle>
            <HashtagList>
              {suggestedHashtags.map((tag) => (
                <HashtagButton
                  key={tag}
                  onClick={() => handleHashtagClick(tag)}
                  type="button"
                >
                  {tag}
                </HashtagButton>
              ))}
            </HashtagList>
          </HashtagSection>

          <TipsSection>
            <TipsTitle>
              <Lightbulb size={16} />
              Platform Tips
            </TipsTitle>
            <TipsList>
              {tips.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </TipsList>
          </TipsSection>
        </EditorContainer>
      </Modal>
    );
  }
);

OutputEditor.displayName = 'OutputEditor';
