import type { ReactElement } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@/styles/ThemeContext';
import { MessageFilters } from '../MessageFilters';
import type { InboxFilters } from '@/lib/inbox';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

const defaultFilters: InboxFilters = {
  platform: 'all',
  message_type: 'all',
  is_read: undefined,
};

describe('MessageFilters', () => {
  it('renders platform filter dropdown', () => {
    renderWithTheme(<MessageFilters filters={defaultFilters} onChange={jest.fn()} />);

    expect(screen.getByLabelText(/platform/i)).toBeInTheDocument();
  });

  it('renders message type filter', () => {
    renderWithTheme(<MessageFilters filters={defaultFilters} onChange={jest.fn()} />);

    expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
  });

  it('renders read status filter', () => {
    renderWithTheme(<MessageFilters filters={defaultFilters} onChange={jest.fn()} />);

    expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
  });

  it('calls onChange when platform filter changes', () => {
    const onChange = jest.fn();
    renderWithTheme(<MessageFilters filters={defaultFilters} onChange={onChange} />);

    const platformSelect = screen.getByLabelText(/platform/i);
    fireEvent.change(platformSelect, { target: { value: 'twitter' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'twitter' })
    );
  });

  it('calls onChange when type filter changes', () => {
    const onChange = jest.fn();
    renderWithTheme(<MessageFilters filters={defaultFilters} onChange={onChange} />);

    const typeSelect = screen.getByLabelText(/type/i);
    fireEvent.change(typeSelect, { target: { value: 'mention' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ message_type: 'mention' })
    );
  });

  it('calls onChange when read status filter changes', () => {
    const onChange = jest.fn();
    renderWithTheme(<MessageFilters filters={defaultFilters} onChange={onChange} />);

    const statusSelect = screen.getByLabelText(/status/i);
    fireEvent.change(statusSelect, { target: { value: 'unread' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ is_read: false })
    );
  });

  it('shows all platform options', () => {
    renderWithTheme(<MessageFilters filters={defaultFilters} onChange={jest.fn()} />);

    const platformSelect = screen.getByLabelText(/platform/i);
    fireEvent.click(platformSelect);

    expect(screen.getByText(/all platforms/i)).toBeInTheDocument();
    expect(screen.getByText(/twitter/i)).toBeInTheDocument();
    expect(screen.getByText(/bluesky/i)).toBeInTheDocument();
  });

  it('shows all message type options', () => {
    renderWithTheme(<MessageFilters filters={defaultFilters} onChange={jest.fn()} />);

    const typeSelect = screen.getByLabelText(/type/i);
    fireEvent.click(typeSelect);

    expect(screen.getByText(/all types/i)).toBeInTheDocument();
    expect(screen.getByText(/mention/i)).toBeInTheDocument();
    expect(screen.getByText(/reply/i)).toBeInTheDocument();
    expect(screen.getByText(/dm/i)).toBeInTheDocument();
  });

  it('displays current filter values', () => {
    const activeFilters: InboxFilters = {
      platform: 'twitter',
      message_type: 'mention',
      is_read: false,
    };

    renderWithTheme(<MessageFilters filters={activeFilters} onChange={jest.fn()} />);

    const platformSelect = screen.getByLabelText(/platform/i) as HTMLSelectElement;
    const typeSelect = screen.getByLabelText(/type/i) as HTMLSelectElement;

    expect(platformSelect.value).toBe('twitter');
    expect(typeSelect.value).toBe('mention');
  });

  it('has clear filters button when filters are active', () => {
    const activeFilters: InboxFilters = {
      platform: 'twitter',
      message_type: 'all',
      is_read: undefined,
    };

    renderWithTheme(<MessageFilters filters={activeFilters} onChange={jest.fn()} />);

    expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
  });

  it('calls onChange with default values when clear filters clicked', () => {
    const onChange = jest.fn();
    const activeFilters: InboxFilters = {
      platform: 'twitter',
      message_type: 'mention',
      is_read: false,
    };

    renderWithTheme(<MessageFilters filters={activeFilters} onChange={onChange} />);

    const clearButton = screen.getByRole('button', { name: /clear filters/i });
    fireEvent.click(clearButton);

    expect(onChange).toHaveBeenCalledWith({
      platform: 'all',
      message_type: 'all',
      is_read: undefined,
    });
  });
});
