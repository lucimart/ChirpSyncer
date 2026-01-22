import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConditionEditor } from './ConditionEditor';

describe('ConditionEditor', () => {
  const defaultCondition = {
    field: 'content',
    operator: 'contains',
    value: '',
  };

  const mockOnChange = jest.fn();
  const mockOnRemove = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all form elements', () => {
    render(
      <ConditionEditor
        condition={defaultCondition}
        onChange={mockOnChange}
        onRemove={mockOnRemove}
      />
    );

    expect(screen.getByLabelText('Field')).toBeInTheDocument();
    expect(screen.getByLabelText('Operator')).toBeInTheDocument();
    expect(screen.getByLabelText('Value')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });

  it('displays the current condition values', () => {
    const condition = {
      field: 'author',
      operator: 'equals',
      value: '@testuser',
    };

    render(
      <ConditionEditor
        condition={condition}
        onChange={mockOnChange}
        onRemove={mockOnRemove}
      />
    );

    expect(screen.getByLabelText('Field')).toHaveValue('author');
    expect(screen.getByLabelText('Operator')).toHaveValue('equals');
    expect(screen.getByLabelText('Value')).toHaveValue('@testuser');
  });

  it('calls onChange when field is changed', () => {
    render(
      <ConditionEditor
        condition={defaultCondition}
        onChange={mockOnChange}
        onRemove={mockOnRemove}
      />
    );

    fireEvent.change(screen.getByLabelText('Field'), { target: { value: 'author' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      field: 'author',
      operator: 'equals',
      value: '',
    });
  });

  it('calls onChange when operator is changed', () => {
    render(
      <ConditionEditor
        condition={defaultCondition}
        onChange={mockOnChange}
        onRemove={mockOnRemove}
      />
    );

    fireEvent.change(screen.getByLabelText('Operator'), { target: { value: 'not_contains' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultCondition,
      operator: 'not_contains',
    });
  });

  it('calls onChange when value is changed', async () => {
    const user = userEvent.setup();

    render(
      <ConditionEditor
        condition={defaultCondition}
        onChange={mockOnChange}
        onRemove={mockOnRemove}
      />
    );

    const valueInput = screen.getByLabelText('Value');
    await user.type(valueInput, 'test');

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('calls onRemove when remove button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <ConditionEditor
        condition={defaultCondition}
        onChange={mockOnChange}
        onRemove={mockOnRemove}
      />
    );

    await user.click(screen.getByRole('button', { name: /remove/i }));

    expect(mockOnRemove).toHaveBeenCalled();
  });

  it('shows text operators for text fields', () => {
    render(
      <ConditionEditor
        condition={defaultCondition}
        onChange={mockOnChange}
        onRemove={mockOnRemove}
      />
    );

    const operatorSelect = screen.getByLabelText('Operator');
    expect(operatorSelect).toContainHTML('Contains');
    expect(operatorSelect).toContainHTML('Excludes');
    expect(operatorSelect).toContainHTML('Equals');
    expect(operatorSelect).toContainHTML('Not equals');
  });

  it('shows numeric operators for score field', () => {
    const numericCondition = {
      field: 'score',
      operator: 'equals',
      value: 50,
    };

    render(
      <ConditionEditor
        condition={numericCondition}
        onChange={mockOnChange}
        onRemove={mockOnRemove}
      />
    );

    const operatorSelect = screen.getByLabelText('Operator');
    expect(operatorSelect).toContainHTML('Equals');
    expect(operatorSelect).toContainHTML('Greater Than');
    expect(operatorSelect).toContainHTML('Less Than');
  });

  it('shows number input for numeric fields', () => {
    const numericCondition = {
      field: 'score',
      operator: 'greater_than',
      value: 100,
    };

    render(
      <ConditionEditor
        condition={numericCondition}
        onChange={mockOnChange}
        onRemove={mockOnRemove}
      />
    );

    const valueInput = screen.getByLabelText('Value');
    expect(valueInput).toHaveAttribute('type', 'number');
  });

  it('shows text input for text fields', () => {
    render(
      <ConditionEditor
        condition={defaultCondition}
        onChange={mockOnChange}
        onRemove={mockOnRemove}
      />
    );

    const valueInput = screen.getByLabelText('Value');
    expect(valueInput).toHaveAttribute('type', 'text');
  });

  it('resets operator and value when field changes', () => {
    const condition = {
      field: 'content',
      operator: 'not_contains',
      value: 'test value',
    };

    render(
      <ConditionEditor
        condition={condition}
        onChange={mockOnChange}
        onRemove={mockOnRemove}
      />
    );

    fireEvent.change(screen.getByLabelText('Field'), { target: { value: 'score' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      field: 'score',
      operator: 'equals',
      value: '',
    });
  });
});
