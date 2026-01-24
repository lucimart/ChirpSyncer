'use client';

import { memo, FC, useState, useCallback, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { Send, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/TextArea';
import { Stack } from '@/components/ui/Stack';
import { Badge } from '@/components/ui/Badge';
import type { UnifiedMessage } from '@/lib/inbox';
import { PLATFORM_DEFAULTS } from '@/lib/connectors';

export interface QuickReplyProps {
  message: UnifiedMessage;
  onSend: (content: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const ReplyContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]};
  background-color: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
`;

const ReplyHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ReplyTitle = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const QuotePreview = styled.blockquote`
  margin: 0;
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  background-color: ${({ theme }) => theme.colors.background.primary};
  border-left: 3px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.tertiary};
  max-height: 60px;
  overflow: hidden;

  /* Clamp to 2 lines */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const CharCount = styled.span<{ $isOver: boolean }>`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ $isOver, theme }) =>
    $isOver ? theme.colors.danger[600] : theme.colors.text.tertiary};
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const QuickReply: FC<QuickReplyProps> = memo(
  ({ message, onSend, onCancel, isLoading = false }) => {
    const [content, setContent] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const platformLimit = PLATFORM_DEFAULTS[message.platform]?.characterLimit || 280;
    const isOverLimit = content.length > platformLimit;

    useEffect(() => {
      // Focus textarea on mount
      textareaRef.current?.focus();
    }, []);

    const handleSubmit = useCallback(async () => {
      if (content.trim() && !isOverLimit && !isLoading) {
        await onSend(content.trim());
        setContent('');
      }
    }, [content, isOverLimit, isLoading, onSend]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        // Submit on Cmd/Ctrl + Enter
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          handleSubmit();
        }
        // Cancel on Escape
        if (e.key === 'Escape') {
          onCancel();
        }
      },
      [handleSubmit, onCancel]
    );

    return (
      <ReplyContainer data-testid="quick-reply">
        <ReplyHeader>
          <Stack direction="row" gap={2} align="center">
            <ReplyTitle>Replying to {message.author_name}</ReplyTitle>
            <Badge size="sm" variant="neutral-soft">
              {message.platform}
            </Badge>
          </Stack>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            aria-label="Cancel reply"
          >
            <X size={16} />
          </Button>
        </ReplyHeader>

        <QuotePreview>{message.content}</QuotePreview>

        <TextArea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write your reply..."
          rows={3}
          disabled={isLoading}
          aria-label="Reply content"
        />

        <Footer>
          <CharCount $isOver={isOverLimit}>
            {content.length} / {platformLimit}
          </CharCount>

          <Stack direction="row" gap={2}>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              disabled={!content.trim() || isOverLimit || isLoading}
              isLoading={isLoading}
              leftIcon={<Send size={14} />}
            >
              Send Reply
            </Button>
          </Stack>
        </Footer>
      </ReplyContainer>
    );
  }
);

QuickReply.displayName = 'QuickReply';
