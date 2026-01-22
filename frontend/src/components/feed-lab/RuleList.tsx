'use client';

import React from 'react';
import styled from 'styled-components';
import { Pencil, Trash2, Zap, TrendingDown, Filter } from 'lucide-react';

interface Condition {
  field: string;
  operator: string;
  value: string | number;
}

interface RuleListProps {
  rules: Array<{
    id: string;
    name: string;
    type: 'boost' | 'demote' | 'filter';
    weight: number;
    conditions: Condition[];
    enabled: boolean;
  }>;
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const RulesContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const RuleCard = styled.div<{ $enabled: boolean }>`
  background: ${({ theme }) => theme.colors.background.primary};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  padding: ${({ theme }) => theme.spacing[4]};
  transition: all ${({ theme }) => theme.transitions.fast};
  opacity: ${({ $enabled }) => ($enabled ? 1 : 0.6)};
  
  &:hover {
    border-color: ${({ theme }) => theme.colors.border.default};
    box-shadow: ${({ theme }) => theme.shadows.sm};
  }
`;

const RuleHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const RuleInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const RuleTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
`;

const RuleName = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.base};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const RuleTypeBadge = styled.span<{ $type: 'boost' | 'demote' | 'filter' }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  
  ${({ $type, theme }) => {
    switch ($type) {
      case 'boost':
        return `
          background: ${theme.colors.success[50]};
          color: ${theme.colors.success[700]};
        `;
      case 'demote':
        return `
          background: ${theme.colors.warning[50]};
          color: ${theme.colors.warning[700]};
        `;
      case 'filter':
        return `
          background: ${theme.colors.danger[50]};
          color: ${theme.colors.danger[700]};
        `;
    }
  }}
  
  svg {
    width: 12px;
    height: 12px;
  }
`;

const RuleMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const WeightBadge = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const RuleActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const Toggle = styled.label`
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
`;

const ToggleInput = styled.input`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

const ToggleSlider = styled.span<{ $checked: boolean }>`
  width: 44px;
  height: 24px;
  background: ${({ $checked, theme }) =>
    $checked ? theme.colors.primary[600] : theme.colors.neutral[300]};
  border-radius: 12px;
  position: relative;
  transition: background ${({ theme }) => theme.transitions.fast};
  
  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${({ $checked }) => ($checked ? '22px' : '2px')};
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 50%;
    transition: left ${({ theme }) => theme.transitions.fast};
  }
`;

const ActionButton = styled.button<{ $variant?: 'default' | 'danger' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[3]}`};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  
  ${({ $variant, theme }) =>
    $variant === 'danger'
      ? `
          background: ${theme.colors.danger[50]};
          color: ${theme.colors.danger[700]};
          
          &:hover {
            background: ${theme.colors.danger[100]};
          }
        `
      : `
          background: ${theme.colors.background.secondary};
          color: ${theme.colors.text.secondary};
          
          &:hover {
            background: ${theme.colors.background.tertiary};
            color: ${theme.colors.text.primary};
          }
        `}
  
  svg {
    width: 14px;
    height: 14px;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[12]};
  text-align: center;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const EmptyTitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const EmptyText = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-top: ${({ theme }) => theme.spacing[2]};
`;

export const RuleList: React.FC<RuleListProps> = ({
  rules,
  onToggle,
  onEdit,
  onDelete,
}) => {
  if (rules.length === 0) {
    return (
      <EmptyState>
        <EmptyTitle>No rules created yet</EmptyTitle>
        <EmptyText>Create your first rule to customize your feed</EmptyText>
      </EmptyState>
    );
  }

  const getRuleTypeLabel = (type: 'boost' | 'demote' | 'filter') => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getRuleTypeIcon = (type: 'boost' | 'demote' | 'filter') => {
    switch (type) {
      case 'boost':
        return <Zap />;
      case 'demote':
        return <TrendingDown />;
      case 'filter':
        return <Filter />;
    }
  };

  const getConditionCountText = (count: number) => {
    return count === 1 ? '1 condition' : `${count} conditions`;
  };

  return (
    <RulesContainer>
      {rules.map((rule) => (
        <RuleCard
          key={rule.id}
          $enabled={rule.enabled}
          data-testid={`rule-item-${rule.id}`}
        >
          <RuleHeader>
            <RuleInfo>
              <RuleTitleRow>
                <RuleName>{rule.name}</RuleName>
                <RuleTypeBadge $type={rule.type} data-testid={`rule-type-badge-${rule.id}`}>
                  {getRuleTypeIcon(rule.type)}
                  {getRuleTypeLabel(rule.type)}
                </RuleTypeBadge>
              </RuleTitleRow>

              <RuleMeta>
                <span>{getConditionCountText(rule.conditions.length)}</span>
                {rule.type !== 'filter' && (
                  <WeightBadge>Weight: {rule.weight}</WeightBadge>
                )}
              </RuleMeta>
            </RuleInfo>

            <RuleActions>
              <Toggle>
                <ToggleInput
                  type="checkbox"
                  role="switch"
                  checked={rule.enabled}
                  onChange={(e) => onToggle(rule.id, e.target.checked)}
                />
                <ToggleSlider $checked={rule.enabled} />
              </Toggle>

              <ActionButton onClick={() => onEdit(rule.id)} aria-label="Edit">
                <Pencil />
                Edit
              </ActionButton>

              <ActionButton
                $variant="danger"
                onClick={() => onDelete(rule.id)}
                aria-label="Delete"
              >
                <Trash2 />
                Delete
              </ActionButton>
            </RuleActions>
          </RuleHeader>
        </RuleCard>
      ))}
    </RulesContainer>
  );
};
