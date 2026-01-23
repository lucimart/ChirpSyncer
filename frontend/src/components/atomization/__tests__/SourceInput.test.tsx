import type { ReactElement } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/styles/ThemeContext';
import { SourceInput } from '../SourceInput';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('SourceInput', () => {
  it('renders URL and Text tabs', () => {
    renderWithTheme(<SourceInput onSubmit={jest.fn()} />);

    expect(screen.getByRole('tab', { name: /url/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /paste text/i })).toBeInTheDocument();
  });

  it('shows URL input by default', () => {
    renderWithTheme(<SourceInput onSubmit={jest.fn()} />);

    expect(screen.getByPlaceholderText(/paste a youtube url/i)).toBeInTheDocument();
  });

  it('switches to text input when Text tab is clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SourceInput onSubmit={jest.fn()} />);

    await user.click(screen.getByRole('tab', { name: /paste text/i }));

    expect(screen.getByPlaceholderText(/paste your content/i)).toBeInTheDocument();
  });

  it('detects YouTube URLs', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SourceInput onSubmit={jest.fn()} />);

    const input = screen.getByPlaceholderText(/paste a youtube url/i);
    await user.type(input, 'https://youtube.com/watch?v=abc123');

    expect(screen.getByText(/youtube/i)).toBeInTheDocument();
  });

  it('detects blog URLs', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SourceInput onSubmit={jest.fn()} />);

    const input = screen.getByPlaceholderText(/paste a youtube url/i);
    await user.type(input, 'https://example.com/my-blog-post');

    expect(screen.getByText(/blog/i)).toBeInTheDocument();
  });

  it('calls onSubmit with URL data', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    renderWithTheme(<SourceInput onSubmit={onSubmit} />);

    const input = screen.getByPlaceholderText(/paste a youtube url/i);
    await user.type(input, 'https://youtube.com/watch?v=abc123');
    await user.click(screen.getByRole('button', { name: /analyze/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      source_type: 'youtube',
      source_url: 'https://youtube.com/watch?v=abc123',
    });
  });

  it('calls onSubmit with text data', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    renderWithTheme(<SourceInput onSubmit={onSubmit} />);

    await user.click(screen.getByRole('tab', { name: /paste text/i }));

    const textarea = screen.getByPlaceholderText(/paste your content/i);
    await user.type(textarea, 'This is my content to atomize');
    await user.click(screen.getByRole('button', { name: /analyze/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      source_type: 'text',
      source_content: 'This is my content to atomize',
    });
  });

  it('disables submit button when input is empty', () => {
    renderWithTheme(<SourceInput onSubmit={jest.fn()} />);

    const button = screen.getByRole('button', { name: /analyze/i });
    expect(button).toBeDisabled();
  });

  it('shows loading state when isLoading is true', () => {
    renderWithTheme(<SourceInput onSubmit={jest.fn()} isLoading />);

    expect(screen.getByRole('button', { name: /analyzing/i })).toBeDisabled();
  });

  it('detects thread content', async () => {
    const user = userEvent.setup();
    renderWithTheme(<SourceInput onSubmit={jest.fn()} />);

    await user.click(screen.getByRole('tab', { name: /paste text/i }));

    const textarea = screen.getByPlaceholderText(/paste your content/i);
    await user.type(textarea, '1/ This is the start of a thread');

    // Look for the Thread badge specifically
    const threadBadges = screen.getAllByText(/thread/i);
    expect(threadBadges.some(el => el.textContent === 'Thread')).toBe(true);
  });

  it('supports drag and drop hint', () => {
    renderWithTheme(<SourceInput onSubmit={jest.fn()} />);

    // The component should indicate drag and drop support
    expect(screen.getByText(/or drag/i)).toBeInTheDocument();
  });
});
