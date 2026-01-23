import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/styles/ThemeContext';
import { Pagination } from './Pagination';

function renderWithTheme(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe('Pagination', () => {
  it('renders page numbers', () => {
    const handlePageChange = jest.fn();
    renderWithTheme(
      <Pagination currentPage={1} totalPages={5} onPageChange={handlePageChange} />
    );

    expect(screen.getByRole('button', { name: /go to page 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go to page 5/i })).toBeInTheDocument();
  });

  it('calls onPageChange when clicking a page', async () => {
    const user = userEvent.setup();
    const handlePageChange = jest.fn();

    renderWithTheme(
      <Pagination currentPage={1} totalPages={5} onPageChange={handlePageChange} />
    );

    await user.click(screen.getByRole('button', { name: /go to page 3/i }));
    expect(handlePageChange).toHaveBeenCalledWith(3);
  });

  it('marks current page with aria-current', () => {
    const handlePageChange = jest.fn();
    renderWithTheme(
      <Pagination currentPage={2} totalPages={5} onPageChange={handlePageChange} />
    );

    expect(screen.getByRole('button', { name: /go to page 2/i })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('disables previous button on first page', () => {
    const handlePageChange = jest.fn();
    renderWithTheme(
      <Pagination currentPage={1} totalPages={5} onPageChange={handlePageChange} />
    );

    expect(screen.getByRole('button', { name: /go to previous page/i })).toBeDisabled();
  });

  it('disables next button on last page', () => {
    const handlePageChange = jest.fn();
    renderWithTheme(
      <Pagination currentPage={5} totalPages={5} onPageChange={handlePageChange} />
    );

    expect(screen.getByRole('button', { name: /go to next page/i })).toBeDisabled();
  });

  it('navigates to previous page', async () => {
    const user = userEvent.setup();
    const handlePageChange = jest.fn();

    renderWithTheme(
      <Pagination currentPage={3} totalPages={5} onPageChange={handlePageChange} />
    );

    await user.click(screen.getByRole('button', { name: /go to previous page/i }));
    expect(handlePageChange).toHaveBeenCalledWith(2);
  });

  it('navigates to next page', async () => {
    const user = userEvent.setup();
    const handlePageChange = jest.fn();

    renderWithTheme(
      <Pagination currentPage={3} totalPages={5} onPageChange={handlePageChange} />
    );

    await user.click(screen.getByRole('button', { name: /go to next page/i }));
    expect(handlePageChange).toHaveBeenCalledWith(4);
  });

  it('returns null when totalPages is 1 or less', () => {
    const handlePageChange = jest.fn();
    const { container } = renderWithTheme(
      <Pagination currentPage={1} totalPages={1} onPageChange={handlePageChange} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('shows pagination info when showInfo is true', () => {
    const handlePageChange = jest.fn();
    renderWithTheme(
      <Pagination
        currentPage={2}
        totalPages={10}
        onPageChange={handlePageChange}
        showInfo
        totalItems={100}
        pageSize={10}
      />
    );

    expect(screen.getByText(/showing 11 to 20 of 100 results/i)).toBeInTheDocument();
  });
});
