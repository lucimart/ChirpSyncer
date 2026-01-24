'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ConditionEditor } from '../ConditionEditor';
import { Button, Input, Select, Label } from '@/components/ui';
import { RULE_TYPE_OPTIONS } from '../shared';
import type { Condition, ConditionWithId, Rule, RuleType } from '../shared';

interface RuleBuilderProps {
  onSubmit: (rule: {
    name: string;
    type: RuleType;
    weight: number;
    conditions: Condition[];
  }) => void;
  onCancel: () => void;
  initialRule?: Rule;
}

const FormContainer = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[6]};
  padding: ${({ theme }) => theme.spacing[6]};
  background-color: ${({ theme }) => theme.colors.background.primary};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  box-shadow: ${({ theme }) => theme.shadows.md};
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
`;

const WeightSlider = styled.input`
  width: 100%;
  height: 8px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background: ${({ theme }) => theme.colors.background.tertiary};
  outline: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.primary[500]};
    cursor: pointer;
    transition: background ${({ theme }) => theme.transitions.fast};
  }

  &::-webkit-slider-thumb:hover {
    background: ${({ theme }) => theme.colors.primary[600]};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ConditionsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const ConditionsTitle = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ConditionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`;

const ErrorMessage = styled.p`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.danger[600]};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  justify-content: flex-end;
`;

export const RuleBuilder: React.FC<RuleBuilderProps> = ({
  onSubmit,
  onCancel,
  initialRule,
}) => {
  const [ruleName, setRuleName] = useState(initialRule?.name || '');
  const [ruleType, setRuleType] = useState<RuleType>(
    initialRule?.type || 'boost'
  );
  const [weight, setWeight] = useState(initialRule?.weight ?? 0);
  const [conditions, setConditions] = useState<ConditionWithId[]>(() => {
    if (initialRule?.conditions) {
      return initialRule.conditions.map((c, i) => ({ ...c, _id: `${i}` }));
    }
    return [];
  });
  const [errors, setErrors] = useState<{ name?: string; conditions?: string }>({});
  const [nextConditionId, setNextConditionId] = useState(() => {
    if (initialRule?.conditions) {
      return initialRule.conditions.length;
    }
    return 0;
  });

  const isFilterType = ruleType === 'filter';

  useEffect(() => {
    if (isFilterType) {
      setWeight(0);
    }
  }, [isFilterType]);

  const handleAddCondition = () => {
    const newCondition: ConditionWithId = {
      field: 'content',
      operator: 'contains',
      value: '',
      _id: `${nextConditionId}`,
    };
    setConditions([...conditions, newCondition]);
    setNextConditionId(nextConditionId + 1);
  };

  const handleRemoveCondition = (id: string) => {
    setConditions(conditions.filter((c) => c._id !== id));
  };

  const handleConditionChange = (id: string, newCondition: Condition) => {
    setConditions(
      conditions.map((c) =>
        c._id === id ? { ...newCondition, _id: id } : c
      )
    );
  };

  const validateForm = (): boolean => {
    const newErrors: { name?: string; conditions?: string } = {};

    if (!ruleName.trim()) {
      newErrors.name = 'Rule name is required';
    }

    if (conditions.length === 0) {
      newErrors.conditions = 'At least one condition is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Remove _id from conditions before submitting
    const cleanedConditions = conditions.map(({ _id, ...condition }) => condition);

    onSubmit({
      name: ruleName,
      type: ruleType,
      weight,
      conditions: cleanedConditions,
    });
  };

  return (
    <FormContainer onSubmit={handleSubmit}>
      <Input
        id="rule-name"
        label="Rule Name"
        value={ruleName}
        onChange={(e) => setRuleName(e.target.value)}
        error={errors.name}
        fullWidth
        aria-invalid={!!errors.name}
      />

      <Select
        id="rule-type"
        label="Rule Type"
        value={ruleType}
        onChange={(e) => setRuleType(e.target.value as RuleType)}
        options={RULE_TYPE_OPTIONS}
        fullWidth
      />

      <FormField>
        <Label htmlFor="weight-slider" spacing="none">Weight: {weight}</Label>
        <WeightSlider
          id="weight-slider"
          type="range"
          min="-100"
          max="100"
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value))}
          disabled={isFilterType}
          aria-label="Weight"
        />
      </FormField>

      <div>
        <ConditionsHeader>
          <ConditionsTitle>Conditions</ConditionsTitle>
          <Button type="button" onClick={handleAddCondition} size="sm">
            Add Condition
          </Button>
        </ConditionsHeader>

        {errors.conditions && (
          <ErrorMessage role="alert">{errors.conditions}</ErrorMessage>
        )}

        <ConditionsContainer data-testid="conditions-container">
          {conditions.map((condition) => (
            <div key={condition._id} data-testid={`condition-editor-${condition._id}`}>
              <ConditionEditor
                condition={condition}
                onChange={(newCondition) => handleConditionChange(condition._id, newCondition)}
                onRemove={() => handleRemoveCondition(condition._id)}
              />
            </div>
          ))}
        </ConditionsContainer>
      </div>

      <ButtonGroup>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          {initialRule ? 'Update Rule' : 'Create Rule'}
        </Button>
      </ButtonGroup>
    </FormContainer>
  );
};
