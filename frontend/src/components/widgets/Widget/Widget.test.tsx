import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/styles/ThemeContext';
import { Widget, type WidgetConfig } from './Widget';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const mockConfig: WidgetConfig = {
  id: 'test-widget',
  type: 'stats',
  title: 'Test Widget',
  position: { x: 0, y: 0 },
  size: { width: 1, height: 1 },
};

describe('Widget', () => {
  it('renders widget with title', () => {
    const handleRemove = jest.fn();
    const handleSettings = jest.fn();

    renderWithTheme(
      <Widget
        config={mockConfig}
        onRemove={handleRemove}
        onSettings={handleSettings}
        isEditable={false}
      >
        <div>Widget Content</div>
      </Widget>
    );

    expect(screen.getByTestId('widget-test-widget')).toBeInTheDocument();
    expect(screen.getByText('Test Widget')).toBeInTheDocument();
  });

  it('renders children content', () => {
    const handleRemove = jest.fn();
    const handleSettings = jest.fn();

    renderWithTheme(
      <Widget
        config={mockConfig}
        onRemove={handleRemove}
        onSettings={handleSettings}
        isEditable={false}
      >
        <div>Custom Content</div>
      </Widget>
    );

    expect(screen.getByText('Custom Content')).toBeInTheDocument();
  });

  it('shows drag handle when editable', () => {
    const handleRemove = jest.fn();
    const handleSettings = jest.fn();

    renderWithTheme(
      <Widget
        config={mockConfig}
        onRemove={handleRemove}
        onSettings={handleSettings}
        isEditable={true}
      >
        <div>Content</div>
      </Widget>
    );

    expect(screen.getByTestId('drag-handle')).toBeInTheDocument();
  });

  it('hides drag handle when not editable', () => {
    const handleRemove = jest.fn();
    const handleSettings = jest.fn();

    renderWithTheme(
      <Widget
        config={mockConfig}
        onRemove={handleRemove}
        onSettings={handleSettings}
        isEditable={false}
      >
        <div>Content</div>
      </Widget>
    );

    expect(screen.queryByTestId('drag-handle')).not.toBeInTheDocument();
  });

  it('calls onRemove when remove button is clicked', async () => {
    const user = userEvent.setup();
    const handleRemove = jest.fn();
    const handleSettings = jest.fn();

    renderWithTheme(
      <Widget
        config={mockConfig}
        onRemove={handleRemove}
        onSettings={handleSettings}
        isEditable={false}
      >
        <div>Content</div>
      </Widget>
    );

    await user.click(screen.getByRole('button', { name: /remove/i }));
    expect(handleRemove).toHaveBeenCalled();
  });

  it('calls onSettings when settings button is clicked', async () => {
    const user = userEvent.setup();
    const handleRemove = jest.fn();
    const handleSettings = jest.fn();

    renderWithTheme(
      <Widget
        config={mockConfig}
        onRemove={handleRemove}
        onSettings={handleSettings}
        isEditable={false}
      >
        <div>Content</div>
      </Widget>
    );

    await user.click(screen.getByRole('button', { name: /settings/i }));
    expect(handleSettings).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    const handleRemove = jest.fn();
    const handleSettings = jest.fn();

    renderWithTheme(
      <Widget
        config={mockConfig}
        onRemove={handleRemove}
        onSettings={handleSettings}
        isEditable={false}
        isLoading={true}
      >
        <div>Content</div>
      </Widget>
    );

    expect(screen.getByTestId('widget-loading')).toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('shows error state with message', () => {
    const handleRemove = jest.fn();
    const handleSettings = jest.fn();

    renderWithTheme(
      <Widget
        config={mockConfig}
        onRemove={handleRemove}
        onSettings={handleSettings}
        isEditable={false}
        error="Failed to load data"
      >
        <div>Content</div>
      </Widget>
    );

    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('shows retry button when error and onRetry provided', async () => {
    const user = userEvent.setup();
    const handleRemove = jest.fn();
    const handleSettings = jest.fn();
    const handleRetry = jest.fn();

    renderWithTheme(
      <Widget
        config={mockConfig}
        onRemove={handleRemove}
        onSettings={handleSettings}
        isEditable={false}
        error="Connection failed"
        onRetry={handleRetry}
      >
        <div>Content</div>
      </Widget>
    );

    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(handleRetry).toHaveBeenCalled();
  });

  it('applies editable data attribute', () => {
    const handleRemove = jest.fn();
    const handleSettings = jest.fn();

    renderWithTheme(
      <Widget
        config={mockConfig}
        onRemove={handleRemove}
        onSettings={handleSettings}
        isEditable={true}
      >
        <div>Content</div>
      </Widget>
    );

    expect(screen.getByTestId('widget-test-widget')).toHaveAttribute('data-editable', 'true');
  });

  it('applies widget type data attribute', () => {
    const handleRemove = jest.fn();
    const handleSettings = jest.fn();

    renderWithTheme(
      <Widget
        config={mockConfig}
        onRemove={handleRemove}
        onSettings={handleSettings}
        isEditable={false}
      >
        <div>Content</div>
      </Widget>
    );

    expect(screen.getByTestId('widget-test-widget')).toHaveAttribute('data-type', 'stats');
  });
});
