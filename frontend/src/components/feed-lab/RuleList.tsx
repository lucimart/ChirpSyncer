import React from 'react';

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

export const RuleList: React.FC<RuleListProps> = ({
  rules,
  onToggle,
  onEdit,
  onDelete,
}) => {
  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-gray-500 dark:text-gray-400">
          <p className="text-lg font-medium">No rules created yet</p>
          <p className="text-sm mt-2">
            Create your first rule to customize your feed
          </p>
        </div>
      </div>
    );
  }

  const getRuleTypeLabel = (type: 'boost' | 'demote' | 'filter') => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getConditionCountText = (count: number) => {
    return count === 1 ? '1 condition' : `${count} conditions`;
  };

  return (
    <div className="space-y-3">
      {rules.map((rule) => (
        <div
          key={rule.id}
          data-testid={`rule-item-${rule.id}`}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">
                  {rule.name}
                </h3>
                <span
                  data-testid={`rule-type-badge-${rule.id}`}
                  className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/30 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300"
                >
                  {getRuleTypeLabel(rule.type)}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span>{getConditionCountText(rule.conditions.length)}</span>
                {rule.type !== 'filter' && (
                  <span className="font-medium">Weight: {rule.weight}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  role="switch"
                  checked={rule.enabled}
                  onChange={(e) => onToggle(rule.id, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>

              <button
                onClick={() => onEdit(rule.id)}
                className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                aria-label="Edit"
              >
                Edit
              </button>

              <button
                onClick={() => onDelete(rule.id)}
                className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition-colors"
                aria-label="Delete"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
