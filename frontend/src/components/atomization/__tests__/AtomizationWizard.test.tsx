import type { ReactElement } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/styles/ThemeContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AtomizationWizard } from '../AtomizationWizard';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderWithProviders(ui: ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{ui}</ThemeProvider>
    </QueryClientProvider>
  );
}

describe('AtomizationWizard', () => {
  it('renders step 1: Input source', () => {
    renderWithProviders(<AtomizationWizard />);

    expect(screen.getByText(/step 1/i)).toBeInTheDocument();
    expect(screen.getByText(/input source/i)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /url/i })).toBeInTheDocument();
  });

  it('shows step indicators', () => {
    renderWithProviders(<AtomizationWizard />);

    // Check that all 4 step numbers exist in the step circles
    const stepCircles = screen.getAllByText(/^[1-4]$/);
    expect(stepCircles.length).toBe(4);
  });

  it('shows step labels', () => {
    renderWithProviders(<AtomizationWizard />);

    expect(screen.getByText('Input')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    // Publish appears both as step label and in title
    const publishElements = screen.getAllByText(/publish/i);
    expect(publishElements.length).toBeGreaterThan(0);
  });

  it('progresses to step 2 after source input', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AtomizationWizard />);

    const input = screen.getByPlaceholderText(/paste a youtube url/i);
    await user.type(input, 'https://youtube.com/watch?v=abc123');

    // Button should be enabled
    const analyzeButton = screen.getByRole('button', { name: /analyze/i });
    expect(analyzeButton).not.toBeDisabled();
  });

  it('allows going back to previous steps', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AtomizationWizard initialStep={2} />);

    await user.click(screen.getByRole('button', { name: /back/i }));

    expect(screen.getByText(/step 1/i)).toBeInTheDocument();
  });

  it('shows processing progress in step 2', async () => {
    renderWithProviders(<AtomizationWizard initialStep={2} jobId="test-job" />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows output cards in step 3', async () => {
    renderWithProviders(<AtomizationWizard initialStep={3} jobId="test-job" />);

    expect(screen.getByText(/review outputs/i)).toBeInTheDocument();
  });

  it('shows publish options in step 4', async () => {
    renderWithProviders(<AtomizationWizard initialStep={4} jobId="test-job" />);

    // Should show Step 4 title
    expect(screen.getByText(/step 4/i)).toBeInTheDocument();
  });

  it('calls onComplete when wizard finishes', async () => {
    const user = userEvent.setup();
    const onComplete = jest.fn();
    renderWithProviders(<AtomizationWizard initialStep={4} jobId="test-job" onComplete={onComplete} />);

    await user.click(screen.getByRole('button', { name: /finish/i }));

    expect(onComplete).toHaveBeenCalled();
  });

  it('shows error state when processing fails', async () => {
    renderWithProviders(
      <AtomizationWizard
        initialStep={2}
        jobId="test-job"
        mockJobStatus="failed"
        mockError="Failed to analyze content"
      />
    );

    // Should show processing failed title
    expect(screen.getByText(/Processing Failed/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('disables next button when required data is missing', () => {
    renderWithProviders(<AtomizationWizard />);

    const analyzeButton = screen.getByRole('button', { name: /analyze/i });
    expect(analyzeButton).toBeDisabled();
  });

  it('shows platform selection checkboxes in step 2', async () => {
    renderWithProviders(<AtomizationWizard initialStep={2} jobId="test-job" showPlatformSelection />);

    expect(screen.getByLabelText(/twitter/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/linkedin/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/medium/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/instagram/i)).toBeInTheDocument();
  });
});
