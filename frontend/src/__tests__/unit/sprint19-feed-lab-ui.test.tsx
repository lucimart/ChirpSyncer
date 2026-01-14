/**
 * Sprint 19: Feed Lab UI Components - Unit Tests (TDD)
 * Tests for RuleBuilder, RuleList, ConditionEditor, FeedPreview, ScoreExplainer
 *
 * TDD Red Phase: Components don't exist yet
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// TDD - These components don't exist yet, tests will fail until implemented
// import { ThemeProvider } from '@/components/ThemeProvider';
import { RuleBuilder } from '@/components/feed-lab/RuleBuilder';
import { RuleList } from '@/components/feed-lab/RuleList';
import { ConditionEditor } from '@/components/feed-lab/ConditionEditor';
import { FeedPreview } from '@/components/feed-lab/FeedPreview';
import { ScoreExplainer } from '@/components/feed-lab/ScoreExplainer';

// Theme wrapper for tests
const ThemeProvider = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;

// Test wrapper with ThemeProvider
const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider>{component}</ThemeProvider>);
};

// Mock data
const mockRule = {
  id: '1',
  name: 'Prioritize AI posts',
  type: 'boost' as const,
  enabled: true,
  weight: 50,
  conditions: [
    { field: 'content', operator: 'contains', value: 'AI' },
  ],
};

const mockRules = [
  mockRule,
  {
    id: '2',
    name: 'Remove spam content',
    type: 'demote' as const,
    enabled: false,
    weight: -75,
    conditions: [
      { field: 'content', operator: 'contains', value: 'spam' },
    ],
  },
  {
    id: '3',
    name: 'Hide offensive content',
    type: 'filter' as const,
    enabled: true,
    weight: 0,
    conditions: [
      { field: 'content', operator: 'contains', value: 'offensive' },
    ],
  },
];

const mockPost = {
  id: '1',
  content: 'This is an AI-powered post about machine learning',
  author: 'user1',
  timestamp: '2025-01-14T10:00:00Z',
  score: 150,
  appliedRules: [
    { ruleId: '1', ruleName: 'Prioritize AI posts', contribution: 50 },
  ],
};

const mockPosts = [
  mockPost,
  {
    id: '2',
    content: 'Regular post about cats',
    author: 'user2',
    timestamp: '2025-01-14T09:00:00Z',
    score: 100,
    appliedRules: [],
  },
];

describe('RuleBuilder Component', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form for creating new rule', () => {
    renderWithTheme(<RuleBuilder onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByLabelText(/rule name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/rule type/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add condition/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create rule/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('allows selecting rule type (boost/demote/filter)', async () => {
    const user = userEvent.setup();
    renderWithTheme(<RuleBuilder onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const typeSelect = screen.getByLabelText(/rule type/i);

    // Select boost
    await user.click(typeSelect);
    await user.click(screen.getByRole('option', { name: /boost/i }));
    expect(typeSelect).toHaveValue('boost');

    // Select demote
    await user.click(typeSelect);
    await user.click(screen.getByRole('option', { name: /demote/i }));
    expect(typeSelect).toHaveValue('demote');

    // Select filter
    await user.click(typeSelect);
    await user.click(screen.getByRole('option', { name: /filter/i }));
    expect(typeSelect).toHaveValue('filter');
  });

  it('allows adding/removing conditions', async () => {
    const user = userEvent.setup();
    renderWithTheme(<RuleBuilder onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const addConditionButton = screen.getByRole('button', { name: /add condition/i });

    // Initially no conditions
    expect(screen.queryByTestId('condition-editor')).not.toBeInTheDocument();

    // Add first condition
    await user.click(addConditionButton);
    expect(screen.getByTestId('condition-editor-0')).toBeInTheDocument();

    // Add second condition
    await user.click(addConditionButton);
    expect(screen.getByTestId('condition-editor-1')).toBeInTheDocument();

    // Remove first condition
    const removeButtons = screen.getAllByRole('button', { name: /remove condition/i });
    await user.click(removeButtons[0]);
    expect(screen.queryByTestId('condition-editor-0')).not.toBeInTheDocument();
  });

  it('validates weight slider (-100 to +100)', async () => {
    const user = userEvent.setup();
    renderWithTheme(<RuleBuilder onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const weightSlider = screen.getByLabelText(/weight/i);

    // Should have min -100 and max 100
    expect(weightSlider).toHaveAttribute('min', '-100');
    expect(weightSlider).toHaveAttribute('max', '100');

    // Default value should be 0 for new rule
    expect(weightSlider).toHaveValue('0');

    // Can set to positive value
    fireEvent.change(weightSlider, { target: { value: '50' } });
    expect(weightSlider).toHaveValue('50');

    // Can set to negative value
    fireEvent.change(weightSlider, { target: { value: '-75' } });
    expect(weightSlider).toHaveValue('-75');

    // Can set to max
    fireEvent.change(weightSlider, { target: { value: '100' } });
    expect(weightSlider).toHaveValue('100');

    // Can set to min
    fireEvent.change(weightSlider, { target: { value: '-100' } });
    expect(weightSlider).toHaveValue('-100');
  });

  it('calls onSubmit with valid rule data', async () => {
    const user = userEvent.setup();
    renderWithTheme(<RuleBuilder onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // Fill in rule name
    const nameInput = screen.getByLabelText(/rule name/i);
    await user.type(nameInput, 'Test Rule');

    // Select rule type
    const typeSelect = screen.getByLabelText(/rule type/i);
    await user.click(typeSelect);
    await user.click(screen.getByRole('option', { name: /boost/i }));

    // Set weight
    const weightSlider = screen.getByLabelText(/weight/i);
    fireEvent.change(weightSlider, { target: { value: '50' } });

    // Add a condition
    await user.click(screen.getByRole('button', { name: /add condition/i }));

    // Fill in condition (this assumes ConditionEditor is working)
    const fieldSelect = screen.getByLabelText(/field/i);
    await user.click(fieldSelect);
    await user.click(screen.getByRole('option', { name: /content/i }));

    const operatorSelect = screen.getByLabelText(/operator/i);
    await user.click(operatorSelect);
    await user.click(screen.getByRole('option', { name: /contains/i }));

    const valueInput = screen.getByLabelText(/value/i);
    await user.type(valueInput, 'AI');

    // Submit
    await user.click(screen.getByRole('button', { name: /create rule/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Test Rule',
        type: 'boost',
        weight: 50,
        conditions: [
          { field: 'content', operator: 'contains', value: 'AI' },
        ],
      });
    });
  });

  it('shows validation errors for invalid input', async () => {
    const user = userEvent.setup();
    renderWithTheme(<RuleBuilder onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // Try to submit without filling anything
    await user.click(screen.getByRole('button', { name: /create rule/i }));

    await waitFor(() => {
      expect(screen.getByText(/rule name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/at least one condition is required/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('filter type disables weight slider', async () => {
    const user = userEvent.setup();
    renderWithTheme(<RuleBuilder onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const typeSelect = screen.getByLabelText(/rule type/i);
    const weightSlider = screen.getByLabelText(/weight/i);

    // Select filter type
    await user.click(typeSelect);
    await user.click(screen.getByRole('option', { name: /filter/i }));

    // Weight slider should be disabled for filter type
    expect(weightSlider).toBeDisabled();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(<RuleBuilder onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockOnCancel).toHaveBeenCalled();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('pre-fills form when editing existing rule', () => {
    renderWithTheme(
      <RuleBuilder
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        initialRule={mockRule}
      />
    );

    expect(screen.getByLabelText(/rule name/i)).toHaveValue('Prioritize AI posts');
    expect(screen.getByLabelText(/rule type/i)).toHaveValue('boost');
    expect(screen.getByLabelText(/weight/i)).toHaveValue('50');
    expect(screen.getByTestId('condition-editor-0')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update rule/i })).toBeInTheDocument();
  });
});

describe('RuleList Component', () => {
  const mockOnToggle = jest.fn();
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders list of existing rules', () => {
    renderWithTheme(
      <RuleList
        rules={mockRules}
        onToggle={mockOnToggle}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Prioritize AI posts')).toBeInTheDocument();
    expect(screen.getByText('Remove spam content')).toBeInTheDocument();
    expect(screen.getByText('Hide offensive content')).toBeInTheDocument();
  });

  it('shows rule name, type, and enabled status', () => {
    renderWithTheme(
      <RuleList
        rules={mockRules}
        onToggle={mockOnToggle}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    // Check first rule
    const firstRule = screen.getByTestId('rule-item-1');
    expect(within(firstRule).getByText('Prioritize AI posts')).toBeInTheDocument();
    expect(within(firstRule).getByText(/boost/i)).toBeInTheDocument();
    expect(within(firstRule).getByText(/weight: 50/i)).toBeInTheDocument();

    // Check enabled switch state
    const enabledSwitch = within(firstRule).getByRole('switch');
    expect(enabledSwitch).toBeChecked();

    // Check second rule (disabled)
    const secondRule = screen.getByTestId('rule-item-2');
    const disabledSwitch = within(secondRule).getByRole('switch');
    expect(disabledSwitch).not.toBeChecked();
  });

  it('toggle switch to enable/disable rules', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <RuleList
        rules={mockRules}
        onToggle={mockOnToggle}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const firstRule = screen.getByTestId('rule-item-1');
    const toggleSwitch = within(firstRule).getByRole('switch');

    await user.click(toggleSwitch);

    expect(mockOnToggle).toHaveBeenCalledWith('1', false);
  });

  it('edit and delete buttons per rule', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <RuleList
        rules={mockRules}
        onToggle={mockOnToggle}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const firstRule = screen.getByTestId('rule-item-1');

    const editButton = within(firstRule).getByRole('button', { name: /edit/i });
    const deleteButton = within(firstRule).getByRole('button', { name: /delete/i });

    await user.click(editButton);
    expect(mockOnEdit).toHaveBeenCalledWith('1');

    await user.click(deleteButton);
    expect(mockOnDelete).toHaveBeenCalledWith('1');
  });

  it('empty state when no rules', () => {
    renderWithTheme(
      <RuleList
        rules={[]}
        onToggle={mockOnToggle}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText(/no rules created yet/i)).toBeInTheDocument();
    expect(screen.getByText(/create your first rule to customize your feed/i)).toBeInTheDocument();
  });

  it('shows condition count per rule', () => {
    renderWithTheme(
      <RuleList
        rules={mockRules}
        onToggle={mockOnToggle}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const firstRule = screen.getByTestId('rule-item-1');
    expect(within(firstRule).getByText(/1 condition/i)).toBeInTheDocument();
  });

  it('displays filter type without weight', () => {
    renderWithTheme(
      <RuleList
        rules={mockRules}
        onToggle={mockOnToggle}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const filterRule = screen.getByTestId('rule-item-3');
    expect(within(filterRule).getByText(/filter/i)).toBeInTheDocument();
    expect(within(filterRule).queryByText(/weight/i)).not.toBeInTheDocument();
  });
});

describe('ConditionEditor Component', () => {
  const mockOnChange = jest.fn();
  const mockOnRemove = jest.fn();

  const mockCondition = {
    field: 'content',
    operator: 'contains',
    value: 'test',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('dropdown for field selection', () => {
    renderWithTheme(
      <ConditionEditor
        condition={mockCondition}
        onChange={mockOnChange}
        onRemove={mockOnRemove}
      />
    );

    const fieldSelect = screen.getByLabelText(/field/i);
    expect(fieldSelect).toBeInTheDocument();
    expect(fieldSelect).toHaveValue('content');
  });

  it('dropdown for operator selection', () => {
    renderWithTheme(
      <ConditionEditor
        condition={mockCondition}
        onChange={mockOnChange}
        onRemove={mockOnRemove}
      />
    );

    const operatorSelect = screen.getByLabelText(/operator/i);
    expect(operatorSelect).toBeInTheDocument();
    expect(operatorSelect).toHaveValue('contains');
  });

  it('input for value (text or number based on field)', async () => {
    renderWithTheme(
      <ConditionEditor
        condition={mockCondition}
        onChange={mockOnChange}
        onRemove={mockOnRemove}
      />
    );

    const valueInput = screen.getByLabelText(/value/i);
    expect(valueInput).toBeInTheDocument();
    expect(valueInput).toHaveValue('test');

    fireEvent.change(valueInput, { target: { value: 'new value' } });

    expect(mockOnChange).toHaveBeenLastCalledWith({
      field: 'content',
      operator: 'contains',
      value: 'new value',
    });
  });

  it('shows number input for numeric fields', () => {
    renderWithTheme(
      <ConditionEditor
        condition={{ field: 'score', operator: 'greater_than', value: '100' }}
        onChange={mockOnChange}
        onRemove={mockOnRemove}
      />
    );

    const valueInput = screen.getByLabelText(/value/i);
    expect(valueInput).toHaveAttribute('type', 'number');
  });

  it('remove condition button', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <ConditionEditor
        condition={mockCondition}
        onChange={mockOnChange}
        onRemove={mockOnRemove}
      />
    );

    const removeButton = screen.getByRole('button', { name: /remove condition/i });
    await user.click(removeButton);

    expect(mockOnRemove).toHaveBeenCalled();
  });

  it('updates field and resets operator/value when field changes', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <ConditionEditor
        condition={mockCondition}
        onChange={mockOnChange}
        onRemove={mockOnRemove}
      />
    );

    const fieldSelect = screen.getByLabelText(/field/i);
    await user.selectOptions(fieldSelect, 'author');

    expect(mockOnChange).toHaveBeenCalledWith({
      field: 'author',
      operator: 'equals',
      value: '',
    });
  });

  it('shows appropriate operators based on field type', async () => {
    const user = userEvent.setup();
    const { rerender, container } = renderWithTheme(
      <ConditionEditor
        condition={{ field: 'content', operator: 'contains', value: '' }}
        onChange={mockOnChange}
        onRemove={mockOnRemove}
      />
    );

    // For text fields, should show contains, not_contains, equals, not_equals
    let operatorSelect = screen.getByLabelText(/operator/i);
    expect(within(operatorSelect).getByRole('option', { name: /^contains$/i })).toBeInTheDocument();
    expect(within(operatorSelect).getByRole('option', { name: /excludes/i })).toBeInTheDocument();

    // For numeric fields, should show comparison operators
    rerender(
      <ThemeProvider>
        <ConditionEditor
          condition={{ field: 'score', operator: 'greater_than', value: '0' }}
          onChange={mockOnChange}
          onRemove={mockOnRemove}
        />
      </ThemeProvider>
    );

    operatorSelect = screen.getByLabelText(/operator/i);
    expect(within(operatorSelect).getByRole('option', { name: /greater than/i })).toBeInTheDocument();
    expect(within(operatorSelect).getByRole('option', { name: /less than/i })).toBeInTheDocument();
  });
});

describe('FeedPreview Component', () => {
  const mockOnPostClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows posts with applied scoring', () => {
    renderWithTheme(
      <FeedPreview posts={mockPosts} onPostClick={mockOnPostClick} />
    );

    expect(screen.getByText(/AI-powered post/i)).toBeInTheDocument();
    expect(screen.getByText(/Regular post about cats/i)).toBeInTheDocument();
  });

  it('displays score badge on each post', () => {
    renderWithTheme(
      <FeedPreview posts={mockPosts} onPostClick={mockOnPostClick} />
    );

    expect(screen.getByTestId('score-badge-1')).toHaveTextContent('150');
    expect(screen.getByTestId('score-badge-2')).toHaveTextContent('100');
  });

  it('highlights which rules affected each post', () => {
    renderWithTheme(
      <FeedPreview posts={mockPosts} onPostClick={mockOnPostClick} />
    );

    const firstPost = screen.getByTestId('post-preview-1');
    expect(within(firstPost).getByText(/Prioritize AI posts/i)).toBeInTheDocument();
    expect(within(firstPost).getByText(/\+50/)).toBeInTheDocument();

    const secondPost = screen.getByTestId('post-preview-2');
    expect(within(secondPost).getByText(/no rules applied/i)).toBeInTheDocument();
  });

  it('updates in real-time as rules change', async () => {
    const { rerender } = renderWithTheme(
      <FeedPreview posts={mockPosts} onPostClick={mockOnPostClick} />
    );

    expect(screen.getByTestId('score-badge-1')).toHaveTextContent('150');

    // Simulate rule change by re-rendering with updated posts
    const updatedPosts = [
      { ...mockPost, score: 200 },
      mockPosts[1],
    ];

    rerender(
      <ThemeProvider>
        <FeedPreview posts={updatedPosts} onPostClick={mockOnPostClick} />
      </ThemeProvider>
    );

    expect(screen.getByTestId('score-badge-1')).toHaveTextContent('200');
  });

  it('sorts posts by score in descending order', () => {
    const unsortedPosts = [
      { ...mockPosts[1], score: 100 },
      { ...mockPost, score: 150 },
    ];

    renderWithTheme(
      <FeedPreview posts={unsortedPosts} onPostClick={mockOnPostClick} />
    );

    const posts = screen.getAllByTestId(/post-preview-/);
    expect(posts[0]).toHaveAttribute('data-testid', 'post-preview-1'); // Higher score first
    expect(posts[1]).toHaveAttribute('data-testid', 'post-preview-2');
  });

  it('clicking post calls onPostClick with post data', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <FeedPreview posts={mockPosts} onPostClick={mockOnPostClick} />
    );

    const firstPost = screen.getByTestId('post-preview-1');
    await user.click(firstPost);

    expect(mockOnPostClick).toHaveBeenCalledWith(mockPost);
  });

  it('shows empty state when no posts', () => {
    renderWithTheme(
      <FeedPreview posts={[]} onPostClick={mockOnPostClick} />
    );

    expect(screen.getByText(/no posts to display/i)).toBeInTheDocument();
  });

  it('displays visual indicator for boosted posts', () => {
    renderWithTheme(
      <FeedPreview posts={mockPosts} onPostClick={mockOnPostClick} />
    );

    const boostedPost = screen.getByTestId('post-preview-1');
    expect(boostedPost).toHaveClass('boosted'); // or data-boosted attribute
  });
});

describe('ScoreExplainer Component (US-051 prep)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows breakdown of score for a single post', () => {
    renderWithTheme(<ScoreExplainer post={mockPost} />);

    expect(screen.getByText(/score breakdown/i)).toBeInTheDocument();
    expect(screen.getByText(/total score: 150/i)).toBeInTheDocument();
  });

  it('lists each rule and its contribution', () => {
    renderWithTheme(<ScoreExplainer post={mockPost} />);

    expect(screen.getByText('Prioritize AI posts')).toBeInTheDocument();
    expect(screen.getByText('+50')).toBeInTheDocument();
  });

  it('visual bar showing score composition', () => {
    renderWithTheme(<ScoreExplainer post={mockPost} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '150');
  });

  it('shows base score separately from rule contributions', () => {
    renderWithTheme(<ScoreExplainer post={mockPost} />);

    expect(screen.getByText(/base score/i)).toBeInTheDocument();
    expect(screen.getByText(/100/)).toBeInTheDocument(); // Base score before rules
  });

  it('handles multiple rule contributions', () => {
    const postWithMultipleRules = {
      ...mockPost,
      score: 175,
      appliedRules: [
        { ruleId: '1', ruleName: 'Prioritize AI posts', contribution: 50 },
        { ruleId: '4', ruleName: 'Boost trending', contribution: 25 },
      ],
    };

    renderWithTheme(<ScoreExplainer post={postWithMultipleRules} />);

    expect(screen.getByText('Prioritize AI posts')).toBeInTheDocument();
    expect(screen.getByText('Boost trending')).toBeInTheDocument();
    expect(screen.getAllByText(/\+/)).toHaveLength(2);
  });

  it('shows negative contributions for demote rules', () => {
    const postWithDemote = {
      ...mockPost,
      score: 50,
      appliedRules: [
        { ruleId: '2', ruleName: 'Remove spam content', contribution: -50 },
      ],
    };

    renderWithTheme(<ScoreExplainer post={postWithDemote} />);

    expect(screen.getByText('Remove spam content')).toBeInTheDocument();
    expect(screen.getByText('-50')).toBeInTheDocument();
  });

  it('displays percentage breakdown of each rule', () => {
    renderWithTheme(<ScoreExplainer post={mockPost} />);

    // 50 out of 150 total = 33.3%
    expect(screen.getByText(/33\.3%/)).toBeInTheDocument();
  });

  it('shows which conditions matched for each rule', () => {
    const postWithConditions = {
      ...mockPost,
      appliedRules: [
        {
          ruleId: '1',
          ruleName: 'Prioritize AI posts',
          contribution: 50,
          matchedConditions: [
            { field: 'content', operator: 'contains', value: 'AI' },
          ],
        },
      ],
    };

    renderWithTheme(<ScoreExplainer post={postWithConditions} />);

    expect(screen.getByText(/matched conditions/i)).toBeInTheDocument();
    expect(screen.getByText(/content contains "AI"/i)).toBeInTheDocument();
  });

  it('handles posts with no applied rules', () => {
    const postWithNoRules = {
      ...mockPosts[1],
      appliedRules: [],
    };

    renderWithTheme(<ScoreExplainer post={postWithNoRules} />);

    expect(screen.getByText(/no rules applied/i)).toBeInTheDocument();
    expect(screen.getByText(/base score only/i)).toBeInTheDocument();
  });

  it('shows visual segments for positive and negative contributions', () => {
    const postWithMixedRules = {
      ...mockPost,
      score: 100,
      appliedRules: [
        { ruleId: '1', ruleName: 'Boost AI', contribution: 50 },
        { ruleId: '2', ruleName: 'Demote long', contribution: -25 },
        { ruleId: '3', ruleName: 'Boost trending', contribution: 25 },
      ],
    };

    renderWithTheme(<ScoreExplainer post={postWithMixedRules} />);

    const positiveSegments = screen.getAllByTestId(/positive-segment/);
    const negativeSegments = screen.getAllByTestId(/negative-segment/);

    expect(positiveSegments).toHaveLength(2);
    expect(negativeSegments).toHaveLength(1);
  });
});
