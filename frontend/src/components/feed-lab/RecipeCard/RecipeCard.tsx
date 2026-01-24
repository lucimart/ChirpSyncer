'use client';

import React, { useState, memo } from 'react';
import styled from 'styled-components';
import { Zap, TrendingDown, Filter, Star } from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import { formatWeight, formatConditionCount } from '../shared';
import type { Recipe, RuleType, Condition } from '../shared';

// Re-export types for backwards compatibility
export type RecipeCondition = Condition;
export type { Recipe };

export interface RecipeCardProps {
  recipe: Recipe;
  onClick: (recipe: Recipe) => void;
  onApply: (recipe: Recipe) => void;
  isSelected?: boolean;
}

const Card = styled.div<{ $isSelected: boolean; $isHovered: boolean }>`
  background: ${({ theme }) => theme.colors.background.primary};
  border: 2px solid ${({ theme, $isSelected }) =>
    $isSelected ? theme.colors.primary[500] : theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing[4]};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  ${({ $isHovered, theme }) =>
    $isHovered &&
    `
    border-color: ${theme.colors.primary[300]};
    box-shadow: ${theme.shadows.md};
    transform: translateY(-2px);
  `}
`;

const CardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const CardTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const CardDescription = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0 0 ${({ theme }) => theme.spacing[3]} 0;
  line-height: 1.5;
`;

const TypeIndicator = styled.span<{ $type: RuleType }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: ${({ theme }) => theme.borderRadius.md};

  ${({ $type, theme }) => {
    switch ($type) {
      case 'boost':
        return `
          background: ${theme.colors.surface.success.bg};
          color: ${theme.colors.success[600]};
        `;
      case 'demote':
        return `
          background: ${theme.colors.surface.warning.bg};
          color: ${theme.colors.warning[600]};
        `;
      case 'filter':
        return `
          background: ${theme.colors.surface.danger.bg};
          color: ${theme.colors.danger[600]};
        `;
    }
  }}

  svg {
    width: 14px;
    height: 14px;
  }
`;

const ConditionsPreview = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const WeightIndicator = styled.span<{ $positive: boolean }>`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ $positive, theme }) =>
    $positive ? theme.colors.success[700] : theme.colors.danger[700]};
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const PopularityScore = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};

  svg {
    width: 12px;
    height: 12px;
    color: ${({ theme }) => theme.colors.warning[500]};
  }
`;

const TagsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[1]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const getTypeIcon = (type: RuleType) => {
  switch (type) {
    case 'boost':
      return <Zap />;
    case 'demote':
      return <TrendingDown />;
    case 'filter':
      return <Filter />;
  }
};

const RecipeCardComponent: React.FC<RecipeCardProps> = ({
  recipe,
  onClick,
  onApply,
  isSelected = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleCardClick = () => {
    onClick(recipe);
  };

  const handleApplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onApply(recipe);
  };

  return (
    <Card
      data-testid={`recipe-card-${recipe.id}`}
      data-selected={isSelected ? 'true' : 'false'}
      data-hovered={isHovered ? 'true' : 'false'}
      $isSelected={isSelected}
      $isHovered={isHovered}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader>
        <CardTitle>{recipe.name}</CardTitle>
        <TypeIndicator
          $type={recipe.type}
          data-testid="type-indicator"
          data-type={recipe.type}
        >
          {getTypeIcon(recipe.type)}
        </TypeIndicator>
      </CardHeader>

      <CardDescription>{recipe.description}</CardDescription>

      <MetaRow>
        <Badge variant="primary" size="sm" data-testid="category-badge">
          {recipe.category.charAt(0).toUpperCase() + recipe.category.slice(1)}
        </Badge>
        {recipe.popularity !== undefined && (
          <PopularityScore data-testid="popularity-score">
            <Star />
            {recipe.popularity}
          </PopularityScore>
        )}
      </MetaRow>

      <ConditionsPreview data-testid="conditions-preview">
        <span>{formatConditionCount(recipe.conditions.length)}</span>
        <span>|</span>
        <WeightIndicator
          $positive={recipe.weight >= 0}
          data-testid="weight-indicator"
        >
          {formatWeight(recipe.weight)}
        </WeightIndicator>
      </ConditionsPreview>

      {recipe.tags && recipe.tags.length > 0 && (
        <TagsContainer>
          {recipe.tags.map((tag) => (
            <Badge key={tag} variant="neutral-soft" size="sm">{tag}</Badge>
          ))}
        </TagsContainer>
      )}

      <Button variant="primary" size="sm" fullWidth onClick={handleApplyClick}>
        Apply
      </Button>
    </Card>
  );
};

export const RecipeCard = memo(RecipeCardComponent);
