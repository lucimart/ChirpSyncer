import type { ReactElement } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/styles/ThemeContext';
import { TagEditor } from '../TagEditor';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('TagEditor', () => {
  const defaultTags = ['react', 'testing', 'tdd'];

  it('renders existing tags', () => {
    renderWithTheme(<TagEditor tags={defaultTags} onChange={jest.fn()} />);

    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('testing')).toBeInTheDocument();
    expect(screen.getByText('tdd')).toBeInTheDocument();
  });

  it('renders input for adding new tags', () => {
    renderWithTheme(<TagEditor tags={defaultTags} onChange={jest.fn()} />);

    expect(screen.getByPlaceholderText(/add tag/i)).toBeInTheDocument();
  });

  it('adds a new tag when pressing Enter', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    renderWithTheme(<TagEditor tags={defaultTags} onChange={onChange} />);

    const input = screen.getByPlaceholderText(/add tag/i);
    await user.type(input, 'newTag{Enter}');

    expect(onChange).toHaveBeenCalledWith(['react', 'testing', 'tdd', 'newtag']);
  });

  it('does not add duplicate tags', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    renderWithTheme(<TagEditor tags={defaultTags} onChange={onChange} />);

    const input = screen.getByPlaceholderText(/add tag/i);
    await user.type(input, 'react{Enter}');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes a tag when clicking the remove button', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    renderWithTheme(<TagEditor tags={defaultTags} onChange={onChange} />);

    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    await user.click(removeButtons[0]);

    expect(onChange).toHaveBeenCalledWith(['testing', 'tdd']);
  });

  it('clears input after adding a tag', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    renderWithTheme(<TagEditor tags={defaultTags} onChange={onChange} />);

    const input = screen.getByPlaceholderText(/add tag/i);
    await user.type(input, 'newTag{Enter}');

    expect(input).toHaveValue('');
  });

  it('converts tags to lowercase', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    renderWithTheme(<TagEditor tags={[]} onChange={onChange} />);

    const input = screen.getByPlaceholderText(/add tag/i);
    await user.type(input, 'UpperCase{Enter}');

    expect(onChange).toHaveBeenCalledWith(['uppercase']);
  });

  it('trims whitespace from tags', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    renderWithTheme(<TagEditor tags={[]} onChange={onChange} />);

    const input = screen.getByPlaceholderText(/add tag/i);
    await user.type(input, '  spacedTag  {Enter}');

    expect(onChange).toHaveBeenCalledWith(['spacedtag']);
  });

  it('does not add empty tags', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    renderWithTheme(<TagEditor tags={defaultTags} onChange={onChange} />);

    const input = screen.getByPlaceholderText(/add tag/i);
    await user.type(input, '   {Enter}');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows suggested tags when provided', () => {
    const suggestedTags = ['javascript', 'typescript', 'node'];
    renderWithTheme(
      <TagEditor tags={defaultTags} onChange={jest.fn()} suggestedTags={suggestedTags} />
    );

    expect(screen.getByText('javascript')).toBeInTheDocument();
    expect(screen.getByText('typescript')).toBeInTheDocument();
    expect(screen.getByText('node')).toBeInTheDocument();
  });

  it('adds suggested tag when clicked', async () => {
    const onChange = jest.fn();
    const suggestedTags = ['javascript', 'typescript'];
    const user = userEvent.setup();
    renderWithTheme(
      <TagEditor tags={defaultTags} onChange={onChange} suggestedTags={suggestedTags} />
    );

    await user.click(screen.getByText('javascript'));

    expect(onChange).toHaveBeenCalledWith(['react', 'testing', 'tdd', 'javascript']);
  });

  it('does not show already-used tags in suggestions', () => {
    const suggestedTags = ['react', 'javascript', 'typescript'];
    renderWithTheme(
      <TagEditor tags={defaultTags} onChange={jest.fn()} suggestedTags={suggestedTags} />
    );

    // 'react' is already in tags, so only javascript and typescript should be in suggestions
    const suggestionsSection = screen.getByTestId('suggested-tags');
    expect(suggestionsSection).not.toHaveTextContent('react');
    expect(screen.getByText('javascript')).toBeInTheDocument();
  });

  it('renders in disabled state', () => {
    renderWithTheme(<TagEditor tags={defaultTags} onChange={jest.fn()} disabled />);

    const input = screen.getByPlaceholderText(/add tag/i);
    expect(input).toBeDisabled();
  });

  it('shows tag count when maxTags is set', () => {
    renderWithTheme(<TagEditor tags={defaultTags} onChange={jest.fn()} maxTags={5} />);

    expect(screen.getByText('3/5')).toBeInTheDocument();
  });

  it('disables input when maxTags is reached', () => {
    renderWithTheme(<TagEditor tags={defaultTags} onChange={jest.fn()} maxTags={3} />);

    const input = screen.getByPlaceholderText(/add tag/i);
    expect(input).toBeDisabled();
  });

  it('adds tag when comma is typed', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    renderWithTheme(<TagEditor tags={[]} onChange={onChange} />);

    const input = screen.getByPlaceholderText(/add tag/i);
    await user.type(input, 'tag1,');

    expect(onChange).toHaveBeenCalledWith(['tag1']);
  });

  it('applies custom className', () => {
    renderWithTheme(
      <TagEditor tags={defaultTags} onChange={jest.fn()} className="custom-class" />
    );

    expect(screen.getByTestId('tag-editor')).toHaveClass('custom-class');
  });
});
