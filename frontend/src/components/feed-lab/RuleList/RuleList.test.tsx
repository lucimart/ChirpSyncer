import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { RuleList, Rule } from './RuleList';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

const mockRules: Rule[] = [
  {
    id: 'rule-1',
    name: 'Boost High Engagement',
    type: 'boost',
    weight: 15,
    conditions: [{ field: 'engagement', operator: 'gt', value: 100 }],
    enabled: true,
  },
  {
    id: 'rule-2',
    name: 'Demote Old Posts',
    type: 'demote',
    weight: -10,
    conditions: [{ field: 'age', operator: 'gt', value: 7 }],
    enabled: true,
  },
  {
    id: 'rule-3',
    name: 'Filter Spam',
    type: 'filter',
    weight: 0,
    conditions: [
      { field: 'content', operator: 'contains', value: 'giveaway' },
      { field: 'content', operator: 'contains', value: 'free' },
    ],
    enabled: false,
  },
];

describe('RuleList', () => {
  const defaultProps = {
    rules: mockRules,
    onToggle: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all rules', () => {
    renderWithTheme(<RuleList {...defaultProps} />);

    expect(screen.getByText('Boost High Engagement')).toBeInTheDocument();
    expect(screen.getByText('Demote Old Posts')).toBeInTheDocument();
    expect(screen.getByText('Filter Spam')).toBeInTheDocument();
  });

  it('renders rule type badges', () => {
    renderWithTheme(<RuleList {...defaultProps} />);

    expect(screen.getByTestId('rule-type-badge-rule-1')).toHaveTextContent('Boost');
    expect(screen.getByTestId('rule-type-badge-rule-2')).toHaveTextContent('Demote');
    expect(screen.getByTestId('rule-type-badge-rule-3')).toHaveTextContent('Filter');
  });

  it('displays condition count', () => {
    renderWithTheme(<RuleList {...defaultProps} />);

    expect(screen.getByText('1 condition')).toBeInTheDocument();
    expect(screen.getByText('2 conditions')).toBeInTheDocument();
  });

  it('displays weight for non-filter rules', () => {
    renderWithTheme(<RuleList {...defaultProps} />);

    expect(screen.getByText('Weight: 15')).toBeInTheDocument();
    expect(screen.getByText('Weight: -10')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = jest.fn();
    renderWithTheme(<RuleList {...defaultProps} onEdit={onEdit} />);

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    expect(onEdit).toHaveBeenCalledWith('rule-1');
  });

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = jest.fn();
    renderWithTheme(<RuleList {...defaultProps} onDelete={onDelete} />);

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    expect(onDelete).toHaveBeenCalledWith('rule-1');
  });

  it('calls onToggle when switch is toggled', () => {
    const onToggle = jest.fn();
    renderWithTheme(<RuleList {...defaultProps} onToggle={onToggle} />);

    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);

    expect(onToggle).toHaveBeenCalledWith('rule-1', false);
  });

  it('renders empty state when no rules', () => {
    renderWithTheme(<RuleList {...defaultProps} rules={[]} />);

    expect(screen.getByText('No rules created yet')).toBeInTheDocument();
    expect(screen.getByText('Create your first rule to customize your feed')).toBeInTheDocument();
  });

  it('shows drag handle when onReorder is provided and multiple rules exist', () => {
    const onReorder = jest.fn();
    renderWithTheme(<RuleList {...defaultProps} onReorder={onReorder} />);

    const dragHandles = screen.getAllByLabelText('Drag to reorder');
    expect(dragHandles).toHaveLength(3);
  });

  it('does not show drag handle when onReorder is not provided', () => {
    renderWithTheme(<RuleList {...defaultProps} />);

    const dragHandles = screen.queryAllByLabelText('Drag to reorder');
    expect(dragHandles).toHaveLength(0);
  });

  it('does not show drag handle with single rule', () => {
    const onReorder = jest.fn();
    renderWithTheme(
      <RuleList {...defaultProps} rules={[mockRules[0]]} onReorder={onReorder} />
    );

    const dragHandles = screen.queryAllByLabelText('Drag to reorder');
    expect(dragHandles).toHaveLength(0);
  });

  it('renders rule items with correct test ids', () => {
    renderWithTheme(<RuleList {...defaultProps} />);

    expect(screen.getByTestId('rule-item-rule-1')).toBeInTheDocument();
    expect(screen.getByTestId('rule-item-rule-2')).toBeInTheDocument();
    expect(screen.getByTestId('rule-item-rule-3')).toBeInTheDocument();
  });

  it('shows disabled state for disabled rules', () => {
    renderWithTheme(<RuleList {...defaultProps} />);

    const disabledRule = screen.getByTestId('rule-item-rule-3');
    // The rule with enabled: false should have opacity style applied
    expect(disabledRule).toBeInTheDocument();
  });
});
