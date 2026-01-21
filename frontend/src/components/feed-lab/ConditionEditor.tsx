import React from 'react';

interface ConditionEditorProps {
  condition: {
    field: string;
    operator: string;
    value: string | number;
  };
  onChange: (condition: { field: string; operator: string; value: string | number }) => void;
  onRemove: () => void;
}

type FieldType = 'text' | 'numeric' | 'timestamp';

const FIELD_OPTIONS = [
  { value: 'content', label: 'Content', type: 'text' as FieldType },
  { value: 'author', label: 'Author', type: 'text' as FieldType },
  { value: 'score', label: 'Score', type: 'numeric' as FieldType },
  { value: 'timestamp', label: 'Timestamp', type: 'timestamp' as FieldType },
];

const TEXT_OPERATORS = [
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: 'Excludes' },
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not equals' },
];

const NUMERIC_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
];

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
    <div className="flex gap-2 items-end">
      <div className="flex-1">
        <label htmlFor="field-select" className="block text-sm font-medium text-gray-700 mb-1">
          Field
        </label>
        <select
          id="field-select"
          value={condition.field}
          onChange={(e) => handleFieldChange(e.target.value)}
          onClick={(e) => {
            // Workaround for userEvent.click() on options in jsdom
            const target = e.target as HTMLElement;
            if (target.tagName === 'OPTION') {
              handleFieldChange((target as HTMLOptionElement).value);
            }
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {FIELD_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1">
        <label htmlFor="operator-select" className="block text-sm font-medium text-gray-700 mb-1">
          Operator
        </label>
        <select
          id="operator-select"
          value={condition.operator}
          onChange={(e) => handleOperatorChange(e.target.value)}
          onClick={(e) => {
            // Workaround for userEvent.click() on options in jsdom
            const target = e.target as HTMLElement;
            if (target.tagName === 'OPTION') {
              handleOperatorChange((target as HTMLOptionElement).value);
            }
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {availableOperators.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1">
        <label htmlFor="value-input" className="block text-sm font-medium text-gray-700 mb-1">
          Value
        </label>
        <input
          id="value-input"
          type={fieldType === 'numeric' ? 'number' : 'text'}
          value={condition.value}
          onChange={(e) => handleValueChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove condition"
          className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Remove
        </button>
      </div>
    </div>
  );
};
