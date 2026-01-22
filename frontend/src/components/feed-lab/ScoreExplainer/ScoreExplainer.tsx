import React from 'react';

interface MatchedCondition {
  field: string;
  operator: string;
  value: string;
}

interface AppliedRule {
  ruleId: string;
  ruleName: string;
  contribution: number;
  matchedConditions?: MatchedCondition[];
}

interface Post {
  id: string;
  content: string;
  author: string;
  timestamp: string;
  score: number;
  appliedRules: AppliedRule[];
}

interface ScoreExplainerProps {
  post: Post;
}

const BASE_SCORE = 100;

export const ScoreExplainer: React.FC<ScoreExplainerProps> = ({ post }) => {
  const totalScore = post.score;
  const hasRules = post.appliedRules.length > 0;

  const positiveRules = post.appliedRules.filter((r) => r.contribution > 0);
  const negativeRules = post.appliedRules.filter((r) => r.contribution < 0);

  const formatOperator = (operator: string): string => {
    const operatorMap: Record<string, string> = {
      contains: 'contains',
      not_contains: 'does not contain',
      equals: 'equals',
      not_equals: 'does not equal',
      greater_than: 'is greater than',
      less_than: 'is less than',
      greater_than_or_equal: 'is greater than or equal to',
      less_than_or_equal: 'is less than or equal to',
    };
    return operatorMap[operator] || operator;
  };

  const formatCondition = (condition: MatchedCondition): string => {
    return `${condition.field} ${formatOperator(condition.operator)} "${condition.value}"`;
  };

  const calculatePercentage = (contribution: number): number => {
    return Math.abs((contribution / totalScore) * 100);
  };

  const renderProgressBar = () => {
    // Calculate widths for visualization
    const maxScore = Math.max(200, totalScore); // Visual scale
    const baseWidth = (BASE_SCORE / maxScore) * 100;

    return (
      <div className="mt-4">
        <div
          className="relative w-full h-8 bg-gray-200 rounded-lg overflow-hidden"
          role="progressbar"
          aria-valuenow={totalScore}
          aria-valuemin={0}
          aria-valuemax={maxScore}
        >
          {/* Base score segment */}
          <div
            className="absolute top-0 left-0 h-full bg-blue-300"
            style={{ width: `${baseWidth}%` }}
          />

          {/* Positive contributions */}
          {positiveRules.map((rule, index) => {
            const width = (rule.contribution / maxScore) * 100;
            const previousPositive = positiveRules
              .slice(0, index)
              .reduce((sum, r) => sum + r.contribution, 0);
            const left = ((BASE_SCORE + previousPositive) / maxScore) * 100;

            return (
              <div
                key={rule.ruleId}
                data-testid={`positive-segment-${index}`}
                className="absolute top-0 h-full bg-green-400"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                }}
              />
            );
          })}

          {/* Negative contributions */}
          {negativeRules.map((rule, index) => {
            const width = (Math.abs(rule.contribution) / maxScore) * 100;
            const previousNegative = negativeRules
              .slice(0, index)
              .reduce((sum, r) => sum + r.contribution, 0);
            const totalPositive = positiveRules.reduce((sum, r) => sum + r.contribution, 0);
            const left = ((BASE_SCORE + totalPositive + previousNegative) / maxScore) * 100;

            return (
              <div
                key={rule.ruleId}
                data-testid={`negative-segment-${index}`}
                className="absolute top-0 h-full bg-red-400"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                }}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md" data-testid="score-explainer">
      <h3 className="text-xl font-bold mb-4">Score Breakdown</h3>

      <div className="mb-4">
        <p className="text-lg font-semibold">Total Score: {totalScore}</p>
      </div>

      {renderProgressBar()}

      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
          <span className="font-medium">Base Score</span>
          <span className="font-semibold">{BASE_SCORE}</span>
        </div>

        {!hasRules ? (
          <div className="p-4 bg-gray-50 rounded text-center">
            <p className="text-gray-600 font-medium">No rules applied</p>
            <p className="text-sm text-gray-500 mt-1">Base score only</p>
          </div>
        ) : (
          <div className="space-y-3">
            {post.appliedRules.map((rule) => {
              const percentage = calculatePercentage(rule.contribution);
              const sign = rule.contribution >= 0 ? '+' : '';

              return (
                <div
                  key={rule.ruleId}
                  className={`p-4 rounded-lg border-l-4 ${
                    rule.contribution >= 0
                      ? 'bg-green-50 border-green-500'
                      : 'bg-red-50 border-red-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{rule.ruleName}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-bold ${
                          rule.contribution >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {sign}{rule.contribution}
                      </span>
                      <span className="text-sm text-gray-500">({percentage.toFixed(1)}%)</span>
                    </div>
                  </div>

                  {rule.matchedConditions && rule.matchedConditions.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs font-semibold text-gray-600 mb-1">
                        Matched Conditions:
                      </p>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {rule.matchedConditions.map((condition, idx) => (
                          <li key={idx} className="ml-2">
                            • {formatCondition(condition)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
