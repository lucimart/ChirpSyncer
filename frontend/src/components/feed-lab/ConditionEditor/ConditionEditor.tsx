'use client';

import React from 'react';
import styled from 'styled-components';
import { Button, Input, Select } from '@/components/ui';
import {
  FIELD_OPTIONS,
  TEXT_OPERATORS,
  NUMERIC_OPERATORS,
} from '../shared';
import type { Condition } from '../shared';

interface ConditionEditorProps {
  condition: Condition;
  onChange: (condition: Condition) => void;
  onRemove: () => void;
}

const Container = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  align-items: flex-end;
`;

const FieldWrapper = styled.div`
  flex: 1;
`;

export const ConditionEditor: React.FC<ConditionEditorProps> = ({
  condition,
  onChange,
  onRemove,
}) => {
  const currentField = FIELD_OPTIONS.find((f) => f.value === condition.field);
  const fieldType = currentField?.type || 'text';

  const availableOperators = fieldType === 'numeric' ? NUMERIC_OPERATORS : TEXT_OPERATORS;

  const handleFieldChange = (newField: string) => {
    onChange({
      field: newField,
      operator: 'equals',
      value: '',
    });
  };

  const handleOperatorChange = (newOperator: string) => {
    onChange({
      ...condition,
      operator: newOperator,
    });
  };

  const handleValueChange = (newValue: string) => {
    onChange({
      ...condition,
      value: newValue,
    });
  };

  return (
    <Container>
      <FieldWrapper>
        <Select
          id="field-select"
          label="Field"
          value={condition.field}
          onChange={(e) => handleFieldChange(e.target.value)}
          options={FIELD_OPTIONS}
          fullWidth
        />
      </FieldWrapper>

      <FieldWrapper>
        <Select
          id="operator-select"
          label="Operator"
          value={condition.operator}
          onChange={(e) => handleOperatorChange(e.target.value)}
          options={availableOperators}
          fullWidth
        />
      </FieldWrapper>

      <FieldWrapper>
        <Input
          id="value-input"
          label="Value"
          type={fieldType === 'numeric' ? 'number' : 'text'}
          value={String(condition.value)}
          onChange={(e) => handleValueChange(e.target.value)}
          fullWidth
        />
      </FieldWrapper>

      <div>
        <Button
          type="button"
          variant="danger"
          onClick={onRemove}
          aria-label="Remove condition"
        >
          Remove
        </Button>
      </div>
    </Container>
  );
};
