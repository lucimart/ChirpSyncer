'use client';

import React, { useState } from 'react';
import styled from 'styled-components';
import { Recipe, RecipeCondition } from '../RecipeCard';

// Re-export types for consumers
export type { Recipe, RecipeCondition };

export interface RecipeDetailProps {
  recipe: Recipe;
  onApply: (recipe: Recipe) => void;
  onClose: () => void;
  onCustomize: (recipe: Recipe) => void;
  similarRecipes?: Recipe[];
}

// Styled Components
const Container = styled.div`
  background: ${({ theme }) => theme.colors.background.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  padding: ${({ theme }) => theme.spacing[6]};
  max-width: 600px;
  width: 100%;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const Title = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes['2xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const Description = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.base};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing[2]};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.xl};
  line-height: 1;
  transition: ${({ theme }) => theme.transitions.fast};

  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const Section = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`;

const SectionTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.secondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`;

const ConditionsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const ConditionItem = styled.li`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.background.primary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.sm};

  &:last-child {
    margin-bottom: 0;
  }
`;

const ConditionField = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.primary[700]};
`;

const ConditionOperator = styled.span`
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const ConditionValue = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const WeightSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const WeightDisplay = styled.div<{ $positive: boolean }>`
  font-size: ${({ theme }) => theme.fontSizes['3xl']};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme, $positive }) =>
    $positive ? theme.colors.success[700] : theme.colors.danger[700]};
  text-align: center;
`;

const WeightSlider = styled.input`
  width: 100%;
  cursor: pointer;
`;

const PreviewSection = styled.div`
  background: ${({ theme }) => theme.colors.background.primary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing[4]};
  border: 1px dashed ${({ theme }) => theme.colors.border.default};
`;

const PreviewText = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin: 0;
`;

const ActionsContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[6]};
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  flex: 1;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  cursor: pointer;
  transition: ${({ theme }) => theme.transitions.fast};

  ${({ theme, $variant }) =>
    $variant === 'primary'
      ? `
    background: ${theme.colors.primary[600]};
    color: white;
    border: none;

    &:hover {
      background: ${theme.colors.primary[700]};
    }
  `
      : `
    background: transparent;
    color: ${theme.colors.text.primary};
    border: 1px solid ${theme.colors.border.default};

    &:hover {
      background: ${theme.colors.background.primary};
    }
  `}
`;

const SimilarRecipesSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing[6]};
  padding-top: ${({ theme }) => theme.spacing[6]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const SimilarRecipeCard = styled.div`
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.background.primary};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin-bottom: ${({ theme }) => theme.spacing[2]};

  &:last-child {
    margin-bottom: 0;
  }
`;

const SimilarRecipeName = styled.p`
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

// Helper functions
const formatOperator = (operator: RecipeCondition['operator']): string => {
  const operatorMap: Record<RecipeCondition['operator'], string> = {
    contains: 'contains',
    equals: 'equals',
    gt: 'greater than',
    lt: 'less than',
    regex: 'matches',
  };
  return operatorMap[operator];
};

const formatWeight = (weight: number): string => {
  return weight >= 0 ? `+${weight}` : `${weight}`;
};

// Component
export const RecipeDetail: React.FC<RecipeDetailProps> = ({
  recipe,
  onApply,
  onClose,
  onCustomize,
  similarRecipes,
}) => {
  const [currentWeight, setCurrentWeight] = useState(recipe.weight);

  const handleApply = () => {
    onApply({ ...recipe, weight: currentWeight });
  };

  const handleCustomize = () => {
    onCustomize(recipe);
  };

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentWeight(Number(e.target.value));
  };

  const hasSimilarRecipes = similarRecipes && similarRecipes.length > 0;

  return (
    <Container data-testid="recipe-detail">
      <Header>
        <Title>{recipe.name}</Title>
        <CloseButton onClick={onClose} aria-label="Close">
          ×
        </CloseButton>
      </Header>

      <Description>{recipe.description}</Description>

      <Section>
        <SectionTitle>Conditions</SectionTitle>
        <ConditionsList data-testid="conditions-list">
          {recipe.conditions.map((condition, index) => (
            <ConditionItem key={index}>
              <ConditionField>{condition.field}</ConditionField>
              <ConditionOperator>{formatOperator(condition.operator)}</ConditionOperator>
              <ConditionValue>{condition.value}</ConditionValue>
            </ConditionItem>
          ))}
        </ConditionsList>
      </Section>

      <Section>
        <SectionTitle>Weight</SectionTitle>
        <WeightSection>
          <WeightDisplay data-testid="weight-display" $positive={currentWeight >= 0}>
            {formatWeight(currentWeight)}
          </WeightDisplay>
          <WeightSlider
            type="range"
            min="-100"
            max="100"
            value={currentWeight}
            onChange={handleWeightChange}
            aria-label="Adjust weight"
          />
        </WeightSection>
      </Section>

      <Section>
        <SectionTitle>Effect</SectionTitle>
        <PreviewSection data-testid="recipe-preview">
          <PreviewText>
            How it works: Posts matching the conditions will have their score adjusted by{' '}
            {formatWeight(currentWeight)} points.
          </PreviewText>
        </PreviewSection>
      </Section>

      <ActionsContainer>
        <Button $variant="secondary" onClick={handleCustomize}>
          Customize
        </Button>
        <Button $variant="primary" onClick={handleApply}>
          Apply Recipe
        </Button>
      </ActionsContainer>

      {hasSimilarRecipes && (
        <SimilarRecipesSection data-testid="similar-recipes">
          <SectionTitle>Similar Recipes</SectionTitle>
          {similarRecipes.map((similar) => (
            <SimilarRecipeCard key={similar.id}>
              <SimilarRecipeName>{similar.name}</SimilarRecipeName>
            </SimilarRecipeCard>
          ))}
        </SimilarRecipesSection>
      )}
    </Container>
  );
};
