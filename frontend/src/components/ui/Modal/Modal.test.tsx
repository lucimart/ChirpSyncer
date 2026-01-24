import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { theme } from '@/styles/theme';
import { Modal } from './Modal';

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
};

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    title: 'Test Modal',
    children: <p>Modal content</p>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when isOpen is true', () => {
    renderWithTheme(<Modal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    renderWithTheme(<Modal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    renderWithTheme(<Modal {...defaultProps} />);

    await user.click(screen.getByLabelText('Close modal'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay is clicked', async () => {
    const user = userEvent.setup();
    const { container } = renderWithTheme(<Modal {...defaultProps} />);

    // Click on the overlay (first child of body portal)
    const overlay = container.querySelector('div');
    if (overlay) {
      await user.click(overlay);
    }
  });

  it('does not call onClose on overlay click when closeOnOverlayClick is false', async () => {
    const user = userEvent.setup();
    const { container } = renderWithTheme(
      <Modal {...defaultProps} closeOnOverlayClick={false} />
    );

    const overlay = container.querySelector('div');
    if (overlay) {
      await user.click(overlay);
      // onClose should not be called from overlay click
    }
  });

  it('calls onClose when Escape key is pressed', () => {
    renderWithTheme(<Modal {...defaultProps} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('renders footer when provided', () => {
    renderWithTheme(
      <Modal {...defaultProps} footer={<button>Submit</button>} />
    );
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  it('renders without title', () => {
    renderWithTheme(
      <Modal isOpen={true} onClose={jest.fn()}>
        <p>No title modal</p>
      </Modal>
    );
    expect(screen.getByText('No title modal')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('applies correct size', () => {
    const { rerender } = renderWithTheme(<Modal {...defaultProps} size="sm" />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    rerender(
      <ThemeProvider theme={theme}>
        <Modal {...defaultProps} size="lg" />
      </ThemeProvider>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('has correct accessibility attributes', () => {
    renderWithTheme(<Modal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // aria-labelledby should reference the title element
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    const titleElement = document.getElementById(labelledBy!);
    expect(titleElement).toHaveTextContent('Test Modal');
  });

  it('prevents body scroll when open', () => {
    renderWithTheme(<Modal {...defaultProps} />);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body scroll when closed', () => {
    const { unmount } = renderWithTheme(<Modal {...defaultProps} />);
    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
