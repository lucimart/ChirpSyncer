'use client';

import { memo, FC, useState, useCallback, KeyboardEvent, ChangeEvent } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export interface TagEditorProps {
  /** Current tags */
  tags: string[];
  /** Callback when tags change */
  onChange: (tags: string[]) => void;
  /** Suggested tags to show */
  suggestedTags?: string[];
  /** Maximum number of tags allowed */
  maxTags?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Placeholder text for input */
  placeholder?: string;
  /** Additional CSS class */
  className?: string;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const TagsWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[2]};
  background-color: ${({ theme }) => theme.colors.background.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  min-height: 42px;

  &:focus-within {
    border-color: ${({ theme }) => theme.colors.primary[500]};
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary[100]};
  }
`;

const TagBadge = styled(motion.span)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  background-color: ${({ theme }) => theme.colors.primary[100]};
  color: ${({ theme }) => theme.colors.primary[700]};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const RemoveButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  background: none;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  color: currentColor;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity ${({ theme }) => theme.transitions.fast};

  &:hover {
    opacity: 1;
    background-color: rgba(0, 0, 0, 0.1);
  }

  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 1px;
  }

  svg {
    width: 12px;
    height: 12px;
  }
`;

const TagInput = styled.input`
  flex: 1;
  min-width: 100px;
  border: none;
  background: none;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  outline: none;

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const SuggestionsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`;

const SuggestionsLabel = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const SuggestionsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const SuggestionBadge = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  background-color: ${({ theme }) => theme.colors.background.tertiary};
  color: ${({ theme }) => theme.colors.text.secondary};
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.borderRadius.full};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    background-color: ${({ theme }) => theme.colors.primary[50]};
    border-color: ${({ theme }) => theme.colors.primary[300]};
    color: ${({ theme }) => theme.colors.primary[700]};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary[500]};
    outline-offset: 2px;
  }

  svg {
    width: 12px;
    height: 12px;
  }
`;

const TagCount = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-left: auto;
`;

export const TagEditor: FC<TagEditorProps> = memo(({
  tags,
  onChange,
  suggestedTags = [],
  maxTags,
  disabled = false,
  placeholder = 'Add tag...',
  className,
}) => {
  const [inputValue, setInputValue] = useState('');
  const shouldReduceMotion = useReducedMotion();

  const normalizeTag = useCallback((tag: string): string => {
    return tag.toLowerCase().trim();
  }, []);

  const addTag = useCallback((rawTag: string) => {
    const tag = normalizeTag(rawTag);
    if (!tag) return;
    if (tags.includes(tag)) return;
    if (maxTags && tags.length >= maxTags) return;

    onChange([...tags, tag]);
    setInputValue('');
  }, [tags, onChange, maxTags, normalizeTag]);

  const removeTag = useCallback((tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  }, [tags, onChange]);

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Check for comma to add tag
    if (value.includes(',')) {
      const parts = value.split(',');
      const tagToAdd = parts[0];
      if (tagToAdd) {
        addTag(tagToAdd);
      }
      return;
    }

    setInputValue(value);
  }, [addTag]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }, [inputValue, addTag, tags, removeTag]);

  const handleSuggestionClick = useCallback((tag: string) => {
    addTag(tag);
  }, [addTag]);

  // Filter out tags that are already used
  const availableSuggestions = suggestedTags.filter(
    (tag) => !tags.includes(normalizeTag(tag))
  );

  const isInputDisabled = disabled || (maxTags !== undefined && tags.length >= maxTags);

  const tagAnimation = shouldReduceMotion
    ? {}
    : {
        initial: { scale: 0.8, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 0.8, opacity: 0 },
        transition: { duration: 0.15 },
      };

  return (
    <Container data-testid="tag-editor" className={className}>
      <TagsWrapper>
        <AnimatePresence mode="popLayout">
          {tags.map((tag) => (
            <TagBadge key={tag} {...tagAnimation}>
              {tag}
              {!disabled && (
                <RemoveButton
                  onClick={() => removeTag(tag)}
                  aria-label={`Remove ${tag}`}
                  type="button"
                >
                  <X />
                </RemoveButton>
              )}
            </TagBadge>
          ))}
        </AnimatePresence>

        <TagInput
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isInputDisabled}
          aria-label="Add new tag"
        />

        {maxTags !== undefined && (
          <TagCount>{tags.length}/{maxTags}</TagCount>
        )}
      </TagsWrapper>

      {availableSuggestions.length > 0 && (
        <SuggestionsSection data-testid="suggested-tags">
          <SuggestionsLabel>Suggested tags</SuggestionsLabel>
          <SuggestionsList>
            {availableSuggestions.map((tag) => (
              <SuggestionBadge
                key={tag}
                onClick={() => handleSuggestionClick(tag)}
                type="button"
                disabled={disabled}
              >
                <Plus />
                {tag}
              </SuggestionBadge>
            ))}
          </SuggestionsList>
        </SuggestionsSection>
      )}
    </Container>
  );
});

TagEditor.displayName = 'TagEditor';
