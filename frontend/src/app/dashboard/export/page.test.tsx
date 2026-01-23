import type { ReactElement } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/styles/ThemeContext';
import ExportPage from './page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/dashboard/export',
}));

// Mock api
const mockExportData = jest.fn();
jest.mock('@/lib/api', () => ({
  api: {
    exportData: (params: unknown) => mockExportData(params),
  },
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = jest.fn(() => 'blob:test-url');
const mockRevokeObjectURL = jest.fn();
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  },
});

function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{ui}</ThemeProvider>
    </QueryClientProvider>
  );
}

describe('ExportPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExportData.mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['test data'])),
    });
  });

  it('renders export page with header', () => {
    renderWithProviders(<ExportPage />);

    expect(screen.getByText('Export Data')).toBeInTheDocument();
    expect(
      screen.getByText('Download your data in various formats for backup or analysis')
    ).toBeInTheDocument();
  });

  it('displays export format options', () => {
    renderWithProviders(<ExportPage />);

    expect(screen.getByText('JSON')).toBeInTheDocument();
    expect(screen.getByText('CSV')).toBeInTheDocument();
    expect(screen.getByText('Plain Text')).toBeInTheDocument();
  });

  it('displays format descriptions', () => {
    renderWithProviders(<ExportPage />);

    expect(
      screen.getByText('Machine-readable format, includes all metadata')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Spreadsheet compatible, easy to analyze')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Simple text file, human readable')
    ).toBeInTheDocument();
  });

  it('allows selecting different export formats', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExportPage />);

    const csvCard = screen.getByText('CSV').closest('div[class*="SelectableCard"]');
    if (csvCard) {
      await user.click(csvCard);
    }

    // The card should now show as selected (check icon visible)
  });

  it('displays export options section', () => {
    renderWithProviders(<ExportPage />);

    expect(screen.getByText('Export Options')).toBeInTheDocument();
    expect(screen.getByText('Date Range')).toBeInTheDocument();
    expect(screen.getByText('Platform')).toBeInTheDocument();
  });

  it('displays include options checkboxes', () => {
    renderWithProviders(<ExportPage />);

    expect(screen.getByLabelText('Media URLs')).toBeInTheDocument();
    expect(screen.getByLabelText('Engagement Metrics')).toBeInTheDocument();
    expect(screen.getByLabelText('Deleted Posts History')).toBeInTheDocument();
  });

  it('checkboxes are checked by default for media and metrics', () => {
    renderWithProviders(<ExportPage />);

    expect(screen.getByLabelText('Media URLs')).toBeChecked();
    expect(screen.getByLabelText('Engagement Metrics')).toBeChecked();
    expect(screen.getByLabelText('Deleted Posts History')).not.toBeChecked();
  });

  it('allows toggling include options', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExportPage />);

    const mediaCheckbox = screen.getByLabelText('Media URLs');
    await user.click(mediaCheckbox);

    expect(mediaCheckbox).not.toBeChecked();
  });

  it('displays date range dropdown with options', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExportPage />);

    expect(screen.getByText('Date Range')).toBeInTheDocument();
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(1);
  });

  it('displays platform dropdown with options', () => {
    renderWithProviders(<ExportPage />);

    expect(screen.getByText('Platform')).toBeInTheDocument();
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(2);
  });

  it('displays estimated export size', () => {
    renderWithProviders(<ExportPage />);

    expect(screen.getByText(/Estimated export size:/)).toBeInTheDocument();
  });

  it('renders start export button', () => {
    renderWithProviders(<ExportPage />);

    expect(
      screen.getByRole('button', { name: /start export/i })
    ).toBeInTheDocument();
  });

  it('starts export when button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExportPage />);

    const exportButton = screen.getByRole('button', { name: /start export/i });
    await user.click(exportButton);

    await waitFor(() => {
      expect(mockExportData).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'json',
          date_range: 'all',
          platform: 'all',
          include_media: true,
          include_metrics: true,
          include_deleted: false,
        })
      );
    });
  });

  it('shows export progress after starting', async () => {
    const user = userEvent.setup();
    mockExportData.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                blob: () => Promise.resolve(new Blob(['test'])),
              }),
            100
          )
        )
    );

    renderWithProviders(<ExportPage />);

    await user.click(screen.getByRole('button', { name: /start export/i }));

    await waitFor(() => {
      expect(screen.getByText('Exporting...')).toBeInTheDocument();
    });
  });

  it('shows export complete message after successful export', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ExportPage />);

    await user.click(screen.getByRole('button', { name: /start export/i }));

    await waitFor(() => {
      expect(screen.getByText('Export Complete')).toBeInTheDocument();
    });
  });

  it('has accessible select elements', () => {
    renderWithProviders(<ExportPage />);

    // Should have combobox elements for Date Range and Platform
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(2);
  });
});
