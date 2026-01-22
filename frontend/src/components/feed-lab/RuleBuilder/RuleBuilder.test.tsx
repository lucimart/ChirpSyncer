import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RuleBuilder } from './RuleBuilder';

describe('RuleBuilder', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders create form when no initial rule provided', () => {
    render(<RuleBuilder onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByLabelText(/rule name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/rule type/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create rule/i })).toBeInTheDocument();
  });

  it('renders edit form when initial rule provided', () => {
    const initialRule = {
      id: 'test-rule',
      name: 'Test Rule',
      type: 'boost' as const,
      weight: 50,
      conditions: [{ field: 'content', operator: 'contains', value: 'test' }],
      enabled: true,
    };

    render(
      <RuleBuilder
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        initialRule={initialRule}
      />
    );

    expect(screen.getByLabelText(/rule name/i)).toHaveValue('Test Rule');
    expect(screen.getByRole('button', { name: /update rule/i })).toBeInTheDocument();
  });

  it('shows validation error when submitting empty name', async () => {
    render(<RuleBuilder onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    fireEvent.click(screen.getByRole('button', { name: /create rule/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/rule name is required/i);
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('shows validation error when submitting without conditions', async () => {
    const user = userEvent.setup();

    render(<RuleBuilder onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    await user.type(screen.getByLabelText(/rule name/i), 'Test Rule');
    fireEvent.click(screen.getByRole('button', { name: /create rule/i }));

    expect(await screen.findByText(/at least one condition is required/i)).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('adds a condition when clicking Add Condition', async () => {
    const user = userEvent.setup();

    render(<RuleBuilder onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    await user.click(screen.getByRole('button', { name: /add condition/i }));

    const conditionsContainer = screen.getByTestId('conditions-container');
    expect(conditionsContainer.children.length).toBe(1);
  });

  it('removes a condition when clicking Remove', async () => {
    const user = userEvent.setup();

    render(<RuleBuilder onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // Add two conditions
    await user.click(screen.getByRole('button', { name: /add condition/i }));
    await user.click(screen.getByRole('button', { name: /add condition/i }));

    let conditionsContainer = screen.getByTestId('conditions-container');
    expect(conditionsContainer.children.length).toBe(2);

    // Remove one
    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    await user.click(removeButtons[0]);

    conditionsContainer = screen.getByTestId('conditions-container');
    expect(conditionsContainer.children.length).toBe(1);
  });

  it('calls onCancel when Cancel button is clicked', async () => {
    const user = userEvent.setup();

    render(<RuleBuilder onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('submits valid form data', async () => {
    const user = userEvent.setup();

    render(<RuleBuilder onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    // Fill in name
    await user.type(screen.getByLabelText(/rule name/i), 'My New Rule');

    // Add a condition
    await user.click(screen.getByRole('button', { name: /add condition/i }));

    // Submit
    await user.click(screen.getByRole('button', { name: /create rule/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My New Rule',
          type: 'boost',
          conditions: expect.arrayContaining([
            expect.objectContaining({ field: 'content', operator: 'contains' }),
          ]),
        })
      );
    });
  });

  it('changes rule type correctly', async () => {
    render(<RuleBuilder onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const typeSelect = screen.getByLabelText(/rule type/i);
    fireEvent.change(typeSelect, { target: { value: 'demote' } });

    expect(typeSelect).toHaveValue('demote');
  });

  it('disables weight slider for filter type', async () => {
    render(<RuleBuilder onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const typeSelect = screen.getByLabelText(/rule type/i);
    fireEvent.change(typeSelect, { target: { value: 'filter' } });

    const weightSlider = screen.getByRole('slider', { name: /weight/i });
    expect(weightSlider).toBeDisabled();
  });

  it('enables weight slider for boost type', () => {
    render(<RuleBuilder onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const weightSlider = screen.getByRole('slider', { name: /weight/i });
    expect(weightSlider).not.toBeDisabled();
  });

  it('loads initial conditions from initialRule', () => {
    const initialRule = {
      id: 'test',
      name: 'Test',
      type: 'boost' as const,
      weight: 50,
      conditions: [
        { field: 'content', operator: 'contains', value: 'hello' },
        { field: 'author', operator: 'equals', value: 'test' },
      ],
      enabled: true,
    };

    render(
      <RuleBuilder
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        initialRule={initialRule}
      />
    );

    const conditionsContainer = screen.getByTestId('conditions-container');
    expect(conditionsContainer.children.length).toBe(2);
  });
});
