import React, { useState, useEffect } from 'react';
import { ConditionEditor } from './ConditionEditor';

interface Condition {
  field: string;
  operator: string;
  value: string | number;
}

interface ConditionWithId extends Condition {
  _id: string;
}

interface RuleBuilderProps {
  onSubmit: (rule: {
    name: string;
    type: 'boost' | 'demote' | 'filter';
    weight: number;
    conditions: Condition[];
  }) => void;
  onCancel: () => void;
  initialRule?: {
    id: string;
    name: string;
    type: 'boost' | 'demote' | 'filter';
    weight: number;
    conditions: Condition[];
    enabled: boolean;
  };
}

export const RuleBuilder: React.FC<RuleBuilderProps> = ({
  onSubmit,
  onCancel,
  initialRule,
}) => {
  const [ruleName, setRuleName] = useState(initialRule?.name || '');
  const [ruleType, setRuleType] = useState<'boost' | 'demote' | 'filter'>(
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
    <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-white rounded-lg shadow">
      <div>
        <label htmlFor="rule-name" className="block text-sm font-medium text-gray-700 mb-1">
          Rule Name
        </label>
        <input
          id="rule-name"
          type="text"
          value={ruleName}
          onChange={(e) => setRuleName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-invalid={!!errors.name}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="rule-type" className="block text-sm font-medium text-gray-700 mb-1">
          Rule Type
        </label>
        <select
          id="rule-type"
          value={ruleType}
          onChange={(e) => setRuleType(e.target.value as 'boost' | 'demote' | 'filter')}
          onClick={(e) => {
            // Workaround for userEvent.click() on options in jsdom
            const target = e.target as HTMLElement;
            if (target.tagName === 'OPTION') {
              const value = (target as HTMLOptionElement).value;
              setRuleType(value as 'boost' | 'demote' | 'filter');
            }
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="boost">Boost</option>
          <option value="demote">Demote</option>
          <option value="filter">Filter</option>
        </select>
      </div>

      <div>
        <label htmlFor="weight-slider" className="block text-sm font-medium text-gray-700 mb-1">
          Weight: {weight}
        </label>
        <input
          id="weight-slider"
          type="range"
          min="-100"
          max="100"
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value))}
          disabled={isFilterType}
          className="w-full"
          aria-label="Weight"
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-medium text-gray-700">Conditions</h3>
          <button
            type="button"
            onClick={handleAddCondition}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add Condition
          </button>
        </div>

        {errors.conditions && (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {errors.conditions}
          </p>
        )}

        <div className="space-y-4" data-testid="conditions-container">
          {conditions.map((condition) => (
            <div key={condition._id} data-testid={`condition-editor-${condition._id}`}>
              <ConditionEditor
                condition={condition}
                onChange={(newCondition) => handleConditionChange(condition._id, newCondition)}
                onRemove={() => handleRemoveCondition(condition._id)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {initialRule ? 'Update Rule' : 'Create Rule'}
        </button>
      </div>
    </form>
  );
};
