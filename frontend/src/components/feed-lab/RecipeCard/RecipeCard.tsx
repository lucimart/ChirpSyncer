'use client';

import React, { useState } from 'react';
import styled from 'styled-components';
import { Zap, TrendingDown, Filter, Star } from 'lucide-react';

export interface RecipeCondition {
  field: 'author' | 'content' | 'engagement' | 'age' | 'platform' | string;
  operator: 'contains' | 'equals' | 'gt' | 'lt' | 'regex' | string;
  value: string | number | boolean;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  category: 'engagement' | 'filtering' | 'discovery' | 'productivity';
  type: 'boost' | 'demote' | 'filter';
  conditions: RecipeCondition[];
  weight: number;
  popularity?: number;
  tags?: string[];
}

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

const TypeIndicator = styled.span<{ $type: 'boost' | 'demote' | 'filter' }>`
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
          background: ${theme.colors.success[50]};
          color: ${theme.colors.success[600]};
        `;
      case 'demote':
        return `
          background: ${theme.colors.warning[50]};
          color: ${theme.colors.warning[600]};
        `;
      case 'filter':
        return `
          background: ${theme.colors.danger[50]};
          color: ${theme.colors.danger[600]};
        `;
    }
  }}

  svg {
    width: 14px;
    height: 14px;
  }
`;

const CategoryBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  text-transform: capitalize;
  background: ${({ theme }) => theme.colors.primary[100]};
  color: ${({ theme }) => theme.colors.primary[800]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
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

const Tag = styled.span`
  display: inline-block;
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  background: ${({ theme }) => theme.colors.neutral[100]};
  color: ${({ theme }) => theme.colors.text.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
`;

const ApplyButton = styled.button`
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]}`};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  background: ${({ theme }) => theme.colors.primary[600]};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.primary[700]};
  }
`;

const getTypeIcon = (type: 'boost' | 'demote' | 'filter') => {
  switch (type) {
    case 'boost':
      return <Zap />;
    case 'demote':
      return <TrendingDown />;
    case 'filter':
      return <Filter />;
  }
};

export const RecipeCard: React.FC<RecipeCardProps> = ({
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

  const formatWeight = (weight: number) => {
    return weight >= 0 ? `+${weight}` : `${weight}`;
  };

  const formatConditions = (conditions: RecipeCondition[]) => {
    const count = conditions.length;
    return count === 1 ? '1 condition' : `${count} conditions`;
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
        <CategoryBadge data-testid="category-badge">
          {recipe.category.charAt(0).toUpperCase() + recipe.category.slice(1)}
        </CategoryBadge>
        {recipe.popularity !== undefined && (
          <PopularityScore data-testid="popularity-score">
            <Star />
            {recipe.popularity}
          </PopularityScore>
        )}
      </MetaRow>

      <ConditionsPreview data-testid="conditions-preview">
        <span>{formatConditions(recipe.conditions)}</span>
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
            <Tag key={tag}>{tag}</Tag>
          ))}
        </TagsContainer>
      )}

      <ApplyButton onClick={handleApplyClick}>Apply</ApplyButton>
    </Card>
  );
};
